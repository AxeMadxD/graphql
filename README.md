# Horizon

A profile page for Tomorrow School built on the platform's GraphQL API. You sign in with your school account and see your identity, XP, level, audits and five SVG statistics graphs, plus a small GraphiQL page to run your own queries.

**Live:** https://axemadxd.github.io/graphql/

## Features

- **Login** with `username` + password or `email` + password. The credentials are sent once to `https://01.tomorrow-school.ai/api/auth/signin` with Basic authentication and the returned JWT is kept in `localStorage`. Wrong credentials, empty fields and network problems show a clear message.
- **Logout** from the top bar. The app also signs out by itself when the JWT expires or the server rejects it.
- **Identity** section: user id, name, login, email, campus and join date.
- **XP and level** section: total XP of the module, level, passed projects, last project and the XP of every event.
- **Audits** section: audit ratio, XP done and received, number of audits given and their results.
- **Statistics** section with SVG graphs drawn from scratch (no chart library):
  - XP over time (interactive line chart, hover or use the arrow keys)
  - XP by project (bar chart)
  - Audits done and received (donut)
  - Project results, passed and failed attempts (donut)
  - Skills (radar)
- **Recent activity**: the latest XP you earned anywhere.
- **GraphiQL** page: query editor with variables, example queries, highlighted results and a schema explorer.
- Works on phones and tablets, supports keyboard navigation and respects reduced motion.

## Running locally

The app is plain HTML, CSS and JavaScript modules, with no build step and no dependencies. Modules need to be served over HTTP:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Queries

All three kinds of queries asked by the subject are used (see `js/queries.js`):

| Kind | Example in the app |
| --- | --- |
| Normal | `user { id login attrs campus createdAt auditRatio totalUp totalDown }` |
| Nested | `transaction { amount object { name type } }`, `audit { grade group { captainLogin object { name } } }` |
| Arguments | `transaction(where: { userId: { _eq: $userId }, type: { _eq: "xp" } }, order_by: { createdAt: asc })` |

## How the numbers are calculated

You can check every value in GraphiQL (the platform's or the one in the app):

- **Identity**: `{ user { id login attrs campus createdAt } }`. Name and email come from `attrs`.
- **XP**: all `xp` transactions are loaded and grouped by `eventId`. The main event is the module (object type `module`, otherwise the biggest event that is not a piscine). Total XP is the sum of its `amount`s:

  ```graphql
  {
    transaction(where: { type: { _eq: "xp" }, eventId: { _eq: EVENT_ID } }) {
      amount
      path
    }
  }
  ```

  Hover the line under the total to see the event id and path. The chips below show the XP of every event, so piscines are visible too.
- **Level**: the highest `level` transaction of the module event, or `event_user.level` if there are none.
- **Audit ratio**, done and received: `{ user { auditRatio totalUp totalDown } }`.
- **Audits given**: `audit(where: { auditorId: { _eq: USER_ID }, grade: { _is_null: false } })`. A grade of 1 or more is a pass.
- **Project results**: `progress(where: { object: { type: { _eq: "project" } } })`. A grade of 1 or more is a pass, a lower grade is a fail and no grade means it is still in progress.
- **Skills**: the best `amount` of each `skill_*` transaction.

XP is shown like on the platform, in kB and MB (1 kB = 1000 XP). Hover the graphs to see exact values.

## Project structure

```
index.html            page templates and the logo
css/style.css         styles
js/main.js            routing between login, profile and GraphiQL
js/api.js             sign in and GraphQL requests
js/session.js         JWT storage and decoding
js/queries.js         GraphQL queries
js/profile-data.js    loads the profile and builds the numbers
js/stats.js           grouping and calculations
js/format.js          number and date formatting
js/dom.js             small DOM helpers
js/charts/            SVG charts: timeline, bars, donut, radar
js/views/             login, shell, profile and GraphiQL views
```
