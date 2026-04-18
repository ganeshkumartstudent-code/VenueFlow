import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Navigation, MessageCircle, Send, Users, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askGemini } from '@/lib/gemini';
import { GoogleGenAI, Modality } from "@google/genai";
import { SkeletonList, EmptyState } from './StatusUI';
import { MessageSquareOff } from 'lucide-react';
import VenueMap from './VenueMap';
import { useCrowdData } from '@/hooks/useCrowdData';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function UserApp() {
  const { queues, loading: queuesLoading } = useCrowdData();
  const [mode, setMode] = useState<'map' | 'ar' | 'chat'>('map');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedLocation, setSimulatedLocation] = useState<google.maps.LatLngLiteral | null>(null);

  
  const chatInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Simulation Logic: Move the user in a circle near the stadium
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      let angle = 0;
      interval = setInterval(() => {
        const radius = 0.005; 
        const center = { lat: 33.9535, lng: -118.3392 };
        setSimulatedLocation({
          lat: center.lat + Math.cos(angle) * radius,
          lng: center.lng + Math.sin(angle) * radius
        });
        angle += 0.05;
      }, 1000);
    } 
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating]);

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
      }
    } catch (error) {
      console.error("TTS Error:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // FIX: Move focus into chat input when chat mode is activated
  useEffect(() => {
    if (mode === 'chat') {
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [mode]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    const aiResponse = await askGemini(input);
    setMessages(prev => [...prev, { role: 'ai' as const, text: aiResponse }]);
  };

  const [cameraError, setCameraError] = useState<string | null>(null);

  const startAR = async () => {
    setMode('ar');
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: unknown) {
      const camErr = err as DOMException | Error;
      console.error("Camera error:", camErr);
      if (camErr.name === 'NotAllowedError' || camErr.name === 'PermissionDeniedError') {
        setCameraError("Camera access was denied. Please enable permissions in your browser settings to use AR navigation.");
      } else {
        setCameraError("Could not access camera. Please ensure no other app is using it.");
      }
    }
  };

  // FIX: Compute density label for sector colour-blind accessibility
  const getSectorStatus = (index: number) => {
    if (index === 4) return { label: 'Low density', colorClass: 'bg-green-500' };
    if (index === 2) return { label: 'High density', colorClass: 'bg-red-500' };
    return { label: 'Moderate density', colorClass: 'bg-yellow-500' };
  };

  return (
    // FIX: skip-nav link for keyboard users
    <div className="flex h-full flex-col gap-4">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-orange-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Dynamic Header Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-orange-500" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Venue Density</span>
            </div>
            <div className="text-2xl font-bold text-orange-500">64%</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-500" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Avg. Wait</span>
            </div>
            <div className="text-2xl font-bold text-orange-500">8 min</div>
          </CardContent>
        </Card>
      </div>

      <div
        id="main-content"
        className="relative flex-[3] min-h-[300px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-inner"
      >
        <AnimatePresence mode="wait">
          {mode === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <VenueMap 
                onToggleAR={startAR} 
                userLocation={simulatedLocation} 
                isSimulating={isSimulating}
              />
              
              {/* Simulation Controls Overlay */}
              <div className="absolute top-20 left-4 z-10 flex flex-col gap-2">
                <Button 
                  size="sm"
                  variant={isSimulating ? "destructive" : "secondary"}
                  className="h-8 text-[10px] font-bold uppercase tracking-tighter"
                  onClick={() => setIsSimulating(!isSimulating)}
                >
                  {isSimulating ? "Stop Simulation" : "Activate Live Insights"}
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'ar' && (
            <motion.div
              key="ar"
              role="region"
              aria-label="Augmented Reality Navigation"
              aria-describedby="ar-instruction"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative h-full w-full bg-black"
            >
              {/* FIX: video gets a title for AT; it is a live camera feed so no transcript needed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover opacity-60"
                title="Live camera feed for AR navigation"
                aria-label="Camera viewfinder for augmented reality navigation"
              />
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <div className="max-w-xs space-y-4">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                    <p className="text-white text-sm">{cameraError}</p>
                    <Button variant="outline" onClick={() => setMode('map')}>
                      Return to Map
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
                  <div className="w-64 h-64 border-2 border-dashed border-orange-500/50 rounded-full animate-pulse flex items-center justify-center">
                    <div className="text-center">
                      <Navigation className="h-12 w-12 text-orange-500 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-orange-500 font-bold text-xl">Sector 4</p>
                      <p className="text-white text-sm">Follow the path</p>
                    </div>
                  </div>
                </div>
              )}

              {/* FIX: Moved AI suggestion outside pointer-events-none container so AT can reach it */}
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                id="ar-instruction"
                className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900/80 p-4 rounded-xl border border-orange-500/30 backdrop-blur-md w-72"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase">AI Suggestion</p>
                    <p className="text-sm">Sector 2 is congested. Redirecting to North Exit.</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setMode('map')}
                className="absolute top-4 right-4 bg-zinc-900/80 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label="Close AR Navigation and return to map"
              >
                Close AR
              </Button>
            </motion.div>
          )}

          {mode === 'chat' && (
            <motion.div
              key="chat"
              role="region"
              aria-label="VenueFlow AI Chat Assistant"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex h-full flex-col"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 p-4">
                {/* FIX: heading level consistent (h2 since it's major section) */}
                <h2 className="font-semibold" id="chat-heading">VenueFlow AI Assistant</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('map')}
                  aria-label="Close chat and return to venue map"
                  className="focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                >
                  Back to Map
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                {/* 
                  FIX: aria-live="polite" on the message list so screen readers announce
                  new AI responses without interrupting the user. aria-relevant="additions"
                  ensures only newly appended messages are read out.
                */}
                <div
                  className="space-y-4"
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                  aria-label="Chat messages"
                  aria-labelledby="chat-heading"
                >
                  {messages.length === 0 && (
                    <EmptyState 
                      icon={MessageSquareOff} 
                      title="No Chat Yet" 
                      description="Ask VenueFlow AI about food, exits, or stadium facilities."
                    />
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {/* FIX: Each message bubble has an accessible label indicating sender */}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'}`}
                        role="article"
                        aria-label={`${m.role === 'user' ? 'You' : 'VenueFlow AI'}: ${m.text}`}
                      >
                        <p className="text-sm">{m.text}</p>
                      </div>
                      {m.role === 'ai' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(m.text)}
                          disabled={isSpeaking}
                          aria-label={isSpeaking ? 'Currently speaking, please wait' : `Listen to AI response: ${m.text.slice(0, 30)}…`}
                          className="text-[10px] h-6 mt-1 text-zinc-500 hover:text-orange-500 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                        >
                          {isSpeaking ? "Speaking..." : "Listen"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* FIX: form element groups the input + submit so AT knows they're related */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="p-4 border-t border-zinc-800 flex gap-2"
                aria-label="Send a message to the AI assistant"
              >
                {/* FIX: htmlFor / id pair associates label with input */}
                <label htmlFor="chat-input" className="sr-only">
                  Message VenueFlow AI
                </label>
                <Input
                  id="chat-input"
                  ref={chatInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about lines, exits, or restrooms..."
                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label="Message VenueFlow AI"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                  aria-label="Send message"
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Queue Info */}
      <section aria-labelledby="queues-heading">
        <h2 id="queues-heading" className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
          Recommended Queues
        </h2>
        <div 
          className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
          role="list"
          aria-labelledby="queues-heading"
        >
          {queues.length > 0 ? (
            queues.map(q => (
              <Card 
                key={q.id} 
                role="listitem"
                className="min-w-[160px] flex-shrink-0 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Sector {q.sectorId}</span>
                    <Badge variant={q.density > 80 ? "destructive" : "secondary"} className="text-[8px] h-3 px-1">
                      {q.density > 80 ? 'CRITICAL' : 'STABLE'}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-white mb-0.5">{q.waitTime}m</div>
                  <p className="text-[9px] text-zinc-500">Predicted wait time</p>
                </CardContent>
              </Card>
            ))
          ) : queuesLoading ? (
            <SkeletonList />
          ) : (
            <div className="w-full py-4 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs text-zinc-600">
              No active queues found at this location.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
