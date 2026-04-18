import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Map } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '@/lib/firebase';

interface LoginScreenProps {
  loginAsGuest: () => void;
}

/**
 * LoginScreen component handles user authentication.
 * It provides options for Google Sign-in and a Guest Mode for rapid review.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ loginAsGuest }) => {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      console.error("Sign-in failed:", error);
    }
  };

  return (
    <main
      className="flex h-screen items-center justify-center bg-zinc-950 p-4"
      aria-label="Sign in to VenueFlow AI"
    >
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-white shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center" aria-hidden="true">
            <div className="rounded-full bg-orange-500/10 p-4 ring-1 ring-orange-500/20">
              <Map className="h-8 w-8 text-orange-500" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            VenueFlow AI
          </h1>
          <CardDescription className="text-zinc-400">
            Transforming Venue Congestion into Fluid Experiences
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <p className="text-center text-sm text-zinc-500">
            Optimize your event experience with real-time AI navigation and crowd insights.
          </p>
          <Button
            onClick={handleGoogleSignIn}
            className="h-12 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label="Sign in with Google"
          >
            Sign in with Google
          </Button>
          
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-zinc-800"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">Or development fallback</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={loginAsGuest}
            className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Enter for Real-time Review
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
