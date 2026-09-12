// IST calendar maths without a date library. India Standard Time is a fixed
// +05:30 offset all year, so "the IST day" is just the UTC day shifted by 330
// minutes — no daylight-saving edge cases to handle.

import { DEMO_NOW, IST_OFFSET_MS, IST_SUFFIX } from '@/data/constants'
import type { DateRange, DayKey, ISODate, RangePreset } from '@/data/types'

const MS_PER_DAY = 86_400_000

function toMs(value: ISODate | Date | number): number {
  if (typeof value === 'number') return value
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

/** Zero-padded two-digit string. */
function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** A timestamp as an ISO string carrying the +05:30 offset, e.g. "2026-09-12T14:05:00+05:30". */
export function toIsoIst(value: ISODate | Date | number): ISODate {
  const shifted = new Date(toMs(value) + IST_OFFSET_MS)
  const date = shifted.toISOString().slice(0, 19)
  return `${date}${IST_SUFFIX}`
}

/** The IST calendar day a timestamp falls in, "YYYY-MM-DD". */
export function toDayKey(value: ISODate | Date | number): DayKey {
  return new Date(toMs(value) + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/** Midnight IST at the start of a day key, as a Date. */
export function dayKeyToDate(day: DayKey): Date {
  return new Date(Date.parse(`${day}T00:00:00${IST_SUFFIX}`))
}

/** Midnight IST at the start of the day a timestamp falls in. */
export function startOfDayIST(value: ISODate | Date | number): ISODate {
  return `${toDayKey(value)}T00:00:00${IST_SUFFIX}`
}

/** One millisecond before midnight at the end of the day a timestamp falls in. */
export function endOfDayIST(value: ISODate | Date | number): ISODate {
  return `${toDayKey(value)}T23:59:59${IST_SUFFIX}`
}

/** Shift a day key by whole days (negative goes back). */
export function addDays(day: DayKey, days: number): DayKey {
  return toDayKey(dayKeyToDate(day).getTime() + days * MS_PER_DAY)
}

/** Shift a timestamp by whole days, keeping the time of day. */
export function addDaysIso(value: ISODate | Date | number, days: number): ISODate {
  return toIsoIst(toMs(value) + days * MS_PER_DAY)
}

export function addHours(value: ISODate | Date | number, hours: number): ISODate {
  return toIsoIst(toMs(value) + hours * 3_600_000)
}

export function addMinutes(value: ISODate | Date | number, minutes: number): ISODate {
  return toIsoIst(toMs(value) + minutes * 60_000)
}

/** Whole days from `from` to `to` (both day keys); negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((dayKeyToDate(to).getTime() - dayKeyToDate(from).getTime()) / MS_PER_DAY)
}

/** Set the time of day (IST) on a day key. */
export function atTime(day: DayKey, hours: number, minutes = 0): ISODate {
  return `${day}T${pad(hours)}:${pad(minutes)}:00${IST_SUFFIX}`
}

/** The date ranges the dashboards and reports offer. Ranges are inclusive of both ends. */
export function rangeFromPreset(preset: RangePreset, now: ISODate | Date | number = DEMO_NOW): DateRange {
  const today = toDayKey(now)
  switch (preset) {
    case 'today':
      return { from: today, to: today, preset }
    case 'yesterday': {
      const day = addDays(today, -1)
      return { from: day, to: day, preset }
    }
    case '7d':
      return { from: addDays(today, -6), to: today, preset }
    case '30d':
      return { from: addDays(today, -29), to: today, preset }
    case '90d':
      return { from: addDays(today, -89), to: today, preset }
    case 'mtd':
      return { from: `${today.slice(0, 7)}-01`, to: today, preset }
  }
}

/** The equally long range immediately before this one, for "vs previous period". */
export function previousRange(range: DateRange): DateRange {
  const length = daysBetween(range.from, range.to) + 1
  return { from: addDays(range.from, -length), to: addDays(range.to, -length) }
}

/** Every day key in a range, in order. */
export function eachDay(range: DateRange): DayKey[] {
  const days: DayKey[] = []
  const total = daysBetween(range.from, range.to)
  for (let index = 0; index <= total; index += 1) days.push(addDays(range.from, index))
  return days
}

/** Number of days a range spans, inclusive. */
export function rangeLength(range: DateRange): number {
  return daysBetween(range.from, range.to) + 1
}

/** Does a timestamp fall inside a range (IST days, both ends inclusive)? */
export function isWithin(value: ISODate | Date | number, range: DateRange): boolean {
  const day = toDayKey(value)
  return day >= range.from && day <= range.to
}

/** Does a day key fall inside a range? */
export function isDayWithin(day: DayKey, range: DateRange): boolean {
  return day >= range.from && day <= range.to
}

/** Hours from `from` to `to`; negative when `to` is earlier. */
export function hoursBetween(from: ISODate | Date | number, to: ISODate | Date | number): number {
  return (toMs(to) - toMs(from)) / 3_600_000
}

/** The IST hour (0–23) of a timestamp. */
export function hourOfDayIST(value: ISODate | Date | number): number {
  return new Date(toMs(value) + IST_OFFSET_MS).getUTCHours()
}

/** 0 = Sunday … 6 = Saturday, in IST. */
export function weekdayIST(value: ISODate | Date | number): number {
  return new Date(toMs(value) + IST_OFFSET_MS).getUTCDay()
}
