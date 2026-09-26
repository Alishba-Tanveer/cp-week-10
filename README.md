# Week 10 — Assignment 2
## End-to-End Flow and Coverage Threshold

This assignment implements and verifies a complete end-to-end product journey and adds a service-level test coverage quality gate.

The flow is tested from a clean database and covers authentication, project creation, task creation, comments, token refresh, authorization, and logout behavior.

---

## Assignment Objectives

- Build a realistic end-to-end user journey.
- Verify intermediate data at every important step.
- Continue the journey after refreshing the access token.
- Verify denied authorization and authentication branches.
- Enforce a minimum service statement coverage threshold.
- Prove that tests fail when protected behavior is broken.
- Publish coverage reports through CI.
- Improve coverage by testing a real previously uncovered branch.
- Verify that the E2E flow is repeatable and does not depend on test order.

---

# Warm-Up

## W1 — Complete Product Journey

The E2E flow in:

`test/assignment2.e2e-spec.ts`

covers the following journey:

1. Register a new owner.
2. Log in as the owner.
3. Create a project.
4. Create a task inside the created project.
5. Read the task back.
6. Add a comment to the task.
7. Read the comments back.
8. Refresh the authentication tokens.
9. Continue using the new access token.
10. Register and log in a second user.
11. Add the second user as a project viewer.
12. Verify that the viewer cannot create a task.
13. Log out the owner.
14. Attempt to reuse the rotated refresh token.
15. Verify that the request is rejected.

The access token is stored and reused throughout the protected part of the journey. The flow does not perform a new login before each protected request.

The test passes from a clean database.

## W2 — Intermediate State Assertions

The E2E test verifies the data produced at each important stage rather than checking only HTTP status codes.

Examples:

- Registration verifies the returned user identity.
- Login verifies the access and refresh tokens.
- Project creation verifies the project ID, name, and owner.
- Task creation verifies the task ID, title, and `projectId`.
- The created task is read back and verified against the project.
- Comment creation verifies the comment ID, `taskId`, and `authorId`.
- Comments are read back and verified against the created task.
- The refresh operation verifies that new tokens are returned.
- The protected request after refresh verifies that the new access token works.
- Viewer task creation verifies the `403 Forbidden` response.
- Refresh-token reuse after logout verifies the `401 Unauthorized` response.

---

# Core Requirements

## C1 — Token Refresh During the Flow

The E2E journey performs a token refresh after the comment step.

The returned access token replaces the previous access token, and the following protected request uses the refreshed token.

The test also verifies refresh-token rotation by checking that a new refresh token is returned.

The protected request after the refresh succeeds, proving that the refreshed access token can continue the user's journey.

---

## C2 — Denied Authorization and Authentication Branches

The same E2E flow tests both denied branches.

### Viewer Authorization

A second user is registered and added to the project with:

`ProjectMemberRole.VIEWER`

The viewer then attempts to create a task.

Expected result:

`403 Forbidden`

This verifies that project-level viewer permissions prevent write operations.

### Logout / Refresh Token Reuse

After completing the normal journey, the owner logs out using the current access token and rotated refresh token.

The test then attempts to reuse the refresh token.

Expected result:

`401 Unauthorized`

This verifies that the refresh token is invalidated after logout.

Both denied branches are asserted inside the same Assignment 2 E2E flow.

---

# C3 — Coverage Threshold

Jest coverage is configured in:

`jest.config.ts`

Coverage collection is scoped to the service files:

- `src/auth/auth.service.ts`
- `src/comments/comments.service.ts`
- `src/projects/projects.service.ts`
- `src/tasks/tasks.service.ts`

The configuration enforces a minimum global statement coverage of:

`70%`

Example configuration:

```ts
collectCoverageFrom: [
  'src/auth/auth.service.ts',
  'src/comments/comments.service.ts',
  'src/projects/projects.service.ts',
  'src/tasks/tasks.service.ts',
],

coverageThreshold: {
  global: {
    statements: 70,
  },
},
```

This makes coverage a test quality gate. If the configured threshold is not satisfied, the Jest command fails.

### Coverage Verification

Final coverage results:

| Metric | Result |
|---|---:|
| Statements | **91.34%** |
| Branches | **79.05%** |
| Functions | **93.10%** |
| Lines | **90.95%** |

Required service statement coverage:

**70%**

Current service statement coverage:

**91.34%**

The project is therefore above the required coverage threshold.

Coverage command:

```bash
npm test -- --runInBand --coverage
```

---

# C4 — Tests Proven to Fail

Three meaningful tests were manually verified by breaking the production behavior they protect.

The behavior was temporarily broken, the corresponding test was run and failed, and the production code was then restored.

The demonstrated behaviors were:

1. Task creation correctly rejects a nonexistent project.
2. A viewer cannot perform a protected write operation.
3. A logged-out/revoked refresh token cannot be reused.

This confirms that the tests are protecting actual application behavior rather than merely increasing the coverage percentage.

All production changes used for the failure demonstrations were restored before the final verification.

---

# Challenge

## X1 — Publish Coverage From CI

GitHub Actions was extended to run the test suite with coverage and upload the generated coverage directory as a CI artifact.

Workflow:

`.github/workflows/security.yml`

The workflow includes:

```yaml
- name: Run tests with coverage
  run: npm test -- --runInBand --coverage

- name: Upload coverage report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
    if-no-files-found: error
```

The `coverage-report` artifact can be accessed from the GitHub Actions workflow run.

The workflow also continues to run the dependency audit:

```bash
npm audit --audit-level=high
```

---

# X2 — Honest Coverage Improvement

The HTML coverage report identified an uncovered branch in:

`src/tasks/tasks.service.ts`

The uncovered behavior was the partial-update branch where `title` is omitted:

```ts
if (updateTaskDto.title !== undefined) {
  task.title = updateTaskDto.title;
}
```

A real regression test was added:

`preserves the existing title when title is omitted`

The test performs a partial task update without providing a title and verifies that:

- the existing title is preserved,
- the supplied description is updated,
- existing status remains unchanged,
- existing priority remains unchanged,
- the task is saved correctly.

This exercises the previously uncovered branch.

TasksService branch coverage increased from:

`91.93% → 93.54%`

This was an actual branch-coverage improvement rather than additional assertions on an already-covered path.

---

# X3 — Repeatability and Flakiness

The complete E2E test suite was executed three consecutive times.

### Run 1

```text
Test Suites: 4 passed, 4 total
Tests:       54 passed, 54 total
```

### Run 2

```text
Test Suites: 4 passed, 4 total
Tests:       54 passed, 54 total
```

### Run 3

```text
Test Suites: 4 passed, 4 total
Tests:       54 passed, 54 total
```

The suite also executed with different test-suite ordering between runs.

The E2E tests reset the database after each test using the test database reset helper. This prevents shared database state from one test from affecting another.

The tests use the in-process Nest application with Supertest rather than depending on a fixed application port, avoiding fixed-port conflicts.

Command used:

```bash
npm run test:e2e -- --runInBand
```

---

# Final Verification

The following commands were run successfully before submission:

## Unit Tests + Coverage

```bash
npm test -- --runInBand --coverage
```

Result:

```text
Test Suites: 6 passed, 6 total
Tests:       42 passed, 42 total
Statements:  91.34%
Branches:    79.05%
Functions:   93.10%
Lines:       90.95%
```