# Platform administration workflows

The platform workspace now connects ADM-01 and ADM-03 through ADM-05 to live
StreetBiz-BE APIs. The existing demo role session still controls navigation;
the workflow uses a separate backend JWT session so a mock role switch can
never grant backend administrator permissions.

## Routes

| Use case  | Frontend route                                 | Purpose                                                            |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| ADM-01    | `/platform/categories`                         | List, create, rename and delete unused food categories.            |
| ADM-03/04 | `/platform/moderation`                         | Open the reported-content and complaint queues.                    |
| ADM-03/04 | `/platform/moderation/content/:reportId`       | Inspect, dismiss or soft-hide reported content.                    |
| ADM-05    | `/platform/moderation/complaints/:complaintId` | Resolve/reject an order complaint and optionally request a refund. |

Opening one of these pages without a valid platform backend session displays a
login form. The account returned by `/api/auth/login` must have role
`PLATFORM_ADMIN`; `/api/platform/me` revalidates persisted sessions on page
load. Tokens are stored in session storage and are cleared when the API returns
HTTP 401.

The detail pages send the record's current status back as `expectedStatus`.
HTTP 409 means another administrator already processed the record, so the page
must be refreshed. Refund input accepts whole VND only and is capped in the UI;
the Backend enforces the authoritative limit again.

## Run and verify

Set `VITE_API_BASE_URL` to the Backend URL including `/api`, then run:

```powershell
npm run dev
```

Quality checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```
