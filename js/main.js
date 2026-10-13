import { session } from './session.js'
import { renderGraphiql } from './views/graphiql.js'
import { renderLogin } from './views/login.js'
import { renderProfile } from './views/profile.js'
import { renderShell } from './views/shell.js'

const app = document.getElementById('app')
const EXPIRED = 'Your session has expired. Please sign in again.'
const ROUTES = { '#/profile': 'profile', '#/graphiql': 'graphiql' }
const PAGES = { profile: renderProfile, graphiql: renderGraphiql }

const MAX_TIMEOUT = 2 ** 31 - 1

let shell = null
let expiryTimer = null

function logout(notice) {
  clearTimeout(expiryTimer)
  shell = null
  session.end()
  renderLogin(app, { notice, onSuccess: showApp })
}

function watchExpiry() {
  clearTimeout(expiryTimer)
  const left = session.expiresAt - Date.now()
  if (left < MAX_TIMEOUT) expiryTimer = setTimeout(expire, Math.max(0, left))
}

function expire() {
  logout(EXPIRED)
}

function showPage() {
  if (!session.active) return showApp()
  const name = ROUTES[location.hash] ?? 'profile'
  shell.setRoute(name)
  PAGES[name](shell.page, { onExpired: expire })
}

function showApp() {
  if (!session.active) {
    logout(session.expired ? EXPIRED : undefined)
    return
  }
  shell = renderShell(app, { onLogout: () => logout(), onExpired: expire })
  watchExpiry()
  showPage()
}

addEventListener('hashchange', () => {
  if (shell) showPage()
})

showApp()
