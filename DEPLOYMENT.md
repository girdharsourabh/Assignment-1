# Deployment Documentation

## CI/CD Pipeline

This project includes a GitHub Actions CI pipeline that automatically runs on pull requests and pushes to the main/master branch.

### Pipeline Overview

The CI pipeline consists of two jobs:

#### 1. Lint Job
- **Purpose**: Ensures code quality and consistency
- **What it does**:
  - Checks out the code
  - Sets up Node.js 18
  - Installs backend dependencies
  - Runs ESLint on backend code

#### 2. Health Check Job
- **Purpose**: Validates that the application runs correctly in a containerized environment
- **What it does**:
  - Builds and starts all Docker containers (frontend, backend, database)
  - Waits for services to be ready (60-second timeout)
  - Tests the backend health endpoint (`/api/health`)
  - Tests database connectivity via the orders endpoint
  - Shows container logs if any test fails
  - Cleans up containers after tests

### ESLint Configuration

ESLint has been added to the backend with the following setup:

**File**: `backend/.eslintrc.json`
```json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "semi": ["error", "always"],
    "quotes": ["error", "single", { "avoidEscape": true }]
  }
}
```

**Rules enforced**:
- Semicolons are required
- Single quotes preferred (with escape allowance)
- Unused variables trigger warnings
- Console statements are allowed (for server logging)

### Running Locally

#### Run linting:
```bash
cd backend
npm install
npm run lint
```

#### Run health checks manually:
```bash
# Start containers
docker-compose up -d --build

# Wait for services
sleep 10

# Test health endpoint
curl http://localhost:3001/api/health

# Test database connectivity
curl http://localhost:3001/api/orders

# Clean up
docker-compose down -v
```

### CI Pipeline Workflow

1. **On Pull Request**: Pipeline runs automatically
2. **Lint Check**: Code must pass ESLint rules
3. **Health Check**: Application must start and respond correctly
4. **Failure Handling**: Container logs are displayed for debugging
5. **Cleanup**: All containers are removed after tests

### Benefits

- **Early Bug Detection**: Catches syntax and style issues before merge
- **Deployment Validation**: Ensures Docker setup works correctly
- **Database Connectivity**: Verifies backend can connect to PostgreSQL
- **Automated Testing**: No manual intervention required
- **Fast Feedback**: Developers know immediately if their changes break the build

### Future Improvements

Potential enhancements for the CI pipeline:
- Add unit tests for backend routes
- Add frontend linting (ESLint for React)
- Add integration tests for API endpoints
- Add code coverage reporting
- Add security scanning (npm audit, Snyk)
- Add performance testing
- Deploy to staging environment on successful builds
