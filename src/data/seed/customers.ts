// Named shoppers. Priya Nair is the storefront persona every customer screen opens
// as; the rest give the admin "Users" screens something real to show. Another ~500
// shoppers are generated (see generate/customers.ts) so order volume looks right.

import { DEMO_NOW, lookupPin } from '../constants'
import { addDaysIso } from '@/lib/date'
import type { Address, Customer, SavedPayment } from '../types'

interface AddressInput {
  label?: 'home' | 'work' | 'other'
  line1: string
  line2: string
  landmark?: string
  pin: string
  city?: string
}

interface CustomerInput {
  id: string
  name: string
  phone: string
  joinedDaysAgo: number
  addresses: AddressInput[]
  savedPayments?: SavedPayment[]
  status?: 'active' | 'blocked'
  statusReason?: string
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.in`
}

function buildAddress(customerId: string, name: string, phone: string, input: AddressInput, index: number): Address {
  const info = lookupPin(input.pin)
  return {
    id: `${customerId}_addr${index + 1}`,
    name,
    phone,
    line1: input.line1,
    line2: input.line2,
    ...(input.landmark ? { landmark: input.landmark } : {}),
    city: input.city ?? info?.city ?? 'India',
    state: info?.state ?? 'India',
    stateCode: info?.stateCode ?? '00',
    pin: input.pin,
    type: input.label ?? 'home',
  }
}

function customer(input: CustomerInput): Customer {
  const addresses = input.addresses.map((address, index) =>
    buildAddress(input.id, input.name, input.phone, address, index),
  )
  return {
    id: input.id,
    name: input.name,
    email: emailFor(input.name),
    phone: input.phone,
    joinedAt: addDaysIso(DEMO_NOW, -input.joinedDaysAgo),
    status: input.status ?? 'active',
    ...(input.statusReason ? { statusReason: input.statusReason } : {}),
    addresses,
    defaultAddressId: addresses[0]?.id ?? null,
    savedPayments: input.savedPayments ?? [],
  }
}

export const SEED_CUSTOMERS: Customer[] = [
  customer({
    id: 'cus_priya',
    name: 'Priya Nair',
    phone: '9847012310',
    joinedDaysAgo: 742,
    addresses: [
      { label: 'home', line1: 'Flat 3B, Maple Residency', line2: 'Kadavanthra', landmark: 'Opposite the BSNL office', pin: '682020' },
      { label: 'work', line1: '4th Floor, Trans Asia Tower', line2: 'Panampilly Nagar', pin: '682016' },
    ],
    savedPayments: [
      { id: 'pay_priya_upi', kind: 'upi', vpa: 'priya.n@okdemo', isDefault: true },
      { id: 'pay_priya_card', kind: 'card', network: 'visa', last4: '4242', expiry: '08/29', nameOnCard: 'Priya Nair', isDefault: false },
    ],
  }),
  customer({
    id: 'cus_aarav', name: 'Aarav Sharma', phone: '9811034521', joinedDaysAgo: 520,
    addresses: [{ line1: 'C-14, Saket', line2: 'Press Enclave Road', pin: '110017' }],
    savedPayments: [{ id: 'pay_aarav_upi', kind: 'upi', vpa: 'aarav.sharma@okdemo', isDefault: true }],
  }),
  customer({
    id: 'cus_rohan', name: 'Rohan Deshmukh', phone: '9822015678', joinedDaysAgo: 430,
    addresses: [{ line1: '12, Shaniwar Peth', line2: 'Near Omkareshwar Temple', pin: '411001' }],
  }),
  customer({
    id: 'cus_ananya', name: 'Ananya Iyer', phone: '9841023456', joinedDaysAgo: 388,
    addresses: [{ line1: 'Plot 22, Anna Nagar West', line2: '3rd Avenue', pin: '600040' }],
    savedPayments: [{ id: 'pay_ananya_upi', kind: 'upi', vpa: 'ananya.iyer@okdemo', isDefault: true }],
  }),
  customer({
    id: 'cus_kabir', name: 'Kabir Malhotra', phone: '9878045612', joinedDaysAgo: 356,
    addresses: [{ line1: 'House 1204, Sector 17', line2: 'Near the plaza', pin: '160017' }],
  }),
  customer({
    id: 'cus_meera', name: 'Meera Joshi', phone: '9825067890', joinedDaysAgo: 322,
    addresses: [{ line1: 'B-402, Shreeji Heights', line2: 'Satellite', pin: '380015' }],
  }),
  customer({
    id: 'cus_sneha', name: 'Sneha Patil', phone: '9820078901', joinedDaysAgo: 298,
    addresses: [{ line1: '7, Pali Hill Apartments', line2: 'Bandra West', landmark: 'Near Carter Road', pin: '400050' }],
    savedPayments: [{ id: 'pay_sneha_card', kind: 'card', network: 'rupay', last4: '8812', expiry: '05/28', nameOnCard: 'Sneha Patil', isDefault: true }],
  }),
  customer({
    id: 'cus_fatima', name: 'Fatima Sheikh', phone: '9839089012', joinedDaysAgo: 276,
    addresses: [{ line1: '45, Gomti Nagar', line2: 'Vipul Khand 2', pin: '226010' }],
  }),
  customer({
    id: 'cus_simran', name: 'Simran Kaur', phone: '9815090123', joinedDaysAgo: 244,
    addresses: [{ line1: '18, Ranjit Avenue', line2: 'Block B', pin: '143001' }],
  }),
  customer({
    id: 'cus_aditya', name: 'Aditya Menon', phone: '9845001234', joinedDaysAgo: 215,
    addresses: [{ line1: '204, Koramangala 5th Block', line2: '80 Feet Road', pin: '560034' }],
    savedPayments: [{ id: 'pay_aditya_upi', kind: 'upi', vpa: 'aditya.menon@okdemo', isDefault: true }],
  }),
  customer({
    id: 'cus_neha', name: 'Neha Agarwal', phone: '9831012345', joinedDaysAgo: 198,
    addresses: [{ line1: '6A, Ballygunge Place', line2: 'Ballygunge', pin: '700019' }],
  }),
  customer({
    id: 'cus_imran', name: 'Imran Qureshi', phone: '9893023456', joinedDaysAgo: 176,
    addresses: [{ line1: '88, Arera Colony', line2: 'E-7', pin: '462001' }],
  }),
  customer({
    id: 'cus_kavya', name: 'Kavya Hegde', phone: '9844034567', joinedDaysAgo: 154,
    addresses: [{ line1: '3, Kadri Hills', line2: 'Mallikatta', pin: '575001' }],
  }),
  customer({
    id: 'cus_pooja', name: 'Pooja Yadav', phone: '9835045678', joinedDaysAgo: 132,
    addresses: [{ line1: '27, Boring Road', line2: 'Near Panchmukhi Hanuman Mandir', pin: '800001' }],
  }),
  customer({
    id: 'cus_tenzin', name: 'Tenzin Dorjee', phone: '9832056789', joinedDaysAgo: 118,
    addresses: [{ line1: 'Development Area', line2: 'Near MG Marg', pin: '737101' }],
  }),
  customer({
    id: 'cus_arjun', name: 'Arjun Reddy', phone: '9866067890', joinedDaysAgo: 96,
    addresses: [{ line1: 'Flat 802, Aparna Towers', line2: 'Gachibowli', pin: '500081' }],
    savedPayments: [{ id: 'pay_arjun_upi', kind: 'upi', vpa: 'arjun.reddy@okdemo', isDefault: true }],
  }),
  customer({
    id: 'cus_divya', name: 'Divya Rajan', phone: '9842078901', joinedDaysAgo: 74,
    addresses: [{ line1: '11, RS Puram', line2: 'DB Road', pin: '641001' }],
  }),
  customer({
    id: 'cus_vikas', name: 'Vikas Thakur', phone: '9828089012', joinedDaysAgo: 58,
    addresses: [{ line1: '9, Bani Park', line2: 'Sikar House Colony', pin: '302001' }],
  }),
  customer({
    id: 'cus_riya', name: 'Riya Banerjee', phone: '9832090123', joinedDaysAgo: 5,
    addresses: [{ line1: '14, Hakimpara', line2: 'Sevoke Road', pin: '734001' }],
  }),
  customer({
    id: 'cus_manish', name: 'Manish Gupta', phone: '9871001234', joinedDaysAgo: 3,
    addresses: [{ line1: 'Tower 4, Flat 1105', line2: 'Sector 62', pin: '201301' }],
  }),
  customer({
    id: 'cus_zoya', name: 'Zoya Khan', phone: '9815012345', joinedDaysAgo: 2,
    addresses: [{ line1: '52, Model Town', line2: 'Near the civil lines', pin: '144001' }],
  }),
  customer({
    id: 'cus_rakesh', name: 'Rakesh Naidu', phone: '9866023456', joinedDaysAgo: 410,
    status: 'blocked',
    statusReason: 'Returned 7 of 9 orders in the last 90 days, each time as "item not as described". Blocked pending review.',
    addresses: [{ line1: '31, Dwaraka Nagar', line2: 'Main Road', pin: '530003' }],
  }),
  customer({
    id: 'cus_harsh', name: 'Harsh Bhatt', phone: '9825034567', joinedDaysAgo: 365,
    status: 'blocked',
    statusReason: 'Five cash-on-delivery orders refused at the door in August. Blocked for cash on delivery and new orders.',
    addresses: [{ line1: '204, Adajan Gam', line2: 'Near Rander Road', pin: '395003' }],
  }),
]

export const NAMED_CUSTOMER_IDS = SEED_CUSTOMERS.map((item) => item.id)
