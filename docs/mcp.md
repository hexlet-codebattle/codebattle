# Codebattle MCP

The Streamable HTTP endpoint is `/mcp`. There are 26 tools covering the Public API's
JSON operations, the event leaderboard and a snapshot of the event stream's state.
The transport uses `hermes_mcp` 0.14.1 and negotiates the protocol versions supported
by that SDK. There is no standalone GET event stream on `/mcp`.

## Tools and permissions

| Scope | Tools |
| --- | --- |
| `read` | `get_me`, `get_active_game`, `list_my_games`, `list_my_tournaments`, `list_invites`, `list_tasks`, `list_live_games`, `list_online_users` |
| `read` | `list_tournament_schedule`, `list_live_tournaments`, `get_tournament`, `get_tournament_ranking`, `get_event_leaderboard`, `get_my_state` |
| `games:write` | `create_game`, `join_game`, `cancel_game`, `create_invite`, `accept_invite`, `cancel_invite`, `join_tournament`, `leave_tournament` |
| `tournaments:write` | `create_tournament`, `update_tournament`, `start_tournament`, `cancel_tournament` |

Arguments use the Public API field names, including `id` for a path parameter.
Descriptions, parameter schemas and scopes for the versioned JSON API are derived
from `priv/openapi/public_api_v1.json`. A route parity test catches missing tools.
Tool results include both text JSON and `structuredContent`; domain failures set
`isError: true` and retain the Public API's `error.code`, `message` and `details`.
Unknown tools produce a JSON-RPC error.

Tools run the same allowlisted controller actions and scope plugs as REST, using
an in-memory response adapter. Validation, visibility, ownership checks and quotas
are shared; MCP writes are audited against the OAuth connection in the same ledger
as personal API tokens. There is no internal HTTP call or synthetic personal token.

`get_my_state` returns the current `hello` snapshot from `/me/events`: profile,
active game, invites and tournaments. It does not subscribe to future events;
call it again to refresh. The existing Public API SSE endpoint remains available
to personal-token clients. `list_invites` supports `version` and a bounded `wait`
of up to 30 seconds, like REST. Waiting happens in the HTTP request process, outside
Hermes' shared server process, with credentials revalidated after the wait.

## Connect

Add `https://<your-codebattle-host>/mcp` to an MCP client that supports OAuth
discovery, dynamic registration and public clients with PKCE. The client opens
Codebattle in the browser. Sign in using your existing account, review the
application's name, return address and requested permissions, then allow access.
No personal API token or client secret needs to be copied.

Existing `read` connections keep their original permissions. Refresh the client's
tool list (or reconnect) to discover the new tools. To create games/invites or join
tournaments, request `read games:write`; for tournament management request
`read games:write tournaments:write` and approve the new OAuth request. Merely
refreshing a token never expands its scopes. If a tool needs additional permission,
the endpoint responds with HTTP 403 and an OAuth `insufficient_scope` challenge
identifying the required scope, so clients supporting step-up can ask for consent.
The initial connection still defaults to `read`. Write scopes retain the Public
API's account-age restrictions.

Review and disconnect applications at **Settings → Connected applications**.
Signing out of the website leaves those connections active. Disconnecting,
changing/resetting the password, archiving or banning the account blocks access.
Scopes never replace the application's normal ownership/role checks.

## OAuth profile

- Authorization server metadata: `/.well-known/oauth-authorization-server`.
- Protected resource metadata: `/.well-known/oauth-protected-resource/mcp`
  (also available at `/.well-known/oauth-protected-resource`).
- Dynamic client registration: `POST /oauth/register`, JSON metadata with
  `redirect_uris`, optional `client_name`, `token_endpoint_auth_method: "none"`.
  Only `authorization_code` and `refresh_token` grants are supported.
- Authorization: `GET /oauth/authorize`, `response_type=code`, registered
  `client_id` and exact `redirect_uri`, `resource=<canonical MCP URL>`,
  `code_challenge_method=S256`, `code_challenge`, optional `scope` and `state`.
  The default scope is `read`. Authorization responses preserve `state` and
  include `iss`. Invalid requests never redirect to an unvalidated URI.
- Consent: CSRF-protected `POST /oauth/authorize`, using a signed request bound
  to the current account and valid for ten minutes. GET never grants access.
- Token exchange: `POST /oauth/token`, form encoded. Send `grant_type`,
  `client_id`, `resource` and either `code`, `redirect_uri`, `code_verifier`, or
  `refresh_token`. There is no client secret or HTTP Basic authentication.
- Revocation: `POST /oauth/revoke`, form encoded `client_id` and `token`.
- MCP requests: `Authorization: Bearer <access_token>` on every request.
  Website cookies and personal `cbp_` tokens are not accepted as MCP credentials.

The authorization layer implements this restricted profile directly using Ecto,
Phoenix's signed envelopes/CSRF protection and Plug's constant-time comparison.
It does not introduce a separate identity service or a general OpenID provider.
Client ID Metadata Documents and confidential-client authentication are not
implemented; clients must support the advertised registration/authentication method.

Authorization codes live for two minutes, access tokens for fifteen minutes and
refresh families for thirty days from consent (an absolute expiry). Refresh
tokens rotate on every use. Replaying an already consumed code with valid PKCE,
or an already consumed refresh token, revokes the entire connection. Clients
must serialize refresh attempts. Only hashes of codes and tokens are stored.
Connection row locks serialize issuance, refresh and revocation.
Expired families and connections revoked more than a day ago are deleted daily.

## Deployment

Run the database migrations before serving the updated application (`make db-migrate`).
The canonical issuer and resource URLs come from `CodebattleWeb.Endpoint.url()`;
configure its public HTTPS URL correctly behind the ingress. OAuth callbacks allow
HTTPS and HTTP loopback addresses, with exact redirect matching and no fragments.

Browser Origin headers default to the canonical Codebattle origin. If a browser
client is supported, configure `:codebattle, :mcp_allowed_origins` explicitly for
its trusted origins and configure the ingress's CORS policy for that client.
Native clients may omit Origin. Do not add wildcard origins.

OAuth endpoints have per-IP budgets, including ten registrations per minute;
authenticated MCP requests share Public API's per-user request budget. These
Cachex budgets are local to each application node. Add ingress limits when running
multiple replicas. `public_api_disabled` blocks MCP access;
`public_api_writes_disabled` blocks mutation tools but does not block reading tools
or protocol initialization/discovery over POST. Scopes are checked per tool call,
so a `games:write`-only connection can initialize and use its tools without `read`.

MCP session IDs are signed and bound to the OAuth connection, not used as
authentication. OAuth credentials are removed from the context passed to Hermes,
and OAuth parameters are filtered from Phoenix request logs.
Hermes' raw payload logging is disabled because tool arguments and results may
contain private tournament invite tokens; Phoenix request logs and write audits
remain enabled.

## Verification

`./bin/dev mix test test/codebattle_web/controllers/mcp`
exercises consent, login redirects, CSRF, discovery, PKCE/audience/client binding,
expiry, refresh rotation/replay, revocation, account restrictions and authenticated
MCP initialization/tool calls with session isolation, API parity, write scopes,
shared quotas/audit, private tournament lifecycle, invites and long polling.
Final repository checks are
`make test`, `make credo`, `make dialyzer`, `make test-fe` and `make lint-js`.
