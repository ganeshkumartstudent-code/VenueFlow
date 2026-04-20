import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState, OfflineBanner, SkeletonHeatmap, SkeletonList } from './StatusUI';

describe('StatusUI', () => {
  let onLineSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onLineSpy = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    onLineSpy.mockRestore();
  });

  it('renders skeleton placeholder components', () => {
    const { container } = render(
      <div>
        <SkeletonHeatmap />
        <SkeletonList />
      </div>
    );

    expect(container.querySelectorAll('.rounded-xl').length).toBe(8);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders EmptyState content', () => {
    render(<EmptyState icon={Inbox} title="Nothing here" description="Try again later" />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('shows banner immediately when browser starts offline', () => {
    onLineSpy.mockReturnValue(false);
    render(<OfflineBanner />);

    expect(screen.getByRole('alert')).toHaveTextContent('Network Disconnected');
  });

  it('shows banner on offline event and hides on online event', async () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Network Disconnected');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});