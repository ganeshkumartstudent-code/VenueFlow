import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { onSnapshot } from '@/lib/firebase';
import { GLOBAL_REALTIME_DATA } from '@/lib/mockData';
import { useCrowdData } from './useCrowdData';

type QueryRef = { path?: string };
type DocSnapshot<TDoc> = { id: string; data: () => TDoc };
type Snapshot<TDoc> = { empty?: boolean; docs: Array<DocSnapshot<TDoc>> };
type SnapshotCallback<TDoc> = (snapshot: Snapshot<TDoc>) => void;
type ErrorCallback = (error: Error) => void;

describe('useCrowdData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sorts queue data by wait time and updates sectors from venue snapshots', async () => {
    vi.mocked(onSnapshot).mockImplementation(((
      queryRef: QueryRef,
      callback: SnapshotCallback<Record<string, unknown>>
    ) => {
      if (queryRef.path === 'queues') {
        callback({
          docs: [
            {
              id: 'q-b',
              data: () => ({ sectorId: 'S2', waitTime: 18, type: 'food', density: 50, name: 'Burgers' })
            },
            {
              id: 'q-a',
              data: () => ({ sectorId: 'S1', waitTime: 4, type: 'entry', density: 15, name: 'Fast Lane' })
            },
          ]
        });
      } else if (queryRef.path === 'venues') {
        callback({
          empty: false,
          docs: [
            {
              id: 'venue-1',
              data: () => ({
                sectors: [{ id: 'S9', name: 'Pop-up Zone', density: 12, waitTime: 3, capacity: 1000 }]
              })
            },
          ]
        });
      }

      return () => {};
    }) as unknown as typeof onSnapshot);

    const { result } = renderHook(() => useCrowdData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queues[0].id).toBe('q-a');
    expect(result.current.sectors[0].id).toBe('S9');
  });

  it('falls back to mock queues when no queue documents are returned', async () => {
    vi.mocked(onSnapshot).mockImplementation(((
      queryRef: QueryRef,
      callback: SnapshotCallback<Record<string, unknown>>
    ) => {
      if (queryRef.path === 'queues') {
        callback({ docs: [] });
      } else if (queryRef.path === 'venues') {
        callback({ empty: true, docs: [] });
      }

      return () => {};
    }) as unknown as typeof onSnapshot);

    const { result } = renderHook(() => useCrowdData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queues).toEqual(GLOBAL_REALTIME_DATA.queues);
  });

  it('falls back to mock queues when queue listener fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.mocked(onSnapshot).mockImplementation(((
      queryRef: QueryRef,
      callback: SnapshotCallback<Record<string, unknown>>,
      onError?: ErrorCallback
    ) => {
      if (queryRef.path === 'queues') {
        onError?.(new Error('permission denied'));
      } else if (queryRef.path === 'venues') {
        callback({ empty: true, docs: [] });
      }

      return () => {};
    }) as unknown as typeof onSnapshot);

    const { result } = renderHook(() => useCrowdData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queues).toEqual(GLOBAL_REALTIME_DATA.queues);
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});