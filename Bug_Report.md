# Task 1: Bug Report and Analysis

## Overview
Task 1 required a comprehensive review of the codebase (frontend, backend, and infrastructure) to identify at least 5 issues ranging from bugs and security vulnerabilities to performance and architectural problems.

## Solving Approach
1. **Static Analysis**: I performed a manual walk-through of the backend source code, specifically looking at:
   - Route handlers for database interactions.
   - Database connection management.
   - Middleware and error handling.
2. **Security Audit**: Identified a classic SQL injection vulnerability in the customer search feature where user input was directly concatenated into a query string.
3. **Performance Profiling**: Noticed an N+1 query pattern in the order listing logic, which is a common bottleneck in database-driven applications.
4. **Data Integrity Check**: Analyzed the order creation flow and found that it lacked transactional integrity, making it susceptible to race conditions and inconsistent states.
5. **Architectural Review**: Evaluated the error handling and input validation strategies, finding them insufficient for a production-ready application.


