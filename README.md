## Assignment 1 — Integration Testing & Test Database

This assignment focuses on testing the NestJS API through its HTTP layer using Supertest and a dedicated PostgreSQL test database.

The goal is to verify API behavior, validation, authentication, error handling, test isolation, and safe test database usage without affecting the development database.

---

## Assignment Requirements

### W1 — Separate Test Database

- Uses a dedicated PostgreSQL database named `week10_test`.
- Test configuration is stored in `.env.test`.
- The development database is not used by the E2E test suite.
- Database migrations are executed automatically before the E2E suite.
- A safety guard prevents tests from running against a non-test database.

### W2 — Test Isolation

- Database data is reset after every integration test.
- Tables are truncated with `RESTART IDENTITY CASCADE`.
- Tests can run independently without depending on data created by previous tests.
- Repeated test runs produce consistent results.

### C1 — HTTP Create → Read

Tests the complete HTTP flow for creating and reading a project:

1. Authenticate a test user.
2. Create a project through the API.
3. Verify HTTP `201 Created`.
4. Verify the response body.
5. Read the created project through the API.
6. Verify the returned project data.

The test application is bootstrapped once using Nest's `Test.createTestingModule`.

The E2E application also uses the same global validation configuration as the main application:

- `ValidationPipe`
- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

### C2 — Validation & Authentication Errors

Tests that:

- Invalid request bodies return `400 Bad Request`.
- Protected project write operations without authentication return `401 Unauthorized`.
- Error responses follow the application's standard error structure.

### C3 — Not Found Handling

Tests that valid-format but nonexistent project IDs return `404 Not Found` for:

- `GET`
- `PATCH`
- `DELETE`

The tests also verify the standard error response structure.

### C4 — Test Independence

Tests are designed so that one test does not depend on data created by another test.

Reusable integration helpers are provided for:

- User registration
- User login
- Registering and logging in
- Standard error-shape assertions

The database is reset after each test.

The suite was also executed with randomized Jest ordering to verify test independence.

---

## Optional Requirements

### X1 — Combined Filters

Tests that multiple filters are combined using **AND semantics**.

The test verifies filtering by:

- Project ID
- Task status

Only records satisfying both conditions are returned.

### X2 — Unknown DTO Fields

Tests that an unknown request property is rejected because the API uses:

```text
whitelist: true
forbidNonWhitelisted: true
```

The test also verifies that the rejected request does not create a database record.

### X3 — Test Database Safety Guard

The E2E setup explicitly checks that the database is:

```text
week10_test
```

If another database is configured, the test suite refuses to start.

Example verified behavior:

```text
Refusing to run E2E tests against database "week6_assign1".
Expected "week10_test".
```

This protects the development database from accidental test execution.