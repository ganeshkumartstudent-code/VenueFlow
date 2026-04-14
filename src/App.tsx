import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthProvider';
import { signInWithPopup, googleProvider, auth, signOut } from './lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Map, Users, BarChart3, LogOut, MessageSquare, ShieldAlert } from 'lucide-react';
import UserApp from './components/UserApp';
import StaffDashboard from './components/StaffDashboard';
import AdminAnalytics from './components/AdminAnalytics';
import { Toaster } from '@/components/ui/sonner';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="animate-pulse text-2xl font-light tracking-tighter">VENUEFLOW AI</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 p-4">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-white shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-orange-500/10 p-4 ring-1 ring-orange-500/20">
                <Map className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">VenueFlow AI</CardTitle>
            <CardDescription className="text-zinc-400">
              Hack2skill / Solution Challenge 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-center text-sm text-zinc-500">
              Optimize your event experience with real-time AI navigation and crowd insights.
            </p>
            <Button 
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="h-12 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700"
            >
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-orange-500" />
          <span className="text-xl font-bold tracking-tighter">VENUEFLOW</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium">{profile?.name}</p>
            <p className="text-xs text-zinc-500 capitalize">{profile?.role}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => signOut(auth)}
            className="text-zinc-400 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <TabsContent value="home" className="m-0 h-full">
              <UserApp />
            </TabsContent>
            <TabsContent value="staff" className="m-0 h-full">
              <StaffDashboard />
            </TabsContent>
            <TabsContent value="admin" className="m-0 h-full">
              <AdminAnalytics />
            </TabsContent>
          </div>

          {/* Bottom Navigation for Mobile / Tab Switcher */}
          <div className="border-t border-zinc-800 bg-zinc-900/50 p-2 backdrop-blur-md">
            <TabsList className="grid w-full grid-cols-3 bg-transparent">
              <TabsTrigger value="home" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500">
                <Users className="mr-2 h-4 w-4" />
                Attendee
              </TabsTrigger>
              <TabsTrigger value="staff" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="admin" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500">
                <BarChart3 className="mr-2 h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
