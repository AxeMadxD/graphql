import { query } from '../api.js'
import { fill, fromTemplate } from '../dom.js'
import { ACCOUNT_QUERY } from '../queries.js'
import { session } from '../session.js'

export function renderShell(root, { onLogout, onExpired }) {
  root.replaceChildren(fromTemplate('shell-template'))
  root.querySelector('[data-action="logout"]').addEventListener('click', onLogout)
  const links = [...root.querySelectorAll('[data-route]')]

  query(session.token, ACCOUNT_QUERY)
    .then(({ user }) => {
      const account = user?.[0]
      if (!account) return
      const name = [account.attrs?.firstName, account.attrs?.lastName].filter(Boolean).join(' ')
      fill(root, { account: name ? `${name} · @${account.login}` : `@${account.login}` })
    })
    .catch(error => {
      if (error.expired) onExpired()
    })

  return {
    page: root.querySelector('#page'),
    setRoute(name) {
      for (const link of links) {
        const active = link.dataset.route === name
        link.classList.toggle('active', active)
        if (active) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      }
    },
  }
}
