export const DOMAIN = '01.tomorrow-school.ai'

const SIGNIN_URL = `https://${DOMAIN}/api/auth/signin`
const GRAPHQL_URL = `https://${DOMAIN}/api/graphql-engine/v1/graphql`

export class ApiError extends Error {
  constructor(message, { status = 0, expired = false } = {}) {
    super(message)
    this.status = status
    this.expired = expired
  }
}

function basicAuth(identifier, password) {
  const bytes = new TextEncoder().encode(`${identifier}:${password}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

async function send(url, options) {
  try {
    return await fetch(url, options)
  } catch {
    throw new ApiError('Could not reach the school server. Check your connection and try again.')
  }
}

export async function signIn(identifier, password) {
  const response = await send(SIGNIN_URL, {
    method: 'POST',
    headers: { Authorization: basicAuth(identifier, password) },
  })
  const body = await response.json().catch(() => null)
  if (response.status === 401 || response.status === 403) {
    throw new ApiError('Invalid credentials: the user does not exist or the password is wrong.', { status: response.status })
  }
  if (!response.ok) {
    throw new ApiError(body?.error || `Sign in failed with status ${response.status}.`, { status: response.status })
  }
  if (typeof body !== 'string') throw new ApiError('The server sent an unexpected answer. Try again later.')
  return body
}

export async function request(token, document, variables = {}) {
  const response = await send(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: document, variables }),
  })
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

export async function query(token, document, variables) {
  const { status, body } = await request(token, document, variables)
  const errors = body?.errors
  if (errors?.length) {
    const expired = errors.some(error => error.extensions?.code === 'invalid-jwt')
    throw new ApiError(errors[0].message, { status, expired })
  }
  if (!body?.data) {
    throw new ApiError(`The GraphQL request failed with status ${status}.`, { status, expired: status === 401 })
  }
  return body.data
}
