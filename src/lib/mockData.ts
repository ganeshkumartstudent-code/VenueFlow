import { db, collection, getDocs, setDoc, doc, serverTimestamp } from './firebase';

export async function seedMockData() {
  const venuesSnap = await getDocs(collection(db, 'venues'));
  if (!venuesSnap.empty) return; // Already seeded

  console.log("Seeding mock data...");

  // Seed Venues
  const venueId = 'stadium-main';
  await setDoc(doc(db, 'venues', venueId), {
    name: 'Metropolis Arena',
    capacity: 85000,
    sectors: [
      { id: 'S1', name: 'North Stand', density: 85, capacity: 15000 },
      { id: 'S2', name: 'East Stand', density: 40, capacity: 20000 },
      { id: 'S3', name: 'South Stand', density: 92, capacity: 15000 },
      { id: 'S4', name: 'West Stand', density: 20, capacity: 20000 },
    ]
  });

  // Seed Queues
  const queues = [
    { id: 'Burger King - S1', type: 'concession', waitTime: 25, sectorId: 'S1', status: 'busy' },
    { id: 'Gate A - Entry', type: 'entry', waitTime: 12, sectorId: 'S1', status: 'open' },
    { id: 'Restroom - S4', type: 'restroom', waitTime: 2, sectorId: 'S4', status: 'open' },
    { id: 'Starbucks - S2', type: 'concession', waitTime: 8, sectorId: 'S2', status: 'open' },
    { id: 'Gate D - Exit', type: 'exit', waitTime: 5, sectorId: 'S3', status: 'open' },
  ];

  for (const q of queues) {
    await setDoc(doc(db, 'queues', q.id), {
      ...q,
      venueId,
      length: Math.floor(q.waitTime * 2.5),
    });
  }

  // Seed Tasks
  const tasks = [
    { id: 'task-1', description: 'Crowd control needed at Sector 3 entry', location: 'S3', priority: 'high', status: 'pending' },
    { id: 'task-2', description: 'Refill water station in Sector 2', location: 'S2', priority: 'medium', status: 'in-progress' },
  ];

  for (const t of tasks) {
    await setDoc(doc(db, 'tasks', t.id), {
      ...t,
      assignedTo: 'staff-1',
      createdAt: serverTimestamp(),
    });
  }

  // Seed Messages
  const messages = [
    { id: 'msg-1', senderId: 'system', senderName: 'AI AGENT', text: 'Predictive surge detected in Sector 1. Staff redirected.', channel: 'staff' },
    { id: 'msg-2', senderId: 'staff-1', senderName: 'John (Staff)', text: 'Copy that, moving to Sector 1.', channel: 'staff' },
  ];

  for (const m of messages) {
    await setDoc(doc(db, 'messages', m.id), {
      ...m,
      timestamp: serverTimestamp(),
    });
  }

  console.log("Mock data seeded successfully.");
}
