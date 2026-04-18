import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import UserApp from './UserApp';
import { onSnapshot } from 'firebase/firestore';

// Mock Auth context for UserApp
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: '123' }, profile: { role: 'attendee' }, loading: false })
}));

describe('Queue Component (in UserApp)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render wait times correctly when data is received', async () => {
    const mockQueues = [
      { id: 'q-burger', waitTime: 15, type: 'food', sectorId: 'S1', density: 35 },
      { id: 'q-restroom', waitTime: 2, type: 'restroom', sectorId: 'S2', density: 15 }
    ];

    // Mock Firebase onSnapshot
    (onSnapshot as any).mockImplementation((
      queryRef: { path?: string },
      callback: (snapshot: { empty?: boolean; docs: Array<{ id: string; data: () => { waitTime: number; type: string; sectorId: string; density: number } }> }) => void
    ) => {
      if (queryRef.path === 'queues') {
        callback({
          empty: false,
          docs: mockQueues.map(q => ({
            id: q.id,
            data: () => ({ waitTime: q.waitTime, type: q.type, sectorId: q.sectorId, density: q.density })
          }))
        });
      } else {
        callback({ empty: true, docs: [] });
      }
      return () => {};
    });

    render(<UserApp />);

    await waitFor(() => {
      expect(screen.getByText(/Sector S1/i)).toBeInTheDocument();
    });

    expect(screen.getByText('15m')).toBeInTheDocument();
    expect(screen.getByText('2m')).toBeInTheDocument();
  });

  it('should fall back to mock queue data when no live queues exist', async () => {
    (onSnapshot as any).mockImplementation((
      queryRef: { path?: string },
      callback: (snapshot: { empty?: boolean; docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void
    ) => {
      if (queryRef.path === 'queues') {
        callback({ empty: true, docs: [] });
      } else {
        callback({ empty: true, docs: [] });
      }
      return () => {};
    });

    render(<UserApp />);
    expect(await screen.findByText(/Sector S4/i)).toBeInTheDocument();
    expect(screen.getByText('2m')).toBeInTheDocument();
  });

  it('should update wait times in real-time when data changes', async () => {
    let snapshotCallback: (snapshot: { empty?: boolean; docs: Array<{ id: string; data: () => { waitTime: number; type: string; sectorId: string; density: number } }> }) => void = () => {};
    (onSnapshot as any).mockImplementation((
      queryRef: { path?: string },
      callback: (snapshot: { empty?: boolean; docs: Array<{ id: string; data: () => { waitTime: number; type: string; sectorId: string; density: number } }> }) => void
    ) => {
      if (queryRef.path === 'queues') {
        snapshotCallback = callback;
        callback({
          empty: false,
          docs: [{ id: 'Q1', data: () => ({ waitTime: 10, type: 'food', sectorId: 'S1', density: 20 }) }]
        });
      } else {
        callback({ empty: true, docs: [] });
      }
      return () => {};
    });

    render(<UserApp />);
    expect(await screen.findByText('10m')).toBeInTheDocument();

    // Trigger update
    act(() => {
      snapshotCallback({
        empty: false,
        docs: [{ id: 'Q1', data: () => ({ waitTime: 25, type: 'food', sectorId: 'S1', density: 45 }) }]
      });
    });

    await waitFor(() => {
      expect(screen.getByText('25m')).toBeInTheDocument();
    });
  });
});
