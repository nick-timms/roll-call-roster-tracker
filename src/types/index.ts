export interface Gym {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  belt?: string;
  membership_status?: string;
  notes?: string;
  qrCode: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  timeIn: string;
  timeOut?: string;
  notes?: string;
}
