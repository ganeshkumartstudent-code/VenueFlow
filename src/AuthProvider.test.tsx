import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import React from 'react';

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
  });

  it('should handle authenticated state and fetch profile', async () => {
    const mockUser = { uid: '123', email: 'test@example.com', displayName: 'Test User' };
    const mockProfile = { uid: '123', role: 'admin', name: 'Test User' };

    // Simulate auth state change
    (onAuthStateChanged as any).mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    // Mock Firestore response
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => mockProfile
    });

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

    (onAuthStateChanged as any).mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    (getDoc as any).mockResolvedValue({
      exists: () => false
    });

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
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
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
    vi.useFakeTimers();
    
    (onAuthStateChanged as any).mockImplementation(() => {
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    vi.advanceTimersByTime(2100);

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    
    expect(screen.getByTestId('user-email')).toHaveTextContent('guest@example.com');
    expect(screen.getByTestId('profile-role')).toHaveTextContent('attendee');

    vi.useRealTimers();
  });
});
