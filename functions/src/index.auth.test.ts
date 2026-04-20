import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
const getUserDocMock = vi.fn();
type MockCallableContext = { auth: null | { uid: string } };
type BigQueryCallable = (data: unknown, context: MockCallableContext) => Promise<unknown>;

vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: class BigQueryMock {
    query = queryMock;
  },
}));

vi.mock('firebase-admin', () => {
  const firestoreMock = Object.assign(
    vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: getUserDocMock,
        })),
        add: vi.fn(),
      })),
    })),
    {
      FieldValue: {
        serverTimestamp: vi.fn(() => 'mock-server-timestamp'),
      },
    }
  );

  return {
    initializeApp: vi.fn(),
    firestore: firestoreMock,
  };
});

vi.mock('firebase-functions', () => {
  class HttpsError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    https: {
      onCall: function onCall(handler: unknown) {
        return handler;
      },
      HttpsError,
    },
    firestore: {
      document: function document() {
        return {
          onUpdate: function onUpdate(handler: unknown) {
            return handler;
          },
        };
      },
    },
    config: () => ({
      gemini: {
        key: 'test-gemini-key',
      },
    }),
  };
});

async function loadCallable(): Promise<BigQueryCallable> {
  const mod = await import('./index');
  return mod.getBigQueryAnalytics as unknown as BigQueryCallable;
}

describe('getBigQueryAnalytics authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('throws unauthenticated error for anonymous callers', async () => {
    const getBigQueryAnalytics = await loadCallable();

    await expect(getBigQueryAnalytics({}, { auth: null })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('throws permission-denied for non-admin role', async () => {
    getUserDocMock.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'staff' }),
    });

    const getBigQueryAnalytics = await loadCallable();

    await expect(getBigQueryAnalytics({}, { auth: { uid: 'staff-1' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('returns analytics payload for admin role', async () => {
    getUserDocMock.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'admin' }),
    });

    queryMock
      .mockResolvedValueOnce([[{ sectorId: 'S1', avgWait: 12 }]])
      .mockResolvedValueOnce([[{ sectorId: 'S1', peakDensity: 86 }]])
      .mockResolvedValueOnce([[{ rate: 0.8, completed: 8, total: 10 }]]);

    const getBigQueryAnalytics = await loadCallable();
    const result = await getBigQueryAnalytics({}, { auth: { uid: 'admin-1' } });

    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      waitTime: [{ sectorId: 'S1', avgWait: 12 }],
      density: [{ sectorId: 'S1', peakDensity: 86 }],
      efficiency: { rate: 0.8, completed: 8, total: 10 },
    });
  });
});
