# SDE-1 Full Stack Assignment — Order Management System

## Overview

This is a small order management application with a **React** frontend, **Node.js/Express** API, and **PostgreSQL** database. The app allows you to view orders, create new orders, and search customers.

The codebase is functional but has **several bugs, security issues, and architectural problems**. Your job is to find them, fix the critical ones, extend the app with a new feature, and improve the deployment setup.

---

## Getting Started

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Database**: PostgreSQL on port 5432 (user: `admin`, password: `admin123`, db: `orderdb`)

The database is seeded with sample customers, products, and orders.

---

## Your Tasks

### Task 1: Bug Report (Document)

Review the entire codebase — backend, frontend, and infrastructure. Find at least **5 issues** (bugs, security vulnerabilities, performance problems, or bad practices).

For each issue, write:
- **What** the issue is
- **Where** it is in the code (file + line or function)
- **Why** it matters (impact — security, performance, correctness, reliability)
- **How** you would fix it

Submit this as a `BUG_REPORT.md` file in the repo root.

### Task 2: Fix Critical Issues

Fix the following from your bug report (or any three critical issues you identified):
1. The most serious **security vulnerability** you found
2. The most impactful **performance issue**
3. Any **data integrity / correctness** bug

Commit each fix separately with a clear commit message explaining the fix.

### Task 3: Build a Feature — Order Cancellation

Add the ability to **cancel an order** with the following requirements:

- New API endpoint to cancel an order
- An order can only be cancelled if its status is `pending` or `confirmed`
- Orders that are `shipped` or `delivered` **cannot** be cancelled
- When an order is cancelled, the product inventory must be **restored** (rolled back)
- Add a "Cancel" button in the frontend order list for eligible orders
- Show a confirmation dialog before cancelling
- Handle errors gracefully on both frontend and backend

### Task 4: Improve Deployment (Pick One)

Choose **one** of the following:

**Option A:** Add a GitHub Actions CI pipeline (`.github/workflows/ci.yml`) that runs on pull requests and performs:
- Linting (add ESLint to the backend)
- A basic health check test against the containerized app

**Option B:** Improve the Dockerfiles and docker-compose.yml to be more production-ready. Document what you changed and why in a `DEPLOYMENT.md` file.

---

## Submission

1. Fork this repo (you should already have access to a private fork)
2. Create a branch named `solution/<your-name>`
3. Commit your work with clear, descriptive commit messages
4. Open a Pull Request against `main`

Your PR should include:
- `BUG_REPORT.md`
- Fixes with separate commits
- The cancellation feature
- Your deployment improvement (Option A or B)
- Any optional `DEPLOYMENT.md` or other docs you want to include

---

## Evaluation Criteria

We're looking for:
- **Code reading ability**: Can you identify real problems in existing code?
- **Judgment**: Do you prioritize the right issues?
- **Implementation quality**: Are your fixes correct and clean?
- **Communication**: Can you explain technical issues clearly?
- **Practical thinking**: Does your code work in the real world (error handling, edge cases)?

We are **not** looking for:
- Rewriting the entire app from scratch
- Adding unnecessary libraries or frameworks
- Over-engineering the solution

---

## Timeline

You have **4 days** from receiving this repo. If you need more time, let us know — we'd rather see quality work than rushed code.

Good luck!
