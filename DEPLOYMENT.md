Deployment Improvements


    Overview
        The deployment setup for this application has been improved to make it more production-ready, efficient, and maintainable. The focus was on optimizing Docker configurations, improving performance, and following modern best practices.
    

    Changes Made
        1. Optimized Docker Images
            (i) Switched base images from node:18 to node:18-alpine
            (ii) Reduced image size significantly
            (iii) Faster container startup and lower resource usage

        2. Dependency Management Improvements
            (i) Installed only production dependencies in the backend using:
            (ii) npm install --production
            (iii) Avoided unnecessary dev dependencies in production

        3. Improved Docker Layer Caching
            (i) Copied package.json and package-lock.json before application code
            (ii) This allows Docker to cache dependency installation layers
            (iii) Results in faster rebuild times

        4. Production-Ready Frontend
            (i) Built the React app using:
            (ii) npm run build
            (iii) Served static files using serve instead of the development server
            (iv) Improves performance and aligns with real-world deployment practices


        5. Environment Configuration
            (i) Added environment variables in docker-compose.yml for backend services
            (ii) Improved flexibility and separation of configuration from code

        6. Removed Deprecated Docker Compose Version
            (i) Removed the version field from docker-compose.yml
            (ii) Aligns with modern Docker Compose (v2+) standards
            (iii) Eliminates deprecation warnings

        7. Database Reliability
            (i) Configured PostgreSQL with persistent volumes
            (ii) Ensures data is retained across container restarts


    Benefits
        1. Smaller and optimized Docker images
        2. Faster build and deployment times
        3. Better performance in production
        4. Cleaner and more maintainable configuration
        5. Improved reliability and scalability


    How to Run the Application
        docker-compose up --build


    Access the application:
        1. Frontend: http://localhost:3000
        2. Backend API: http://localhost:3001/api
            ## Backend API
            Base URL:
                http://localhost:3001/api
            ### Available Endpoints
                - GET    /api/orders          → Fetch all orders
                - GET    /api/orders/:id      → Fetch single order
                - POST   /api/orders          → Create order
                - PATCH  /api/orders/:id/status → Update order status
                - POST   /api/orders/:id/cancel → Cancel order
            ### Test Example
            http://localhost:3001/api/orders
        3. Database: PostgreSQL running on port 5432
        

    Conclusion
        These improvements ensure that the application is not only functional but also follows industry-standard deployment practices, making it suitable for real-world usage and easier to scale and maintain.