
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
  phoneNumber?: string;
  belt?: string;
  membershipType?: string;
  membership_status?: string; // Add this property
  notes?: string; // Add this property
  qrCode: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string; // format: YYYY-MM-DD
  timeIn: string;
  timeOut?: string; // Add this property
  notes?: string;
}
