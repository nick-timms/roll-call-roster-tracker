
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function generateQRCode(memberId: string): string {
  // In a production app, we would use a real QR code service
  // For now, we'll just base64 encode the member ID
  return btoa(`mattrack:${memberId}`);
}

export function decodeQRCode(qrData: string): string | null {
  try {
    const decoded = atob(qrData);
    const prefix = "mattrack:";
    
    if (decoded.startsWith(prefix)) {
      return decoded.substring(prefix.length);
    }
    
    return null;
  } catch (e) {
    console.error("Failed to decode QR code:", e);
    return null;
  }
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0]; // HH:MM:SS
}

export function getMonthDays(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function groupAttendanceByMonth(records: { date: string }[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  
  records.forEach(record => {
    const [year, month] = record.date.split('-');
    const key = `${year}-${month}`;
    
    if (!grouped[key]) {
      grouped[key] = 0;
    }
    
    grouped[key] += 1;
  });
  
  return grouped;
}
