import { signIn } from '../api.js'
import { fromTemplate } from '../dom.js'
import { session } from '../session.js'

export function renderLogin(root, { notice, onSuccess }) {
  const view = fromTemplate('login-template')
  const form = view.querySelector('form')
  const { identifier, password } = form.elements
  const error = form.querySelector('.form-error')
  const submit = form.querySelector('[type="submit"]')
  const reveal = form.querySelector('.reveal')

  function showError(message, field) {
    error.textContent = message
    error.hidden = false
    identifier.removeAttribute('aria-invalid')
    password.removeAttribute('aria-invalid')
    if (!field) return
    field.setAttribute('aria-invalid', 'true')
    field.focus()
  }

  function setBusy(busy) {
    submit.disabled = busy
    submit.textContent = busy ? 'Signing in…' : 'Sign in'
  }

  reveal.addEventListener('click', () => {
    const show = password.type === 'password'
    password.type = show ? 'text' : 'password'
    reveal.textContent = show ? 'Hide' : 'Show'
    reveal.setAttribute('aria-pressed', String(show))
  })

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const login = identifier.value.trim()
    if (!login) return showError('Enter your username or email.', identifier)
    if (!password.value) return showError('Enter your password.', password)
    setBusy(true)
    try {
      session.start(await signIn(login, password.value))
      onSuccess()
    } catch (failure) {
      setBusy(false)
      showError(failure.message, password)
      password.select()
    }
  })

  root.replaceChildren(view)
  if (notice) showError(notice)
  identifier.focus()
}
