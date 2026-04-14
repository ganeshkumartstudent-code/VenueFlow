import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Navigation, MessageCircle, Send, Users, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askGemini, geminiModel } from '@/lib/gemini';
import { db, collection, onSnapshot, query, orderBy, limit } from '@/lib/firebase';
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function UserApp() {
  const [mode, setMode] = useState<'map' | 'ar' | 'chat'>('map');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [queues, setQueues] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    const q = query(collection(db, 'queues'), orderBy('waitTime', 'asc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQueues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    const aiResponse = await askGemini(input);
    setMessages(prev => [...prev, { role: 'ai' as const, text: aiResponse }]);
  };

  const startAR = async () => {
    setMode('ar');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <Users className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Venue Density</span>
          </div>
          <p className="mt-1 text-xl font-bold text-orange-500">64%</p>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Avg. Wait</span>
          </div>
          <p className="mt-1 text-xl font-bold text-orange-500">8 min</p>
        </Card>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-inner">
        <AnimatePresence mode="wait">
          {mode === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full w-full p-4"
            >
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Live Venue Map</h3>
                  <Badge variant="outline" className="border-orange-500/50 text-orange-500">Sector 4 (Low Density)</Badge>
                </div>
                
                {/* Mock Map Visualization */}
                <div className="relative flex-1 rounded-xl bg-zinc-800/50 p-4 border border-zinc-700/50 overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #f97316 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                  <div className="relative h-full w-full flex items-center justify-center">
                    <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className={`h-24 rounded-lg border flex flex-col items-center justify-center gap-1 ${i === 4 ? 'bg-orange-500/20 border-orange-500' : 'bg-zinc-800 border-zinc-700'}`}>
                          <span className="text-xs font-bold">Sector {i}</span>
                          <div className={`h-1.5 w-12 rounded-full ${i === 4 ? 'bg-green-500' : i === 2 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full bg-blue-500 animate-ping" />
                      <div className="h-4 w-4 rounded-full bg-blue-500 absolute top-0 left-0" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={startAR} className="bg-orange-600 hover:bg-orange-700">
                    <Camera className="mr-2 h-4 w-4" />
                    AR Navigation
                  </Button>
                  <Button onClick={() => setMode('chat')} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Ask AI
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'ar' && (
            <motion.div 
              key="ar"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative h-full w-full bg-black"
            >
              <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover opacity-60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-dashed border-orange-500/50 rounded-full animate-pulse flex items-center justify-center">
                  <div className="text-center">
                    <Navigation className="h-12 w-12 text-orange-500 mx-auto mb-2" />
                    <p className="text-orange-500 font-bold text-xl">Sector 4</p>
                    <p className="text-white text-sm">Follow the path</p>
                  </div>
                </div>
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900/80 p-4 rounded-xl border border-orange-500/30 backdrop-blur-md w-72">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase">AI Suggestion</p>
                      <p className="text-sm">Sector 2 is congested. Redirecting to North Exit.</p>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => setMode('map')} 
                className="absolute top-4 right-4 bg-zinc-900/80 hover:bg-zinc-800"
              >
                Close AR
              </Button>
            </motion.div>
          )}

          {mode === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex h-full flex-col"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 p-4">
                <h3 className="font-semibold">VenueFlow AI Assistant</h3>
                <Button variant="ghost" size="sm" onClick={() => setMode('map')}>Back to Map</Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-zinc-500 py-10">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Ask me anything about the venue!</p>
                      <p className="text-xs mt-2">"Where is the shortest food line?"</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'}`}>
                        <p className="text-sm">{m.text}</p>
                      </div>
                      {m.role === 'ai' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => speakText(m.text)}
                          disabled={isSpeaking}
                          className="text-[10px] h-6 mt-1 text-zinc-500 hover:text-orange-500"
                        >
                          {isSpeaking ? "Speaking..." : "Listen"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-zinc-800 flex gap-2">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about lines, exits, or restrooms..." 
                  className="bg-zinc-800 border-zinc-700"
                />
                <Button onClick={handleSend} className="bg-orange-600 hover:bg-orange-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Queue Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Recommended Queues</h4>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {queues.length > 0 ? queues.map(q => (
            <Card key={q.id} className="min-w-[160px] border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="secondary" className="text-[10px] uppercase">{q.type}</Badge>
                <span className="text-[10px] text-zinc-500">{q.sectorId}</span>
              </div>
              <p className="text-sm font-semibold truncate">{q.id}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1 text-orange-500">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-bold">{q.waitTime}m</span>
                </div>
                <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${Math.max(0, 100 - q.waitTime * 5)}%` }} />
                </div>
              </div>
            </Card>
          )) : (
            <p className="text-xs text-zinc-500 italic">Loading queue data...</p>
          )}
        </div>
      </div>
    </div>
  );
}
