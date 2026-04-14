import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingDown, Users, Clock, Download, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { functions, httpsCallable } from '@/lib/firebase';
import { toast } from 'sonner';
import { SkeletonChart } from './StatusUI';
import { GLOBAL_DEMO_DATA } from '@/lib/mockData';

function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    waitTime: any[];
    density: any[];
    efficiency: { rate: number; completed: number; total: number };
  }>({
    waitTime: [],
    density: [],
    efficiency: { rate: 0, completed: 0, total: 0 }
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const getBigQueryAnalytics = httpsCallable(functions, 'getBigQueryAnalytics');
      const result = await getBigQueryAnalytics({ limit: 100 });
      const analytics = result.data as any;
      
      setData({
        waitTime: analytics.waitTime || [],
        density: analytics.density || [],
        efficiency: analytics.efficiency || { rate: 0, completed: 0, total: 0 }
      });
      toast.success("BigQuery Analytics Synced");
    } catch (error) {
      console.warn("Analytics fetch error, falling back to mock data:", error);
      // Mock Fallback for Demo - USING GLOBAL SYNC DATA
      setData({
        waitTime: GLOBAL_DEMO_DATA.sectors.map(s => ({
          sectorId: s.id,
          avgWait: s.waitTime,
          wait: s.waitTime
        })),
        density: GLOBAL_DEMO_DATA.sectors.map(s => ({
          sectorId: s.id,
          peakDensity: s.density,
          density: s.density
        })),
        efficiency: { rate: 0.78, completed: 42, total: 54 }
      });
      toast.info("Offline Mode: Using simulated streaming data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const waitTimeData = useMemo(() => data.waitTime.map((item: any) => ({
    time: item.sectorId,
    wait: Math.round(item.avgWait)
  })), [data.waitTime]);

  const densityData = useMemo(() => data.density.map((item: any) => ({
    name: item.sectorId,
    density: Math.round(item.peakDensity),
    capacity: 100
  })), [data.density]);

  const avgWait = useMemo(() => {
    if (waitTimeData.length === 0) return '--';
    return Math.round(waitTimeData.reduce((a, b) => a + b.wait, 0) / waitTimeData.length);
  }, [waitTimeData]);

  const peakDensity = useMemo(() => {
    if (densityData.length === 0) return '--';
    return Math.max(...densityData.map(d => d.density));
  }, [densityData]);

  return (
    <div className="space-y-6 h-full overflow-auto pb-10" role="region" aria-label="Admin analytics dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Real-time BigQuery Insights</h1>
          <p className="text-zinc-500 text-sm">Streaming data from Firestore changelogs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading} className="border-zinc-800 bg-zinc-900">
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync BQ
          </Button>
          <Button variant="outline" className="border-zinc-800 bg-zinc-900">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export Report
          </Button>
        </div>
      </div>

      {/* High Level Metrics */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">Key performance metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="list">
          <Card className="border-zinc-800 bg-zinc-900" role="listitem">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500" id="metric-waittime">
                Avg. Wait Time (1h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-green-500">
                  {data.waitTime.length > 0 ? Math.round(data.waitTime.reduce((a, b) => a + b.wait, 0) / data.waitTime.length) : '--'}m
                </span>
                <TrendingDown className="h-5 w-5 text-green-500" aria-hidden="true" />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Calculated from BigQuery streams</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900" role="listitem">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500" id="metric-attendance">
                Peak Density
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-orange-500">
                  {data.density.length > 0 ? Math.max(...data.density.map(d => d.density)) : '--'}%
                </span>
                <Users className="h-5 w-5 text-orange-500" aria-hidden="true" />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Maximum recorded sector capacity</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900" role="listitem">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500" id="metric-accuracy">
                Staff Task Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-blue-500">
                  {Math.round(data.efficiency.rate * 100)}%
                </span>
                <div role="meter" aria-valuenow={data.efficiency.rate * 100} aria-valuemin={0} aria-valuemax={100} aria-label="Staff efficiency meter" className="h-2 w-12 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${data.efficiency.rate * 100}%` }} aria-hidden="true" />
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">{data.efficiency.completed}/{data.efficiency.total} tasks completed</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wait Time Trend */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg font-bold" id="chart-wait-title">Sector Wait Times (Minutes)</CardTitle>
            <CardDescription id="chart-wait-desc">Average wait per sector retrieved from BigQuery</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <figure aria-labelledby="chart-wait-title" aria-describedby="chart-wait-desc">
              <div aria-hidden="true" className="h-full">
                {loading ? (
                  <SkeletonChart />
                ) : (
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
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#f97316' }} />
                      <Area type="monotone" dataKey="wait" stroke="#f97316" fillOpacity={1} fill="url(#colorWait)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </figure>
          </CardContent>
        </Card>

        {/* Sector Density */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg font-bold" id="chart-density-title">Peak Sector Saturation</CardTitle>
            <CardDescription id="chart-density-desc">Peak density per sector from historical streams</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <figure aria-labelledby="chart-density-title" aria-describedby="chart-density-desc">
              <div aria-hidden="true" className="h-full">
                {loading ? (
                  <SkeletonChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={densityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                      <YAxis stroke="#71717a" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                      <Bar dataKey="density" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </figure>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default React.memo(AdminAnalytics);
