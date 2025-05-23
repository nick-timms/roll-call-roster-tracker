
import { Gym, Member, AttendanceRecord } from "@/types";

// Fake database using localStorage
class Database {
  private getItem<T>(key: string, defaultValue: T): T {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  }

  private setItem(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Gym Operations
  getGym(): Gym | null {
    return this.getItem<Gym | null>("gym", null);
  }

  saveGym(gym: Gym): void {
    this.setItem("gym", gym);
  }

  // Member Operations
  getMembers(): Member[] {
    return this.getItem<Member[]>("members", []);
  }

  getMemberById(id: string): Member | undefined {
    const members = this.getMembers();
    return members.find(member => member.id === id);
  }

  saveMember(member: Member): void {
    const members = this.getMembers();
    const index = members.findIndex(m => m.id === member.id);
    
    if (index >= 0) {
      members[index] = member;
    } else {
      members.push(member);
    }
    
    this.setItem("members", members);
  }

  deleteMember(id: string): void {
    const members = this.getMembers();
    const filtered = members.filter(member => member.id !== id);
    this.setItem("members", filtered);
    
    // Also delete their attendance records
    const records = this.getAttendanceRecords();
    const filteredRecords = records.filter(record => record.member_id !== id);
    this.setItem("attendanceRecords", filteredRecords);
  }

  // Attendance Operations
  getAttendanceRecords(): AttendanceRecord[] {
    return this.getItem<AttendanceRecord[]>("attendanceRecords", []);
  }

  getAttendanceByMemberId(memberId: string): AttendanceRecord[] {
    const records = this.getAttendanceRecords();
    return records.filter(record => record.member_id === memberId);
  }

  getAttendanceByDate(date: string): AttendanceRecord[] {
    const records = this.getAttendanceRecords();
    return records.filter(record => record.date === date);
  }

  // Add this method for check-ins
  addAttendanceRecord(record: AttendanceRecord): void {
    const records = this.getAttendanceRecords();
    records.push(record);
    this.setItem("attendanceRecords", records);
  }

  // Add this method for updating attendance records
  updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): void {
    const records = this.getAttendanceRecords();
    const index = records.findIndex(r => r.id === id);
    
    if (index >= 0) {
      records[index] = { ...records[index], ...updates };
      this.setItem("attendanceRecords", records);
    }
  }

  checkInMember(record: AttendanceRecord): void {
    const records = this.getAttendanceRecords();
    
    // Check if already checked in today
    const existingRecord = records.find(
      r => r.member_id === record.member_id && r.date === record.date
    );
    
    if (existingRecord) {
      // Update existing record
      existingRecord.time_in = record.time_in;
      if (record.notes) existingRecord.notes = record.notes;
    } else {
      // Add new record
      records.push(record);
    }
    
    this.setItem("attendanceRecords", records);
  }

  deleteAttendanceRecord(id: string): void {
    const records = this.getAttendanceRecords();
    const filtered = records.filter(record => record.id !== id);
    this.setItem("attendanceRecords", filtered);
  }

  // Utility functions
  clearAll(): void {
    localStorage.removeItem("gym");
    localStorage.removeItem("members");
    localStorage.removeItem("attendanceRecords");
  }
}

export const db = new Database();
