/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Local datetime formatters and parsers to prevent UTC timezone shift bugs.
 */

export const pad = (n: number): string => String(n).padStart(2, '0');

export const toLocalISOString = (d: Date): string => {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

export const at = (days: number, hour: number, minute: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return toLocalISOString(d);
};

export const atMinutes = (offsetMinutes: number): string => {
  return toLocalISOString(new Date(Date.now() + offsetMinutes * 60000));
};

export const formatDisplayDateTime = (isoStr: string): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDisplayDate = (isoStr: string): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatDisplayTime = (isoStr: string): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Checks if two time intervals [aStart, aEnd] and [bStart, bEnd] overlap.
 */
export const doIntervalsOverlap = (
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date
): boolean => {
  const aS = new Date(aStart).getTime();
  const aE = new Date(aEnd).getTime();
  const bS = new Date(bStart).getTime();
  const bE = new Date(bEnd).getTime();
  return aS < bE && aE > bS;
};

/**
 * Checks if two dates fall within the same calendar week (Monday to Sunday).
 */
export const isWithinSameWeek = (dateAStr: string, dateBStr: string): boolean => {
  const dA = new Date(dateAStr);
  const dB = new Date(dateBStr);
  if (isNaN(dA.getTime()) || isNaN(dB.getTime())) return false;

  const getWeekStart = (d: Date): number => {
    const day = d.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);
    return mon.getTime();
  };

  return getWeekStart(dA) === getWeekStart(dB);
};

/**
 * Checks if a given timestamp falls within the current calendar week (Mon-Sun).
 */
export const isWithinCurrentWeek = (isoStr: string): boolean => {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return false;
  
  const now = new Date();
  const day = now.getDay(); // 0 is Sun, 1 is Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + diffToMon);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const time = d.getTime();
  return time >= startOfWeek.getTime() && time < endOfWeek.getTime();
};

