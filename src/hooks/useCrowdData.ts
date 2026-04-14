import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query } from '@/lib/firebase';
import { GLOBAL_REALTIME_DATA } from '@/lib/mockData';

export function useCrowdData() {
  const [sectors, setSectors] = useState<any[]>(GLOBAL_REALTIME_DATA.sectors);
  const [queues, setQueues] = useState<any[]>(GLOBAL_REALTIME_DATA.queues);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync Queues
    const q = query(collection(db, 'queues'));
    const unsubQueues = onSnapshot(q, (snapshot) => {
      let allQueues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (allQueues.length === 0) {
        allQueues = GLOBAL_REALTIME_DATA.queues as any[];
      }
      // Sort by wait time
      const sorted = allQueues.sort((a, b) => (a.waitTime || 0) - (b.waitTime || 0));
      setQueues(sorted);
      setLoading(false);
    }, (err) => {
      console.warn("Queue sync failed, using mock:", err);
      setQueues(GLOBAL_REALTIME_DATA.queues);
      setLoading(false);
    });

    // Sync Venues/Sectors
    const v = query(collection(db, 'venues'));
    const unsubSectors = onSnapshot(v, (snapshot) => {
      if (!snapshot.empty) {
        const venue = snapshot.docs[0].data();
        if (venue.sectors) setSectors(venue.sectors);
      }
    });

    return () => {
      unsubQueues();
      unsubSectors();
    };
  }, []);

  return { sectors, queues, loading };
}
