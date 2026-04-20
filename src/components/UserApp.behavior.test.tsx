import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserApp from './UserApp';
import { useCrowdData } from '@/hooks/useCrowdData';

vi.mock('@/hooks/useCrowdData', () => ({
  useCrowdData: vi.fn()
}));

type CrowdDataReturn = {
  queues: Array<{
    id: string;
    sectorId: string;
    waitTime: number;
    type: 'restroom' | 'entry' | 'food' | 'merch';
    density: number;
    name: string;
  }>;
  sectors: Array<{
    id: string;
    name: string;
    density: number;
    waitTime: number;
    capacity: number;
  }>;
  loading: boolean;
};

const buildCrowdData = (overrides: Partial<CrowdDataReturn> = {}): CrowdDataReturn => ({
  queues: [
    { id: 'q1', sectorId: 'S1', waitTime: 6, type: 'entry', density: 45, name: 'Gate A' }
  ],
  sectors: [],
  loading: false,
  ...overrides
});

describe('UserApp behavior', () => {
  const useCrowdDataMock = vi.mocked(useCrowdData);

  beforeEach(() => {
    vi.clearAllMocks();
    useCrowdDataMock.mockReturnValue(buildCrowdData());
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({})
      }
    });
  });

  it('shows queue fallback message when there are no active queues', () => {
    useCrowdDataMock.mockReturnValue(buildCrowdData({ queues: [], loading: false }));

    render(<UserApp />);

    expect(screen.getByText('No active queues found at this location.')).toBeInTheDocument();
  });

  it('shows queue skeletons while queue data is loading', () => {
    useCrowdDataMock.mockReturnValue(buildCrowdData({ queues: [], loading: true }));

    const { container } = render(<UserApp />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders queue severity badges based on density', () => {
    useCrowdDataMock.mockReturnValue(
      buildCrowdData({
        queues: [
          { id: 'q-low', sectorId: 'S2', waitTime: 4, type: 'food', density: 32, name: 'Coffee' },
          { id: 'q-high', sectorId: 'S3', waitTime: 14, type: 'food', density: 92, name: 'Burgers' }
        ]
      })
    );

    render(<UserApp />);

    expect(screen.getByText('STABLE')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('14m')).toBeInTheDocument();
  });

  it('toggles the live simulation control', () => {
    render(<UserApp />);

    fireEvent.click(screen.getByRole('button', { name: /Activate Live Insights/i }));
    expect(screen.getByRole('button', { name: /Stop Simulation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Stop Simulation/i }));
    expect(screen.getByRole('button', { name: /Activate Live Insights/i })).toBeInTheDocument();
  });

  it('shows camera permission guidance when AR access is denied', async () => {
    const getUserMedia = vi.fn().mockRejectedValue({ name: 'NotAllowedError' });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia }
    });

    render(<UserApp />);

    fireEvent.click(screen.getByRole('button', { name: /Switch to AR/i }));

    expect(
      await screen.findByText(/Camera access was denied\. Please enable permissions/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Return to Map$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Switch to AR/i })).toBeInTheDocument();
    });
  });

  it('shows generic camera error when AR startup fails for other reasons', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('camera busy'));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia }
    });

    render(<UserApp />);
    fireEvent.click(screen.getByRole('button', { name: /Switch to AR/i }));

    expect(
      await screen.findByText(/Could not access camera\. Please ensure no other app is using it\./i)
    ).toBeInTheDocument();
  });
});