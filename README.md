# Week 10 — Assignment 3: Production Hardening

## Overview

This assignment focuses on preparing the Week 10 NestJS application for production by improving configuration management, request logging, health monitoring, graceful shutdown, and security-related logging.

The implementation covers:

* **W1:** Validated configuration
* **W2:** Request logging interceptor
* **C1:** Application and database health checks
* **C2:** Typed configuration and centralized environment access
* **C3:** Graceful shutdown
* **C4:** Automated hardening tests
* **X1:** Detailed health status with database timeout handling
* **X2:** Secret and credential redaction
* **X3:** Structured JSON logging with request IDs

---

# Assignment Requirements

## W1 — Validated Configuration

The application uses `@nestjs/config` with Joi validation.

Configuration is loaded centrally through the configuration module and validated when the application starts.

Required environment variables include:

* `PORT`
* `DB_HOST`
* `DB_USER`
* `DB_PASSWORD`
* `DB_NAME`
* `JWT_SECRET`
* `JWT_ACCESS_EXPIRES_IN`
* `JWT_REFRESH_EXPIRES_IN`
* `CORS_ORIGIN`

Typed numeric configuration is also validated for:

* Database port
* Application port
* Argon2 memory cost
* Argon2 time cost
* Argon2 parallelism

Invalid configuration causes the application to reject startup.

For example:

```text
PORT=abc
```

is rejected because `PORT` must be a valid numeric port.

---

# W2 — Request Logging

A global `LoggingInterceptor` was implemented.

For every HTTP request, the interceptor records:

* HTTP method
* Request path
* HTTP status
* Request duration
* Request ID

Example:

```json
{
  "requestId": "test-request-123",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "duration": 0.59
}
```

The interceptor also handles failed requests and records their HTTP status.

Example:

```json
{
  "requestId": "error-request-123",
  "method": "GET",
  "path": "/health",
  "status": 401,
  "duration": 0.77
}
```

---

# C1 — Application and Database Health Check

A dedicated `/health` endpoint was added.

```http
GET /health
```

The health endpoint checks:

1. Application availability
2. Database availability

The database check executes a real PostgreSQL query:

```sql
SELECT 1
```

A healthy response contains:

```json
{
  "status": "ok",
  "checks": {
    "application": {
      "status": "up"
    },
    "database": {
      "status": "up"
    }
  }
}
```

If the database check fails, the application reports an unhealthy state and returns HTTP `503 Service Unavailable`.

---

# C2 — Typed and Centralized Configuration

Application configuration is represented by the `AppConfig` TypeScript interface.

Configuration is accessed through NestJS `ConfigService` instead of scattering environment-variable access throughout the application.

The main application configuration contains:

```text
nodeEnv
port
database
jwt
argon2
corsOrigin
```

The database configuration contains:

```text
host
port
user
password
name
```

JWT configuration contains:

```text
secret
accessExpiresIn
refreshExpiresIn
```

Argon2 configuration contains:

```text
memoryCost
timeCost
parallelism
```

Environment variables are centralized in:

```text
src/config/configuration.ts
```

The only direct `process.env` references are inside the centralized configuration mapping.

---

# C3 — Graceful Shutdown

Graceful shutdown support was enabled in `main.ts`.

```ts
app.enableShutdownHooks();
```

This allows NestJS to respond to operating-system shutdown signals such as `SIGTERM`.

The application is configured so that NestJS lifecycle shutdown handling can complete before the process exits, allowing registered resources such as the TypeORM database connection to close cleanly.

TypeORM is configured with:

```ts
synchronize: false
```

so production database structure is not automatically modified during application startup.

The same setting is also applied to the standalone TypeORM data source.

---

# C4 — Hardening Tests

Automated tests were added for the production-hardening behavior.

Configuration validation tests verify:

* Valid configuration is accepted.
* Missing required configuration is rejected.
* Invalid `PORT` values are rejected.

Health tests verify:

* Successful database `SELECT 1` checks.
* Database query failures.
* Database timeout handling.
* Unhealthy health responses.
* HTTP `503` status when the database is unavailable.

Logging tests verify:

* Request method.
* Request path.
* Response status.
* Request duration.
* Generated request IDs.
* Supplied `X-Request-ID` handling.
* Request ID response headers.
* Error request logging.

---

# X1 — Detailed Health Status

The health endpoint provides a per-component status breakdown.

The application check reports:

```text
up
```

The database check reports either:

```text
up
```

or:

```text
down
```

A database timeout is also handled.

The database health check uses a two-second timeout:

```text
2000 ms
```

If the database does not respond within the timeout, the database is considered unhealthy.

An unhealthy health result uses:

```text
HTTP 503 Service Unavailable
```

This allows monitoring systems to distinguish between an application that is running normally and an application whose database dependency is unavailable.

---

# X2 — Secret Redaction

A dedicated `RedactingLogger` was implemented to prevent sensitive values from appearing in logs.

Sensitive keys include:

* `password`
* `token`
* `accessToken`
* `access_token`
* `refreshToken`
* `refresh_token`
* `authorization`
* `cookie`
* `set-cookie`

Sensitive values are replaced with:

```text
[REDACTED]
```

Authorization headers are also sanitized.

For example:

```text
Bearer eyJhbGciOi...
```

is logged as:

```text
Bearer [REDACTED]
```

Passwords are not logged during authentication.

The previous login debug logging was also removed so that authentication attempts do not create unnecessary credential-related log entries.

---

# X3 — Structured JSON Logging

The request logging system was extended with structured JSON logs.

Every application request log contains:

* `requestId`
* `method`
* `path`
* `status`
* `duration`

Example:

```json
{
  "requestId": "test-request-123",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "duration": 0.59
}
```

The request ID is obtained from the incoming:

```http
X-Request-ID
```

header when supplied.

If the client does not provide one, a UUID is generated automatically.

The generated/requested ID is attached to the request:

```ts
request.requestId = requestId;
```

and returned to the client:

```http
X-Request-ID: <request-id>
```

The request start time is also stored so that structured error logs can include request duration.

Unexpected HTTP errors therefore contain the same request ID and structured request information.

Example:

```json
{
  "event": "http.unhandled_exception",
  "requestId": "filter-request-123",
  "method": "GET",
  "path": "/test/error",
  "status": 500,
  "duration": 0,
  "message": "development-only diagnostic"
}
```

This makes logs easier to search and correlate across the lifetime of a request.

---

# Assignment 3 Completion

Week 10 Assignment 3 implements production hardening across configuration, logging, health monitoring, shutdown handling, and security.

The final local verification confirms:

```text
10 test suites passed
57 tests passed
0 test failures
0 lint warnings
0 lint errors
Build successful
X1 complete
X2 complete
X3 complete
```

The assignment is ready for the final Git commit and pull request after the verified changes are staged.
