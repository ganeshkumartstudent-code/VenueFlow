import { createContext } from 'react';
import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'attendee' | 'staff' | 'admin';
}

export interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  loginAsGuest: () => void;
}

export const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  isAuthReady: false,
  loginAsGuest: () => {} 
});
