# Ward slot review workspace

Implemented against StreetBiz-BE for WARD-16, WARD-17, WARD-18, SYS-01 and SYS-02.
Open `/ward/inbox/reviews` for real Backend data and
`/ward/inbox/reviews/{kind}/{id}` for detail, where kind is proposals, conflicts
or transfers. The old `/ward-reviews` paths redirect to these nested routes.

## Configuration

Create an ignored .env.local with:

```dotenv
VITE_API_BASE_URL=https://localhost:7147/api
```

Run npm install, npm run dev and open
http://localhost:5173/ward/inbox/reviews.
Trust the Backend HTTPS certificate and configure its CORS for the frontend
origin. Restart Vite when changing environment variables.

Connect using a valid Backend JWT. In a development build, the connection form
also supports the server's manually configured WardDevelopment:AccessKey. The
Backend binds that development session to its configured active ward user, not
the mock identity selected in the rest of the frontend. That key is not stored.
Do not put access tokens or signing/development secrets in VITE_* variables.

The page shows the real account name and ward returned by /api/ward/me, supports
explicit disconnect, and clears the session when the server returns 401. Query
keys are scoped to the API session to avoid carrying records across accounts.

## Screens

- Three paginated lists show database records, loading/error/retry and empty states.
- Proposal review includes explicit address search, manual coordinates, an
  OpenStreetMap link, ward geofence verification and saving a pending proposal pin.
- Conflict review offers queue or rejection; no automatic takeover of the
  occupied slot or release of the previous contract.
- Transfer review displays both parties, preserved term and outstanding balance.
- All decisions require a reason and confirmation; the UI displays server-provided
  blockers and allowed actions. On conflict it reloads current data.
- The previous three mock review screens now delegate to the real review component.
  Open real records through `/ward/inbox/reviews`; demo IDs are not valid
  database IDs.
- The Ward dashboard and inbox link to the new workspace. Other existing mock
  modules and their data remain independent.

See StreetBiz-BE/docs/ward-slot-workflows.md for database prerequisites, JWT
configuration, development setup, verified boundary geometry and all endpoints.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Tests check authenticated API requests, stale-state errors, expired sessions,
coordinate validation, re-verification after coordinate changes, required review
reasons, confirmation and server-side approval restrictions.
