import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'venueflow-rules-test';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  setLogLevel('silent');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users', 'admin-1'), {
      uid: 'admin-1',
      email: 'admin@venueflow.ai',
      name: 'Admin',
      role: 'admin',
      createdAt: 1,
    });

    await setDoc(doc(db, 'users', 'staff-1'), {
      uid: 'staff-1',
      email: 'staff@venueflow.ai',
      name: 'Staff',
      role: 'staff',
      createdAt: 1,
    });

    await setDoc(doc(db, 'users', 'attendee-1'), {
      uid: 'attendee-1',
      email: 'attendee@venueflow.ai',
      name: 'Attendee',
      role: 'attendee',
      createdAt: 1,
    });

    await setDoc(doc(db, 'queues', 'queue-1'), {
      sectorId: 'S1',
      waitTime: 12,
      density: 70,
    });

    await setDoc(doc(db, 'tasks', 'task-1'), {
      description: 'Control north gate crowd flow',
      location: 'S1',
      priority: 'high',
      status: 'pending',
    });

    await setDoc(doc(db, 'messages', 'msg-public'), {
      channel: 'public',
      text: 'Public alert',
    });

    await setDoc(doc(db, 'messages', 'msg-staff'), {
      channel: 'staff',
      text: 'Staff-only alert',
    });
  });
});

describe('Firestore Security Rules', () => {
  it('denies unauthenticated queue reads', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'queues', 'queue-1')));
  });

  it('allows staff and admin to write queue updates', async () => {
    const staffDb = testEnv.authenticatedContext('staff-1').firestore();
    const adminDb = testEnv.authenticatedContext('admin-1').firestore();

    await assertSucceeds(updateDoc(doc(staffDb, 'queues', 'queue-1'), { waitTime: 18 }));
    await assertSucceeds(updateDoc(doc(adminDb, 'queues', 'queue-1'), { density: 85 }));
  });

  it('denies attendee access to staff tasks', async () => {
    const db = testEnv.authenticatedContext('attendee-1').firestore();
    await assertFails(getDoc(doc(db, 'tasks', 'task-1')));
  });

  it('allows staff to read tasks', async () => {
    const db = testEnv.authenticatedContext('staff-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'tasks', 'task-1')));
  });

  it('prevents role escalation in user profile updates', async () => {
    const db = testEnv.authenticatedContext('attendee-1').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'attendee-1'), { role: 'admin' }));
  });

  it('allows safe user profile updates on own document', async () => {
    const db = testEnv.authenticatedContext('attendee-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', 'attendee-1'), { name: 'Updated Attendee Name' }));
  });

  it('enforces staff channel visibility by role', async () => {
    const attendeeDb = testEnv.authenticatedContext('attendee-1').firestore();
    const staffDb = testEnv.authenticatedContext('staff-1').firestore();

    await assertFails(getDoc(doc(attendeeDb, 'messages', 'msg-staff')));
    await assertSucceeds(getDoc(doc(staffDb, 'messages', 'msg-staff')));
  });
});
