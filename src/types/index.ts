
export interface Gym {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Member {
  id: string;
  gymId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipType?: string;
  qrCode: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string; // format: YYYY-MM-DD
  timeIn: string;
  notes?: string;
}
