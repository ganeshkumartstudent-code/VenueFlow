import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffDashboard from './StaffDashboard';
import { getCrowdPrediction } from '@/lib/gemini';
import { addDoc, onSnapshot } from 'firebase/firestore';

type TaskDoc = { description: string; status: string; priority: string; location: string };
type QueryRef = { path?: string };
type Snapshot<TDoc> = { empty?: boolean; docs: Array<{ id: string; data: () => TDoc }> };
type SnapshotCallback<TDoc> = (snapshot: Snapshot<TDoc>) => void;

// Mock everything needed
vi.mock('@/lib/gemini', () => ({
  getCrowdPrediction: vi.fn()
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'staff' } })
}));

describe('Agentic Task Assignment Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-assign tasks when predicted density exceeds 80%', async () => {
    // Mock Gemini prediction result with high density in S3
    vi.mocked(getCrowdPrediction).mockResolvedValue({
      predictions: [
        { sectorId: 'S3', predictedDensity: 92, recommendation: 'Redirect traffic to Gate C' },
        { sectorId: 'S1', predictedDensity: 40, recommendation: 'No action' }
      ]
    });

    render(<StaffDashboard />);

    const predictButton = screen.getByText(/Run AI Prediction/i);
    fireEvent.click(predictButton);

    await waitFor(() => {
      expect(getCrowdPrediction).toHaveBeenCalled();
    });

    // Check if addDoc was called for S3 (high density) but NOT for S1 (low density)
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        location: 'S3',
        priority: 'high',
        assignedTo: 'auto-agent'
      })
    );
  });

  it('should not assign tasks when density is below threshold', async () => {
    vi.mocked(getCrowdPrediction).mockResolvedValue({
      predictions: [
        { sectorId: 'S1', predictedDensity: 30, recommendation: 'All clear' }
      ]
    });

    render(<StaffDashboard />);

    const predictButton = screen.getByText(/Run AI Prediction/i);
    fireEvent.click(predictButton);

    await waitFor(() => {
      expect(getCrowdPrediction).toHaveBeenCalled();
    });

    expect(addDoc).not.toHaveBeenCalled();
  });

  it('should mark a task as completed calling updateDoc', async () => {
    const { updateDoc } = await import('firebase/firestore');

    // We need to trigger completeTask. 
    // Tasks are rendered from onSnapshot. Let's mock the snapshot.
    vi.mocked(onSnapshot).mockImplementation(((
      queryRef: QueryRef,
      callback: SnapshotCallback<TaskDoc>
    ) => {
      if (queryRef.path === 'tasks') {
        callback({
          empty: false,
          docs: [
            {
              id: 'task-123',
              data: () => ({ description: 'Test Task', status: 'pending', priority: 'high', location: 'S1' })
            }
          ]
        });
      } else if (queryRef.path === 'venues') {
        callback({ empty: true, docs: [] });
      } else {
        callback({ empty: true, docs: [] });
      }
      return () => {};
    }) as unknown as typeof onSnapshot);

    render(<StaffDashboard />);

    const completeButton = await screen.findByRole('button', { name: /Mark task complete: Test Task/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'completed' })
      );
    });
  });

  it('should display task list correctly from Firestore', async () => {
    // Mock the snapshot for tasks
    vi.mocked(onSnapshot).mockImplementation(((
      queryRef: QueryRef,
      callback: SnapshotCallback<TaskDoc>
    ) => {
      if (queryRef.path === 'tasks') {
        callback({
          empty: false,
          docs: [
            {
              id: 'task-123',
              data: () => ({ description: 'Test Task x', status: 'pending', priority: 'high', location: 'S1' })
            }
          ]
        });
      } else if (queryRef.path === 'venues') {
        callback({ empty: true, docs: [] });
      } else {
        callback({ empty: true, docs: [] });
      }
      return () => {};
    }) as unknown as typeof onSnapshot);

    render(<StaffDashboard />);
    
    expect(await screen.findByText(/Agentic AI Tasks/i)).toBeInTheDocument();
    expect(screen.getByText('Test Task x')).toBeInTheDocument();
  });
});
