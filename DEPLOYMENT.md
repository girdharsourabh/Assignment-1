## In backend/Dockerfile

    Docker Caching is added to reduce load
    installs only production dependencies

## In frontend/Dockerfile

    Build stage and Production stages are separated leading to smaller images

## In docker-compose.yml

    Improves Security by keeping sensetive variables in .env file

    postgres health check added using pg_isready leading to removal of unnecessary error where backend tries to connect before Postgres is ready.