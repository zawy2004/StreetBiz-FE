# API integration plan

No API integration is implemented in this foundation.

## Contract source

- StreetBiz-BE Swagger/OpenAPI is the only source of truth for REST endpoints and
  payload schemas.
- The frontend must not infer endpoint paths, request shapes, response envelopes,
  enum values, error codes, authentication headers, or SignalR hubs.
- API types and clients will be generated from the approved versioned OpenAPI
  document in a later phase.
- Generated files will be separated from handwritten adapters and will not be
  manually edited.

## Future integration layers

When a backend contract is available:

1. Pin or archive the approved OpenAPI document/version.
2. Generate TypeScript schema/types under src/core/api.
3. Add a thin transport adapter with timeout, cancellation, and safe error
   normalization.
4. Add authentication only from the approved backend scheme.
5. Add React Query hooks inside the owning feature, not in the foundation.
6. Test ownership, ward scope, expired session, offline, and provider-failure
   behavior.

Axios, React Query, SignalR, Zustand, React Hook Form, and Zod are installed but
unused until this work is explicitly requested.

## Local addressing

- Web running on the development computer may use localhost.
- Android Emulator reaches the host computer through 10.0.2.2.
- A physical Android or iOS device uses the LAN IP address of the computer
  running StreetBiz-BE.
- iOS Simulator on macOS can normally reach a host service through localhost,
  subject to the backend listener and firewall configuration.

EXPO_PUBLIC_API_BASE_URL is public build-time/runtime configuration. It must
contain only the API base URL, never credentials or tokens.

## Security and reliability

- Use HTTPS outside controlled local development.
- Keep access/refresh-token handling aligned with the backend design; do not
  invent storage behavior.
- Never log OTPs, tokens, personal evidence, payment secrets, or provider keys.
- Live permit verification must not treat an offline/cache result as
  authoritative.
- External services will sit behind adapters and have timeout/fallback behavior.
- SignalR will be added only after a hub contract exists; polling or refresh must
  remain available where appropriate.
