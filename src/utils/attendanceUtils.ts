import { AttendanceRecord } from '../types';

/**
 * Returns the local date in YYYY-MM-DD format (avoids UTC day shift bugs).
 */
export function getLocalDateString(dateInput: Date | string | number = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deduplicates attendance records so that for any given (date, studentId) pair,
 * only the single most recent record is kept.
 */
export function getDeduplicatedAttendance(records: AttendanceRecord[]): AttendanceRecord[] {
  if (!Array.isArray(records)) return [];

  const map = new Map<string, AttendanceRecord>();
  records.forEach(rec => {
    if (!rec || !rec.studentId || !rec.date) return;
    const cleanDate = rec.date.trim();
    const key = `${cleanDate}_${rec.studentId}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...rec, date: cleanDate });
    } else {
      const existingTime = existing.timestamp ? new Date(existing.timestamp).getTime() : 0;
      const recTime = rec.timestamp ? new Date(rec.timestamp).getTime() : 0;
      if (recTime >= existingTime) {
        map.set(key, { ...rec, date: cleanDate });
      }
    }
  });
  return Array.from(map.values());
}

