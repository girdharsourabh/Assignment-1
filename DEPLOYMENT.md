# Deployment Improvements (Option B)

I chose to optimize the Docker configuration to make the application production-ready. The original setup was running development servers and using heavy base images which is not suitable for a real-world deployment. 

Here are the specific architectural changes I made:

## 1. Multi-Stage Frontend Build with Nginx
I noticed the original frontend Dockerfile was using `react-scripts start` to run the app. This is a heavy development server and shouldnt be used in production. I rewrote the Dockerfile to use a multi-stage build:
* *Stage 1:* It uses Node to install dependencies and compile the React code into static files (`npm run build`).
* *Stage 2:* It drops the Node environment entirely and uses a lightweight Nginx web server to serve the compiled static assets on port 80.
This completely removes all development tooling from the final container, making it much faster and more secure.

## 2. Alpine Node Images
I swapped the base images for both the frontend and backend from the default Node image to `node:18-alpine`. The standard Node images include a lot of unnecessary OS level utilities. By switching to Alpine Linux, I significantly reduced the overall size of the containers. This means faster pull times, lower storage costs, and a smaller attack surface for security vulnerabilities.

## 3. Strict Production Environments
To ensure the backend behaves correctly in a production environment, I explicitly set `NODE_ENV=production` inside the backend `Dockerfile` and the `docker-compose.yml` file. I also updated the install command to `npm install --omit=dev`. This guarantees that heavy development dependencies (like nodemon or testing libraries) are not installed in the runtime container, keeping the memory footprint as low as possible.