import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';

let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

// Component to test the hook
const TestComponent = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      <div data-testid="profile-role">{profile?.role || 'no-role'}</div>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should handle authenticated state and fetch profile', async () => {
    const mockUser = { uid: '123', email: 'test@example.com', displayName: 'Test User' };
    const mockProfile = { uid: '123', role: 'admin', name: 'Test User' };

    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback: any) => {
      callback(mockUser);
      return () => {};
    });

    // Mock Firestore response
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockProfile
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('profile-role')).toHaveTextContent('admin');
  });

  it('should create a new profile if one does not exist', async () => {
    const mockUser = { uid: '456', email: 'new@example.com', displayName: 'New User' };

    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback: any) => {
      callback(mockUser);
      return () => {};
    });

    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(setDoc).toHaveBeenCalled());
    
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        role: 'attendee',
        email: 'new@example.com'
      })
    );
  });

  it('should handle unauthenticated state', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback: any) => {
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    expect(screen.getByTestId('profile-role')).toHaveTextContent('no-role');
  });

  it('should fallback to guest mode if auth times out', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation(() => {
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(
      () => expect(screen.getByTestId('user-email')).toHaveTextContent('guest@example.com'),
      { timeout: 3000 }
    );

    expect(screen.getByTestId('profile-role')).toHaveTextContent('attendee');
  });
});
