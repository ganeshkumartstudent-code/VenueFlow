import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, type LucideIcon } from 'lucide-react';

// ── Skeletons ──

export const SkeletonHeatmap = () => (
  <div className="grid grid-cols-4 gap-4 h-64">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent animate-shimmer" 
             style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
      </div>
    ))}
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

export const SkeletonList = () => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="min-w-[160px] h-24 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse" />
    ))}
  </div>
);

export const SkeletonChart = () => (
  <div className="w-full h-full flex items-end gap-2 p-4 pt-10">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="flex-1 bg-zinc-800/50 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }} />
    ))}
  </div>
);

// ── Empty States ──

export const EmptyState = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
    <div className="rounded-full bg-zinc-900 p-4 mb-4 border border-zinc-800">
      <Icon className="h-8 w-8 text-zinc-600" />
    </div>
    <h3 className="text-zinc-300 font-semibold">{title}</h3>
    <p className="text-zinc-500 text-sm max-w-[200px] mt-1">{description}</p>
  </div>
);

// ── Network Status ──

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-3 shadow-xl"
          role="alert"
        >
          <WifiOff className="h-4 w-4 animate-bounce" />
          <span className="text-sm font-bold tracking-wide uppercase">Network Disconnected: Live data syncing paused</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
