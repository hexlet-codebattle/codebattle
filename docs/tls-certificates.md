# TLS trust stores and the October 2026 eMudhra incident

The application and Alpine runner builds require `ca-certificates>=20261020-r0`.
Development uses Node 24.22.1, Go 1.26.10 and Hex 2.5.4. Node runner build inputs
use 26.12.1 and the Go runner uses 1.27.3.

Codebattle no longer depends on Hackney or Erlang Certifi. Tzdata 1.2.2 uses
Erlang's built-in `:httpc` with the OS-trusted CA certificates on the current
OTP runtime. Sentry uses Finch, and application HTTP requests use Req/Finch.
The OS CA bundle must therefore stay updated.

Rebuild the development container with `make dev-rebuild`. Release and runner
images also need rebuilding and deploying; changing these files does not patch
already running containers or published registry images. The updated JS and Go tags must be published before deploying on another host.
Java and Kotlin builds also remove the affected trust anchors from Java’s
separate keystore. The Python runner updates pip and Certifi independently of
the OS store. Other clients with embedded trust stores still require their
own vendor security updates.

To verify a client, ordinary HTTPS must succeed and both incident test hosts
must fail with a certificate validation error:

```sh
./bin/dev curl --fail https://repo.hex.pm
./bin/dev curl --fail https://dv-g3b-emudhra.we-have-a-problem.com/
./bin/dev curl --fail https://dv-g3b-aaa-emudhra.we-have-a-problem.com/
```

The two negative probes must fail specifically during TLS verification;
a DNS error, timeout, or HTTP error does not demonstrate protection.

References:

- https://emudhra.we-have-a-problem.com/
- https://blog.mozilla.org/security/2026/10/20/protecting-firefox-users-following-the-compromise-of-emudhra-intermediate-certificates/
- https://github.com/lau/tzdata/commit/24b1bdce04d6793b2b4c09b741de0c0ea495283b
- https://curl.se/docs/caextract.html
