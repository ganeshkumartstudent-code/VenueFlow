import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginScreen } from './LoginScreen';
import { signInWithPopup, auth, googleProvider } from '@/lib/firebase';

describe('LoginScreen', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('calls Google sign-in when sign-in button is clicked', async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({} as never);
    const loginAsGuest = vi.fn();

    render(<LoginScreen loginAsGuest={loginAsGuest} />);

    fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalledWith(auth, googleProvider);
    });
    expect(loginAsGuest).not.toHaveBeenCalled();
  });

  it('calls guest login when fallback button is clicked', () => {
    const loginAsGuest = vi.fn();
    render(<LoginScreen loginAsGuest={loginAsGuest} />);

    fireEvent.click(screen.getByRole('button', { name: /Enter for Real-time Review/i }));
    expect(loginAsGuest).toHaveBeenCalledTimes(1);
  });

  it('handles Google sign-in errors without crashing', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(new Error('popup blocked'));
    render(<LoginScreen loginAsGuest={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign-in failed:', expect.any(Error));
    });
  });
});