const KEY = 'horizon:token'

function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function write(token) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}

export function decodeToken(token) {
  const part = token?.split('.')[1]
  if (!part) return null
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

class Session {
  constructor() {
    this.token = read()
  }

  get claims() {
    return decodeToken(this.token)
  }

  get userId() {
    const claims = this.claims
    const id = claims?.['https://hasura.io/jwt/claims']?.['x-hasura-user-id'] ?? claims?.sub
    return id === undefined ? null : Number(id)
  }

  get expiresAt() {
    const exp = this.claims?.exp
    return exp ? exp * 1000 : null
  }

  get expired() {
    const exp = this.claims?.exp
    return Boolean(this.token) && (!exp || exp * 1000 <= Date.now())
  }

  get active() {
    return Boolean(this.token) && this.claims !== null && !this.expired
  }

  start(token) {
    this.token = token
    write(token)
  }

  end() {
    this.token = null
    write(null)
  }
}

export const session = new Session()
