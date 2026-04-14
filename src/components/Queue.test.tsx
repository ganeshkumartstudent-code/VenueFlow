import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserApp from './UserApp';
import { onSnapshot } from 'firebase/firestore';
import React from 'react';

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
      { id: 'Burger Joint', waitTime: 15, type: 'food', sectorId: 'S1' },
      { id: 'North Restroom', waitTime: 2, type: 'restroom', sectorId: 'S2' }
    ];

    // Mock Firebase onSnapshot
    (onSnapshot as any).mockImplementation((query, callback) => {
      callback({
        docs: mockQueues.map(q => ({
          id: q.id,
          data: () => ({ waitTime: q.waitTime, type: q.type, sectorId: q.sectorId })
        }))
      });
      return () => {};
    });

    render(<UserApp />);

    await waitFor(() => {
      expect(screen.getByText('Burger Joint')).toBeInTheDocument();
    });

    expect(screen.getByText('15m')).toBeInTheDocument();
    expect(screen.getByText('2m')).toBeInTheDocument();
  });

  it('should show loading state when no queues exist', () => {
    (onSnapshot as any).mockImplementation((query, callback) => {
      callback({ docs: [] });
      return () => {};
    });

    render(<UserApp />);
    expect(screen.getByText(/Loading queue data/i)).toBeInTheDocument();
  });

  it('should update wait times in real-time when data changes', async () => {
    let snapshotCallback: any;
    (onSnapshot as any).mockImplementation((query, callback) => {
      snapshotCallback = callback;
      callback({
        docs: [{ id: 'Q1', data: () => ({ waitTime: 10, type: 'food', sectorId: 'S1' }) }]
      });
      return () => {};
    });

    render(<UserApp />);
    expect(await screen.findByText('10m')).toBeInTheDocument();

    // Trigger update
    snapshotCallback({
      docs: [{ id: 'Q1', data: () => ({ waitTime: 25, type: 'food', sectorId: 'S1' }) }]
    });

    await waitFor(() => {
      expect(screen.getByText('25m')).toBeInTheDocument();
    });
  });
});
