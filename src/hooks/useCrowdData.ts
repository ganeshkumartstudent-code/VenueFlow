import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query } from '@/lib/firebase';
import { GLOBAL_REALTIME_DATA } from '@/lib/mockData';
import { Sector, Queue } from '@/types';

/**
 * Custom hook to subscribe to real-time venue and queue data.
 * Merges live Firestore data with local fallback data for resilience.
 */
export function useCrowdData() {
  const [sectors, setSectors] = useState<Sector[]>(GLOBAL_REALTIME_DATA.sectors as Sector[]);
  const [queues, setQueues] = useState<Queue[]>(GLOBAL_REALTIME_DATA.queues as Queue[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync Queues in real-time
    const q = query(collection(db, 'queues'));
    const unsubQueues = onSnapshot(q, (snapshot) => {
      let allQueues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Queue));
      if (allQueues.length === 0) {
        allQueues = GLOBAL_REALTIME_DATA.queues as Queue[];
      }
      // Sort by wait time for attendee priority
      const sorted = allQueues.sort((a, b) => (a.waitTime || 0) - (b.waitTime || 0));
      setQueues(sorted);
      setLoading(false);
    }, (err) => {
      console.warn("Queue sync failed, using mock:", err);
      setQueues(GLOBAL_REALTIME_DATA.queues as Queue[]);
      setLoading(false);
    });

    // Sync Venues/Sectors in real-time
    const v = query(collection(db, 'venues'));
    const unsubSectors = onSnapshot(v, (snapshot) => {
      if (!snapshot.empty) {
        const venue = snapshot.docs[0].data();
        if (venue.sectors) setSectors(venue.sectors as Sector[]);
      }
    });

    return () => {
      unsubQueues();
      unsubSectors();
    };
  }, []);

  return { sectors, queues, loading };
}
