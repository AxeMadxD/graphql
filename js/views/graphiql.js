import { request } from '../api.js'
import { create, fill, fromTemplate } from '../dom.js'
import { formatDate } from '../format.js'
import { session } from '../session.js'

const STORAGE_KEY = 'horizon:graphiql'

const EXAMPLES = [
  {
    name: 'Normal: my user',
    query: '{\n  user {\n    id\n    login\n    campus\n    createdAt\n  }\n}\n',
    variables: '{}',
  },
  {
    name: 'Nested: results with their user',
    query: '{\n  result(limit: 5, order_by: { createdAt: desc }) {\n    id\n    grade\n    path\n    user {\n      id\n      login\n    }\n  }\n}\n',
    variables: '{}',
  },
  {
    name: 'Arguments: one object by id',
    query: '{\n  object(where: { id: { _eq: 3323 } }) {\n    name\n    type\n  }\n}\n',
    variables: '{}',
  },
  {
    name: 'Variables: latest transactions of a type',
    query: 'query Latest($type: String!, $limit: Int!) {\n  transaction(\n    where: { type: { _eq: $type } }\n    order_by: { createdAt: desc }\n    limit: $limit\n  ) {\n    amount\n    path\n    createdAt\n    object {\n      name\n      type\n    }\n  }\n}\n',
    variables: '{\n  "type": "xp",\n  "limit": 10\n}',
  },
]

const SCHEMA_QUERY = '{ __schema { queryType { fields { name description type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } } }'
const TYPE_QUERY = 'query Type($name: String!) { __type(name: $name) { name fields { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } }'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? EXAMPLES[0]
  } catch {
    return EXAMPLES[0]
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    return false
  }
  return true
}

function typeName(type) {
  if (!type) return ''
  if (type.kind === 'NON_NULL') return `${typeName(type.ofType)}!`
  if (type.kind === 'LIST') return `[${typeName(type.ofType)}]`
  return type.name
}

function baseType(type) {
  return type?.ofType ? baseType(type.ofType) : type?.name
}

function highlight(json) {
  const nodes = []
  const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  let last = 0
  for (const match of json.matchAll(pattern)) {
    if (match.index > last) nodes.push(json.slice(last, match.index))
    if (match[1]) {
      nodes.push(create('span', { className: match[2] ? 'json-key' : 'json-string', text: match[1] }))
      if (match[2]) nodes.push(match[2])
    } else {
      nodes.push(create('span', { className: match[3] ? 'json-literal' : 'json-number', text: match[0] }))
    }
    last = match.index + match[0].length
  }
  nodes.push(json.slice(last))
  return nodes
}

export function renderGraphiql(page, { onExpired }) {
  page.replaceChildren(fromTemplate('graphiql-template'))
  const root = page.firstElementChild
  const queryInput = root.querySelector('[data-input="query"]')
  const variablesInput = root.querySelector('[data-input="variables"]')
  const output = root.querySelector('[data-output="result"]')
  const status = root.querySelector('[data-output="status"]')
  const runButton = root.querySelector('[data-action="run"]')
  const examples = root.querySelector('[data-input="examples"]')
  const schemaList = root.querySelector('[data-list="schema"]')
  const typeDetail = root.querySelector('[data-output="type"]')

  const expires = new Date(session.expiresAt)
  fill(root, { session: `Signed in as user #${session.userId} · token valid until ${formatDate(expires)}, ${expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` })

  const state = load()
  queryInput.value = state.query
  variablesInput.value = state.variables
  examples.append(...EXAMPLES.map((example, i) => create('option', { value: i, text: example.name })))

  function showResult(label, kind, value) {
    status.textContent = label
    status.className = `status ${kind}`
    output.replaceChildren(...(typeof value === 'string' ? [value] : highlight(JSON.stringify(value, null, 2))))
  }

  async function send(document, variables) {
    const result = await request(session.token, document, variables)
    if (result.body?.errors?.some(error => error.extensions?.code === 'invalid-jwt')) {
      onExpired()
      return null
    }
    return result
  }

  async function run() {
    save({ query: queryInput.value, variables: variablesInput.value })
    let variables
    try {
      variables = variablesInput.value.trim() ? JSON.parse(variablesInput.value) : {}
    } catch (error) {
      showResult('Invalid variables', 'error', `The variables are not valid JSON: ${error.message}`)
      return
    }
    runButton.disabled = true
    const started = performance.now()
    try {
      const result = await send(queryInput.value, variables)
      if (!result) return
      const time = `${Math.round(performance.now() - started)} ms`
      const failed = result.body?.errors?.length
      showResult(failed ? `Error · ${time}` : `${result.status} OK · ${time}`, failed ? 'error' : 'ok', result.body)
    } catch (error) {
      showResult('Network error', 'error', error.message)
    } finally {
      runButton.disabled = false
    }
  }

  async function showType(name) {
    typeDetail.replaceChildren(create('p', { className: 'muted', text: `Loading ${name}…` }))
    const result = await send(TYPE_QUERY, { name }).catch(() => null)
    const type = result?.body?.data?.__type
    if (!type?.fields) {
      typeDetail.replaceChildren(create('p', { className: 'muted', text: `No fields found for ${name}.` }))
      return
    }
    typeDetail.replaceChildren(
      create('h4', { text: type.name }),
      create('ul', { className: 'type-fields' }, type.fields.map(field => create('li', {}, [
        create('span', { className: 'json-key', text: field.name }),
        create('span', { className: 'muted', text: typeName(field.type) }),
      ]))),
    )
  }

  async function loadSchema() {
    const result = await send(SCHEMA_QUERY, {}).catch(() => null)
    const fields = result?.body?.data?.__schema?.queryType?.fields
    if (!fields) {
      schemaList.replaceChildren(create('li', { className: 'muted', text: result?.body?.errors?.[0]?.message ?? 'The schema could not be loaded.' }))
      return
    }
    const tables = fields.filter(field => !/(_aggregate|_by_pk)$/.test(field.name))
    schemaList.replaceChildren(...tables.map(field => {
      const button = create('button', { type: 'button', className: 'schema-field', text: field.name, title: field.description ?? field.name })
      button.addEventListener('click', () => {
        for (const other of schemaList.querySelectorAll('.schema-field')) other.classList.toggle('active', other === button)
        showType(baseType(field.type) ?? field.name)
      })
      return create('li', {}, [button])
    }))
  }

  examples.addEventListener('change', () => {
    const example = EXAMPLES[examples.value]
    if (!example) return
    queryInput.value = example.query
    variablesInput.value = example.variables
    examples.value = ''
    run()
  })
  runButton.addEventListener('click', run)
  root.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      run()
    }
  })
  for (const input of [queryInput, variablesInput]) {
    input.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || event.shiftKey) return
      event.preventDefault()
      input.setRangeText('  ', input.selectionStart, input.selectionEnd, 'end')
    })
  }

  loadSchema()
  run()
}
