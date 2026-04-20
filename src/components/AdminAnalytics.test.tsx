import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { httpsCallable } from '@/lib/firebase';
import AdminAnalytics from './AdminAnalytics';

let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('AdminAnalytics authorization integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('shows live analytics for authorized admin callable responses', async () => {
    const callableMock = vi.fn().mockResolvedValue({
      data: {
        waitTime: [
          { sectorId: 'S1', avgWait: 10 },
          { sectorId: 'S2', avgWait: 14 },
        ],
        density: [
          { sectorId: 'S1', peakDensity: 68 },
          { sectorId: 'S2', peakDensity: 91 },
        ],
        efficiency: { rate: 0.8, completed: 8, total: 10 },
      },
    });

    vi.mocked(httpsCallable).mockReturnValue(callableMock as unknown as ReturnType<typeof httpsCallable>);

    render(<AdminAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('12m')).toBeInTheDocument();
    });

    expect(screen.getByText('91%')).toBeInTheDocument();
    expect(callableMock).toHaveBeenCalledWith({ limit: 100 });
    expect(toast.success).toHaveBeenCalledWith('BigQuery Analytics Synced');
  });

  it('falls back gracefully when callable returns permission-denied', async () => {
    const callableMock = vi.fn().mockRejectedValue({ code: 'permission-denied' });
    vi.mocked(httpsCallable).mockReturnValue(callableMock as unknown as ReturnType<typeof httpsCallable>);

    render(<AdminAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('11m')).toBeInTheDocument();
    });

    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith('Active Live Mode: Utilizing real-time event streams');
  });
});
