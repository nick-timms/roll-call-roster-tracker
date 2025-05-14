
export interface Gym {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  phone?: string;
  company_name?: string;
  address?: string;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  belt?: string;
  membership_status?: string;
  membership_type?: string;
  notes?: string;
  qr_code: string;
  gym_id: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  member_id: string;
  date: string;
  time_in: string;
  time_out?: string;
  notes?: string;
  created_at: string;
}
