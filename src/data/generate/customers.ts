// ~500 generated shoppers so 90 days of orders come from a believable spread of
// people and cities. Names, emails and phone numbers are obviously synthetic.

import { DEMO_NOW, KNOWN_PINS, lookupPin } from '../constants'
import { addDaysIso } from '@/lib/date'
import { AREA_NAMES, BUILDING_NAMES, FIRST_NAMES, LANDMARKS, LAST_NAMES } from './names'
import { streamFor } from './rng'
import type { Address, Customer } from '../types'

export const GENERATED_CUSTOMER_COUNT = 500

export function generateCustomers(count = GENERATED_CUSTOMER_COUNT): Customer[] {
  const rng = streamFor('customers')
  const customers: Customer[] = []
  const usedEmails = new Set<string>()

  for (let index = 0; index < count; index += 1) {
    const id = `cus_g${String(index + 1).padStart(4, '0')}`
    const first = rng.pick(FIRST_NAMES)
    const last = rng.pick(LAST_NAMES)
    const name = `${first} ${last}`
    let email = `${first}.${last}${index % 7 === 0 ? '' : index}`.toLowerCase() + '@example.in'
    while (usedEmails.has(email)) email = `${first}.${last}.${index}@example.in`.toLowerCase()
    usedEmails.add(email)

    const phone = `${rng.pick([6, 7, 8, 9])}${String(rng.int(100000000, 999999999))}`
    const pin = rng.pick(KNOWN_PINS)
    const info = lookupPin(pin)
    // Most shoppers joined over the last two years; a handful this week.
    const joinedDaysAgo = rng.chance(0.04) ? rng.int(0, 6) : Math.round(rng.gaussian(260, 180, 7, 900))

    const address: Address = {
      id: `${id}_addr1`,
      name,
      phone,
      line1: `${rng.int(1, 240)}, ${rng.pick(BUILDING_NAMES)}`,
      line2: rng.pick(AREA_NAMES),
      ...(rng.chance(0.35) ? { landmark: rng.pick(LANDMARKS) } : {}),
      city: info?.city ?? 'India',
      state: info?.state ?? 'India',
      stateCode: info?.stateCode ?? '00',
      pin,
      type: rng.chance(0.8) ? 'home' : 'work',
    }

    customers.push({
      id,
      name,
      email,
      phone,
      joinedAt: addDaysIso(DEMO_NOW, -joinedDaysAgo),
      status: 'active',
      addresses: [address],
      defaultAddressId: address.id,
      savedPayments: rng.chance(0.4)
        ? [{ id: `${id}_upi`, kind: 'upi', vpa: `${first}.${last}@okdemo`.toLowerCase(), isDefault: true }]
        : [],
    })
  }

  return customers
}
