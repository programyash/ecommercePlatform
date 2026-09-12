// How long a parcel takes and what it costs. One implementation, used by the
// product page PIN check, the cart, checkout and the order generator — so the date
// a shopper is promised is the date the seller sees on the shipment.

import { DEMO_NOW, lookupPin, stateDistance } from '../constants'
import { addDaysIso, hourOfDayIST, toDayKey } from '@/lib/date'
import { hashString } from '../generate/rng'
import type { ISODate, PlatformSettings, Rupees } from '../types'

export interface DeliveryEstimateInput {
  /** Destination PIN code. */
  pin: string
  /** GST state code the parcel ships from. */
  fromStateCode: string
  /** Working days the seller needs to hand the parcel over. */
  dispatchDays: number
  /** Order or item value, for the free-delivery threshold. */
  value: Rupees
  /** Does the product itself allow cash on delivery? */
  cod: boolean
  settings: PlatformSettings
  now?: ISODate
  express?: boolean
}

export interface DeliveryEstimate {
  serviceable: boolean
  /** Promised delivery date (ISO, IST). */
  date: ISODate
  /** Whole days from "now" to the promised date. */
  days: number
  fee: Rupees
  cod: boolean
  codReason?: string
  expressAvailable: boolean
  expressDate?: ISODate
  expressFee: Rupees
  city?: string
  state?: string
  /** Set when the PIN cannot be served at all. */
  reason?: string
}

/** Transit days between two states: same state 2, same region 3, otherwise 4 or 5. */
export function transitDays(fromStateCode: string, toStateCode: string, pin: string): number {
  const distance = stateDistance(fromStateCode, toStateCode)
  if (distance === 0) return 2
  if (distance === 1) return 3
  return 4 + (hashString(pin) % 2)
}

/** Parcels handed over after 2 PM leave the next working day. */
function dispatchOffset(dispatchDays: number, now: ISODate): number {
  return hourOfDayIST(now) >= 14 ? dispatchDays : Math.max(0, dispatchDays - 1)
}

export function estimateDelivery(input: DeliveryEstimateInput): DeliveryEstimate {
  const now = input.now ?? DEMO_NOW
  const info = lookupPin(input.pin)
  const fee = input.value >= input.settings.freeDeliveryThreshold ? 0 : input.settings.deliveryFee

  if (!info) {
    return {
      serviceable: false,
      date: now,
      days: 0,
      fee,
      cod: false,
      expressAvailable: false,
      expressFee: input.settings.expressFee,
      reason: 'Enter a valid 6-digit PIN code.',
    }
  }
  if (input.settings.unserviceablePins.includes(input.pin)) {
    return {
      serviceable: false,
      date: now,
      days: 0,
      fee,
      cod: false,
      expressAvailable: false,
      expressFee: input.settings.expressFee,
      city: info.city,
      state: info.state,
      reason: `We do not deliver to ${input.pin} yet. Try another PIN code.`,
    }
  }

  const transit = transitDays(input.fromStateCode, info.stateCode, input.pin)
  const days = transit + dispatchOffset(input.dispatchDays, now)
  const expressDays = Math.max(1, days - 2)
  const codAllowed = input.cod && input.value <= input.settings.codLimit

  return {
    serviceable: true,
    date: addDaysIso(now, days),
    days,
    fee,
    cod: codAllowed,
    codReason: codAllowed
      ? undefined
      : input.cod
        ? `Cash on delivery is not available on orders above ₹${input.settings.codLimit.toLocaleString('en-IN')}.`
        : 'Cash on delivery is not available for this item.',
    expressAvailable: expressDays < days,
    expressDate: expressDays < days ? addDaysIso(now, expressDays) : undefined,
    expressFee: input.settings.expressFee,
    city: info.city,
    state: info.state,
  }
}

/** The delivery date promised at the moment an order is placed. */
export function promisedDate(
  placedAt: ISODate,
  fromStateCode: string,
  pin: string,
  dispatchDays: number,
  express = false,
): ISODate {
  const info = lookupPin(pin)
  const transit = transitDays(fromStateCode, info?.stateCode ?? '00', pin)
  const days = transit + dispatchDays
  return addDaysIso(placedAt, express ? Math.max(1, days - 2) : days)
}

/** The seller's dispatch deadline: 2 PM on the working day the parcel is due. */
export function dispatchDeadline(placedAt: ISODate, dispatchDays: number): ISODate {
  const afterCutoff = hourOfDayIST(placedAt) >= 14
  const day = toDayKey(addDaysIso(placedAt, (afterCutoff ? 1 : 0) + Math.max(0, dispatchDays - 1)))
  return `${day}T14:00:00+05:30`
}
