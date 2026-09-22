# Coding Pixel Internship — Week 10

## Testing & Production Hardening

Week 10 is the final week of the backend phase of the CMIT Full-Stack Internship Program delivered by Coding Pixel.

The focus of this week is to prove that the NestJS API works correctly through its HTTP surface, verify complete user journeys, enforce meaningful test coverage, and prepare the service for production operation.

## Week 10 Objectives

* Integration testing with Supertest
* Separate test database configuration
* Database migrations for testing
* Test isolation and data reset between tests
* HTTP-level testing of protected API routes
* Testing `400`, `401`, and `404` error paths
* End-to-end testing of a complete application journey
* Refresh-token flow testing
* Role-based authorization testing
* Logout and token invalidation testing
* Jest coverage threshold enforcement
* Production configuration validation
* Request logging
* Database-aware `/health` endpoint
* Graceful application shutdown

## Assignments

### Assignment 1 — Integration Tests with Supertest

Build integration tests against the HTTP surface of the NestJS API using a separate test database.

Key requirements:

* Separate test database
* Run migrations before the test suite
* Reset test data between tests
* Test the API through HTTP requests
* Test successful resource creation and retrieval
* Test `400` validation errors
* Test `401` unauthorized requests
* Test `404` not-found responses
* Keep tests independent
* Share setup through reusable helpers or factories

### Assignment 2 — End-to-End Flow & Coverage

Implement a complete end-to-end application journey.

The main flow covers:

1. Register
2. Login
3. Create a project
4. Create a task inside the project
5. Add a comment to the task
6. Refresh the access token
7. Continue using the protected API with the new token

The flow also verifies:

* Intermediate application state
* `403` authorization behavior for a viewer attempting a write
* `401` behavior after logout
* Refresh-token functionality
* A minimum **70% statement coverage threshold on services**
* Tests that meaningfully fail when their expected behavior is broken

### Assignment 3 — Production Hardening

Prepare the backend for production operation.

Key requirements:

* Environment variable schema validation
* Typed configuration access
* Request logging interceptor
* Method, path, status, and duration logging
* Database-aware `GET /health`
* Graceful shutdown with `enableShutdownHooks`
* Automated test for a production-hardening behavior

## Technology Stack

* NestJS
* TypeScript
* PostgreSQL
* TypeORM
* Jest
* Supertest
* JWT Authentication
* `@nestjs/config`

## Week 10 Deliverables

By the end of Week 10, the backend should have:

* A dedicated test database
* Reliable HTTP integration tests
* A complete end-to-end test flow
* Coverage enforcement
* Authentication and authorization test coverage
* Validated application configuration
* Request logging
* A database-aware health endpoint
* Graceful shutdown handling
* Passing automated tests