export interface Sector {
  id: string;
  name: string;
  density: number;
  waitTime: number;
  capacity: number;
}

export interface Queue {
  id: string;
  sectorId: string;
  waitTime: number;
  type: 'restroom' | 'entry' | 'food' | 'merch';
  density: number;
  name: string;
}

export interface StaffTask {
  id: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: any;
  generatedBy?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'attendee' | 'staff' | 'admin';
}
