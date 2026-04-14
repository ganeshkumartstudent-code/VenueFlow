import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingDown, Users, Clock, MapPin, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const waitTimeData = [
  { time: '18:00', wait: 5 },
  { time: '18:30', wait: 12 },
  { time: '19:00', wait: 25 },
  { time: '19:30', wait: 45 },
  { time: '20:00', wait: 15 },
  { time: '20:30', wait: 8 },
];

const sectorDensityData = [
  { name: 'Sector 1', density: 85, capacity: 100 },
  { name: 'Sector 2', density: 45, capacity: 100 },
  { name: 'Sector 3', density: 92, capacity: 100 },
  { name: 'Sector 4', density: 30, capacity: 100 },
  { name: 'Sector 5', density: 60, capacity: 100 },
  { name: 'Sector 6', density: 75, capacity: 100 },
];

const flowEfficiencyData = [
  { name: 'Mon', value: 40 },
  { name: 'Tue', value: 45 },
  { name: 'Wed', value: 55 },
  { name: 'Thu', value: 65 },
  { name: 'Fri', value: 82 },
  { name: 'Sat', value: 91 },
  { name: 'Sun', value: 88 },
];

export default function AdminAnalytics() {
  return (
    <div className="space-y-6 h-full overflow-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Event Insights</h2>
          <p className="text-zinc-500 text-sm">Post-event analytics and BigQuery integration</p>
        </div>
        <Button variant="outline" className="border-zinc-800 bg-zinc-900">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* High Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Wait Time Reduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-green-500">42%</span>
              <TrendingDown className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Compared to previous season average</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Peak Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-orange-500">78,432</span>
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">98% of stadium capacity reached</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">AI Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-blue-500">94.8%</span>
              <div className="h-2 w-12 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[94%]" />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Crowd prediction vs actual density</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wait Time Trend */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Wait Time Trend (Minutes)</CardTitle>
            <CardDescription>Average wait across all concession stands</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waitTimeData}>
                <defs>
                  <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#f97316' }}
                />
                <Area type="monotone" dataKey="wait" stroke="#f97316" fillOpacity={1} fill="url(#colorWait)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sector Density */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Sector Saturation</CardTitle>
            <CardDescription>Current density vs total capacity</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorDensityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="density" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Flow Efficiency */}
        <Card className="border-zinc-800 bg-zinc-900 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Flow Efficiency Index</CardTitle>
            <CardDescription>Weekly optimization progress using VenueFlow AI</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={flowEfficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Line type="stepAfter" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
