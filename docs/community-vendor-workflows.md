# Community vendor screens (BUY-01–BUY-05)

Set `VITE_API_BASE_URL=http://localhost:5023/api` when StreetBiz-BE runs with
the `http` launch profile, then start the client with `npm run dev`.

| Use case | Frontend route                                     | Backend operation                                                    |
| -------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| BUY-01   | `/customer/explore`                                | Active vendor map/list, optional browser geolocation and 5 km search |
| BUY-02   | `/customer/scan`                                   | Signed permit payload verification with optional scan location       |
| BUY-03   | `/customer/explore/vendors/:vendorId`              | Live public vendor profile and community comments                    |
| BUY-04   | `/customer/explore/vendors/:vendorId/comments/new` | Customer login and rating/comment upsert                             |
| BUY-05   | `/customer/explore/vendors/:vendorId/reports/new`  | Customer login, optional evidence upload and report submission       |

Public reads and QR verification do not require login. The two write forms have
an inline Backend login and accept only an active `CUSTOMER` account. This API
session is kept in browser `sessionStorage`, separately from the legacy mock
session, so it is removed when the browser session ends.

Run all frontend checks from `StreetBiz-FE`:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```
