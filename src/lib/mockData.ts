import { db, collection, getDocs, setDoc, doc, serverTimestamp } from './firebase';

export const GLOBAL_REALTIME_DATA = {
  venueName: 'Metropolis Arena',
  sectors: [
    { id: 'S1', name: 'North Stand', density: 85, waitTime: 12, capacity: 15000 },
    { id: 'S2', name: 'East Stand', density: 42, waitTime: 8, capacity: 20000 },
    { id: 'S3', name: 'South Stand', density: 92, waitTime: 25, capacity: 15000 },
    { id: 'S4', name: 'West Stand', density: 21, waitTime: 5, capacity: 20000 },
    { id: 'S5', name: 'VIP Lounge', density: 15, waitTime: 3, capacity: 5000 },
    { id: 'S6', name: 'Family Zone', density: 60, waitTime: 10, capacity: 10000 },
  ],
  queues: [
    { id: 'q1', sectorId: 'S4', waitTime: 2, type: 'restroom', density: 10, name: 'Restroom Loop - S4' },
    { id: 'q2', sectorId: 'S1', waitTime: 4, type: 'entry', density: 20, name: 'Fast Lane - Gate A' },
    { id: 'q3', sectorId: 'S2', waitTime: 7, type: 'food', density: 30, name: 'Cold Brew Coffee - S2' },
    { id: 'q4', sectorId: 'S2', waitTime: 15, type: 'food', density: 65, name: 'Stadium Burgers - S2' },
    { id: 'q5', sectorId: 'S6', waitTime: 32, type: 'merch', density: 88, name: 'Official Merch - S6' },
  ]
};

export async function seedMockData() {
  const venuesSnap = await getDocs(collection(db, 'venues'));
  const queuesSnap = await getDocs(collection(db, 'queues'));
  
  if (!venuesSnap.empty && !queuesSnap.empty) return; 

  console.log("Seeding fresh real-time data...");

  const venueId = 'stadium-main';
  await setDoc(doc(db, 'venues', venueId), {
    name: GLOBAL_REALTIME_DATA.venueName,
    capacity: 85000,
    sectors: GLOBAL_REALTIME_DATA.sectors
  });

  for (const q of GLOBAL_REALTIME_DATA.queues) {
    await setDoc(doc(db, 'queues', q.name), {
      ...q,
      venueId,
      status: q.waitTime > 20 ? 'busy' : 'open',
      lastUpdate: serverTimestamp()
    });
  }

  const tasks = [
    { id: 'task-1', description: 'Crowd control in S3', location: 'S3', priority: 'high', status: 'pending' },
    { id: 'task-2', description: 'Restock S2 Food', location: 'S2', priority: 'medium', status: 'pending' },
  ];

  for (const t of tasks) {
    await setDoc(doc(db, 'tasks', t.id), { ...t, createdAt: serverTimestamp() });
  }

  const messages = [
    { id: 'msg-1', senderName: 'AI AGENT', text: 'Optimizing flow in Sector 3...', channel: 'staff' },
    { id: 'msg-2', senderName: 'Commander', text: 'Copy that.', channel: 'staff' },
  ];

  for (const m of messages) {
    await setDoc(doc(db, 'messages', m.id), { ...m, timestamp: serverTimestamp() });
  }

  console.log("Mock data seeded successfully.");
}
