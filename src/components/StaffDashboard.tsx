import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert, Users, MessageSquare, CheckCircle2, AlertCircle, TrendingUp, Map as MapIcon } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, updateDoc, doc, where } from '@/lib/firebase';
import { useAuth } from '@/AuthProvider';
import { getCrowdPrediction } from '@/lib/gemini';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function StaffDashboard() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tasksQ = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(20));
    const tasksUnsub = onSnapshot(tasksQ, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const msgsQ = query(collection(db, 'messages'), where('channel', '==', 'staff'), orderBy('timestamp', 'desc'), limit(50));
    const msgsUnsub = onSnapshot(msgsQ, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      tasksUnsub();
      msgsUnsub();
    };
  }, []);

  const runAIPrediction = async () => {
    setLoading(true);
    // Mock sensor data
    const mockData = {
      venueId: 'stadium-main',
      currentDensity: [
        { sectorId: 'S1', density: 85 },
        { sectorId: 'S2', density: 40 },
        { sectorId: 'S3', density: 92 },
        { sectorId: 'S4', density: 20 },
      ]
    };

    const result = await getCrowdPrediction(mockData);
    if (result?.predictions) {
      setPredictions(result.predictions);
      toast.success("AI Crowd Prediction Updated");
      
      // Agentic AI: Auto-assign tasks based on high density
      for (const pred of result.predictions) {
        if (pred.predictedDensity > 80) {
          await addDoc(collection(db, 'tasks'), {
            description: `AI ALERT: High density predicted in ${pred.sectorId}. ${pred.recommendation}`,
            location: pred.sectorId,
            priority: 'high',
            status: 'pending',
            assignedTo: 'auto-agent',
            createdAt: serverTimestamp()
          });
        }
      }
    }
    setLoading(false);
  };

  const completeTask = async (taskId: string) => {
    await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' });
    toast.success("Task completed");
  };

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left Column: Heatmap & Predictions */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <CardTitle className="text-xl font-bold">Real-time Crowd Density</CardTitle>
              <CardDescription>Visualizing 80k+ simulated attendees</CardDescription>
            </div>
            <Button onClick={runAIPrediction} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? "Predicting..." : "Run AI Prediction"}
              <TrendingUp className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-4 h-64">
              {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((s, i) => {
                const pred = predictions.find(p => p.sectorId === s);
                const density = pred ? pred.predictedDensity : (Math.random() * 100);
                return (
                  <div key={s} className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden group">
                    <div 
                      className="absolute inset-0 transition-all duration-1000" 
                      style={{ 
                        backgroundColor: density > 80 ? '#ef4444' : density > 50 ? '#f59e0b' : '#22c55e',
                        opacity: density / 200 + 0.1
                      }} 
                    />
                    <div className="relative p-4 flex flex-col items-center justify-center h-full">
                      <span className="text-xs font-bold text-zinc-400">{s}</span>
                      <span className="text-lg font-bold">{Math.round(density)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500" /> Low</div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-yellow-500" /> Moderate</div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500" /> Critical</div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">AI Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-1" />
                <p className="text-sm text-zinc-300">
                  {predictions.length > 0 
                    ? `Predicted surge in Sector ${predictions[0].sectorId}. Recommend opening Gate B for overflow.`
                    : "System stable. Monitoring entry points for pre-match surge."}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Staff Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: '78%' }} />
                </div>
                <span className="text-sm font-bold text-orange-500">78%</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">Target: 85% | +12% from last event</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column: Tasks & Chat */}
      <div className="space-y-6">
        {/* Agentic Tasks */}
        <Card className="border-zinc-800 bg-zinc-900 h-[400px] flex flex-col">
          <CardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Agentic AI Tasks</CardTitle>
              <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                {tasks.filter(t => t.status === 'pending').length} Active
              </Badge>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className={`p-3 rounded-lg border ${task.status === 'completed' ? 'bg-zinc-950/50 border-zinc-800 opacity-50' : 'bg-zinc-800 border-zinc-700'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-[8px] h-4">
                          {task.priority}
                        </Badge>
                        <span className="text-[10px] text-zinc-500">{task.location}</span>
                      </div>
                      <p className="text-xs font-medium text-zinc-200">{task.description}</p>
                    </div>
                    {task.status !== 'completed' && (
                      <Button size="icon" variant="ghost" onClick={() => completeTask(task.id)} className="h-8 w-8 text-green-500 hover:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Staff Coordination Chat */}
        <Card className="border-zinc-800 bg-zinc-900 h-[300px] flex flex-col">
          <CardHeader className="border-b border-zinc-800 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-500" />
              Coordination Channel
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className="text-xs">
                  <span className="font-bold text-orange-500">{m.senderName}: </span>
                  <span className="text-zinc-300">{m.text}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-zinc-800">
            <div className="flex gap-2">
              <Input placeholder="Update staff..." className="h-8 text-xs bg-zinc-800 border-zinc-700" />
              <Button size="sm" className="h-8 bg-orange-600">Send</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
