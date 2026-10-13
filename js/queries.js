export const USER_QUERY = `
  query User {
    user {
      id
      login
      attrs
      campus
      createdAt
      auditRatio
      totalUp
      totalDown
    }
  }
`

export const XP_QUERY = `
  query Xp($userId: Int!) {
    transaction(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
      order_by: { createdAt: asc }
    ) {
      amount
      createdAt
      path
      eventId
      object {
        name
        type
      }
    }
  }
`

export const EVENTS_QUERY = `
  query Events($ids: [Int!]!) {
    event(where: { id: { _in: $ids } }) {
      id
      path
      createdAt
      object {
        name
        type
      }
    }
  }
`

export const LEVEL_QUERY = `
  query Level($userId: Int!, $eventId: Int!) {
    transaction(
      where: { userId: { _eq: $userId }, type: { _eq: "level" }, eventId: { _eq: $eventId } }
      order_by: { amount: desc }
      limit: 1
    ) {
      amount
    }
  }
`

export const EVENT_LEVEL_QUERY = `
  query EventLevel($userId: Int!, $eventId: Int!) {
    event_user(where: { userId: { _eq: $userId }, eventId: { _eq: $eventId } }) {
      level
    }
  }
`

export const SKILLS_QUERY = `
  query Skills($userId: Int!) {
    transaction(
      where: { userId: { _eq: $userId }, type: { _like: "skill_%" } }
      order_by: { amount: desc }
    ) {
      type
      amount
    }
  }
`

export const PROJECTS_QUERY = `
  query Projects($userId: Int!) {
    progress(
      where: { userId: { _eq: $userId }, object: { type: { _eq: "project" } } }
      order_by: { updatedAt: desc }
    ) {
      grade
      isDone
      path
      createdAt
      updatedAt
      object {
        name
      }
    }
  }
`

export const AUDITS_QUERY = `
  query Audits($userId: Int!) {
    audit(
      where: { auditorId: { _eq: $userId }, grade: { _is_null: false } }
      order_by: { createdAt: desc }
    ) {
      grade
      createdAt
      group {
        captainLogin
        path
        object {
          name
        }
      }
    }
  }
`

export const ACCOUNT_QUERY = `
  query Account {
    user {
      login
      attrs
    }
  }
`
