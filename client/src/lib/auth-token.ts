import { API_BASE_URL } from './config'

function parseJwtRole(token: string): string | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    const decoded = JSON.parse(jsonPayload)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null
    }
    return decoded.role ? decoded.role.toUpperCase() : null
  } catch {
    return null
  }
}

export function determineRole(endpointOrPath?: string): 'admin' | 'seller' | 'customer' {
  const target = endpointOrPath || (typeof window !== 'undefined' ? window.location.pathname : '')
  if (target.includes('/admin')) return 'admin'
  if (target.includes('/seller')) return 'seller'
  return 'customer'
}

export function getAuthToken(role?: 'admin' | 'seller' | 'customer'): string {
  const targetRoleName = role || determineRole()
  const targetRole = targetRoleName.toUpperCase()
  const roleKey = `token_${targetRoleName}`

  const savedToken = localStorage.getItem(roleKey)
  if (savedToken && parseJwtRole(savedToken) === targetRole) {
    return savedToken
  }

  const genericToken = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (genericToken && parseJwtRole(genericToken) === targetRole) {
    localStorage.setItem(roleKey, genericToken)
    return genericToken
  }

  return ''
}

export async function ensureAuthToken(
  role?: 'customer' | 'seller' | 'admin',
  forceRefresh = false
): Promise<string> {
  const targetRoleName = role || determineRole()
  const roleKey = `token_${targetRoleName}`

  if (!forceRefresh) {
    const existing = getAuthToken(targetRoleName)
    if (existing) {
      if (determineRole() === targetRoleName) {
        localStorage.setItem('token', existing)
        sessionStorage.setItem('token', existing)
      }
      return existing
    }
  }

  const credentials = {
    customer: { email: 'priya.nair@example.in', password: 'password123' },
    seller: { email: 'orbit.mobiles.hub@example.in', password: 'password123' },
    admin: { email: 'admin@chowk.com', password: 'password123' },
  }[targetRoleName]

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    const json = await res.json()
    if (json?.data?.token) {
      localStorage.setItem(roleKey, json.data.token)
      if (determineRole() === targetRoleName) {
        localStorage.setItem('token', json.data.token)
        sessionStorage.setItem('token', json.data.token)
      }
      return json.data.token
    }
  } catch (err) {
    console.error('Failed to auto-authenticate for role:', targetRoleName, err)
  }

  return ''
}


