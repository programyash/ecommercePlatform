// The marketplace team: five roles with `resource:action` permissions and the eight
// people who hold them. Admin screens read these for the roles grid and the team list.

import { DEMO_NOW } from '../constants'
import { addHours } from '@/lib/date'
import type { AdminUser, Permission, PermissionResource, Role } from '../types'

const RESOURCES: PermissionResource[] = [
  'orders', 'products', 'sellers', 'users', 'payouts', 'coupons', 'reviews', 'reports', 'settings',
]

function all(): Permission[] {
  return RESOURCES.flatMap((resource) => [`${resource}:view`, `${resource}:edit`, `${resource}:approve`] as Permission[])
}

export const SEED_ROLES: Role[] = [
  {
    id: 'role_super',
    name: 'Super admin',
    description: 'Full access, including settings, roles and the team.',
    permissions: all(),
  },
  {
    id: 'role_ops',
    name: 'Operations',
    description: 'Runs orders and fulfilment; can approve sellers but not touch money or settings.',
    permissions: [
      'orders:view', 'orders:edit', 'orders:approve',
      'sellers:view', 'sellers:edit', 'sellers:approve',
      'products:view', 'users:view', 'reviews:view', 'reports:view',
    ],
  },
  {
    id: 'role_catalogue',
    name: 'Catalogue',
    description: 'Moderates listings, categories and reviews.',
    permissions: [
      'products:view', 'products:edit', 'products:approve',
      'reviews:view', 'reviews:edit', 'reviews:approve',
      'sellers:view', 'orders:view', 'reports:view',
    ],
  },
  {
    id: 'role_finance',
    name: 'Finance',
    description: 'Owns payouts, refunds, coupons and the tax reports.',
    permissions: [
      'payouts:view', 'payouts:edit', 'payouts:approve',
      'coupons:view', 'coupons:edit', 'coupons:approve',
      'orders:view', 'sellers:view', 'reports:view',
    ],
  },
  {
    id: 'role_support',
    name: 'Support',
    description: 'Answers shoppers: order notes, cancellations, refunds to raise and blocked accounts.',
    permissions: [
      'orders:view', 'orders:edit',
      'users:view', 'users:edit',
      'reviews:view', 'products:view', 'sellers:view',
    ],
  },
]

export const SEED_ADMINS: AdminUser[] = [
  { id: 'adm_super', name: 'Ishaan Verma', email: 'ishaan.verma@chowk.example', roleId: 'role_super', status: 'active', lastActiveAt: addHours(DEMO_NOW, -1) },
  { id: 'adm_ops1', name: 'Nandita Rao', email: 'nandita.rao@chowk.example', roleId: 'role_ops', status: 'active', lastActiveAt: addHours(DEMO_NOW, -3) },
  { id: 'adm_ops2', name: 'Faisal Ahmed', email: 'faisal.ahmed@chowk.example', roleId: 'role_ops', status: 'active', lastActiveAt: addHours(DEMO_NOW, -26) },
  { id: 'adm_cat1', name: 'Trisha Pillai', email: 'trisha.pillai@chowk.example', roleId: 'role_catalogue', status: 'active', lastActiveAt: addHours(DEMO_NOW, -5) },
  { id: 'adm_cat2', name: 'Yash Kulkarni', email: 'yash.kulkarni@chowk.example', roleId: 'role_catalogue', status: 'active', lastActiveAt: addHours(DEMO_NOW, -52) },
  { id: 'adm_fin1', name: 'Deepa Krishnan', email: 'deepa.krishnan@chowk.example', roleId: 'role_finance', status: 'active', lastActiveAt: addHours(DEMO_NOW, -20) },
  { id: 'adm_sup1', name: 'Rahul Verma', email: 'rahul.verma@chowk.example', roleId: 'role_support', status: 'active', lastActiveAt: addHours(DEMO_NOW, -2) },
  { id: 'adm_sup2', name: 'Nikita Shah', email: 'nikita.shah@chowk.example', roleId: 'role_support', status: 'invited', lastActiveAt: addHours(DEMO_NOW, -72) },
]

export function adminName(id: string): string {
  return SEED_ADMINS.find((admin) => admin.id === id)?.name ?? 'Chowk team'
}
