// Coupons. Dates are anchored to "now" so the demo always has one expired coupon,
// one scheduled coupon and four live ones, whenever it is opened.

import { DEMO_NOW } from '../constants'
import { addDays, atTime, toDayKey } from '@/lib/date'
import type { Coupon } from '../types'

const today = toDayKey(DEMO_NOW)
const firstOfThisMonth = `${today.slice(0, 7)}-01`
const lastMonthEnd = addDays(firstOfThisMonth, -1)
const nextMonthStart = addDays(`${today.slice(0, 7)}-28`, 7).slice(0, 7) + '-01'
const thisMonthEnd = addDays(nextMonthStart, -1)

const startOf = (day: string) => atTime(day, 0, 0)
const endOf = (day: string) => atTime(day, 23, 59)

export const SEED_COUPONS: Coupon[] = [
  {
    code: 'WELCOME100',
    title: '₹100 off your first order',
    description: 'Flat ₹100 off on your first order of ₹499 or more.',
    kind: 'flat',
    value: 100,
    minOrder: 499,
    firstOrderOnly: true,
    fundedBy: 'platform',
    startsAt: startOf(addDays(today, -365)),
    endsAt: endOf(addDays(today, 180)),
    used: 4128,
  },
  {
    code: 'FESTIVE20',
    title: '20% off fashion, footwear and home',
    description: '20% off up to ₹750 on fashion, footwear and home & kitchen. Minimum order ₹1,499.',
    kind: 'percent',
    value: 20,
    maxDiscount: 750,
    minOrder: 1499,
    categoryIds: ['cat_fashion', 'cat_footwear', 'cat_home'],
    fundedBy: 'platform',
    startsAt: startOf(firstOfThisMonth),
    endsAt: endOf(thisMonthEnd),
    usageLimit: 20000,
    used: 6742,
  },
  {
    code: 'PREPAID50',
    title: '₹50 off when you pay online',
    description: 'Flat ₹50 off on prepaid orders of ₹999 or more. Not valid on cash on delivery.',
    kind: 'flat',
    value: 50,
    minOrder: 999,
    prepaidOnly: true,
    fundedBy: 'platform',
    startsAt: startOf(addDays(today, -120)),
    endsAt: endOf(addDays(today, 90)),
    used: 9310,
  },
  {
    code: 'BOOKWORM10',
    title: '10% off books from Pustak Ghar',
    description: '10% off up to ₹150 on books sold by Pustak Ghar Books. Funded by the seller.',
    kind: 'percent',
    value: 10,
    maxDiscount: 150,
    minOrder: 299,
    categoryIds: ['cat_books'],
    fundedBy: 'seller',
    sellerId: 'sel_pustak',
    startsAt: startOf(addDays(today, -60)),
    endsAt: endOf(addDays(today, 120)),
    used: 812,
  },
  {
    code: 'MONSOON15',
    title: '15% off monsoon essentials',
    description: '15% off up to ₹400. This offer has ended.',
    kind: 'percent',
    value: 15,
    maxDiscount: 400,
    minOrder: 999,
    fundedBy: 'platform',
    startsAt: startOf(addDays(lastMonthEnd, -60)),
    endsAt: endOf(lastMonthEnd),
    used: 5231,
  },
  {
    code: 'UTSAV25',
    title: '25% off for the festive sale',
    description: '25% off up to ₹1,500 during the festive sale. Minimum order ₹2,499.',
    kind: 'percent',
    value: 25,
    maxDiscount: 1500,
    minOrder: 2499,
    fundedBy: 'platform',
    startsAt: startOf(nextMonthStart),
    endsAt: endOf(addDays(nextMonthStart, 20)),
    usageLimit: 50000,
    used: 0,
  },
]
