Task 1: Bug Report - Order Management System (Full Codebase)

SECTION A: BACKEND BUGS

Issue 1: SQL Injection Vulnerability in Customer Search
What the issue is:
The customer search endpoint directly concatenates user input into SQL queries without any sanitization or parameterization, making it vulnerable to SQL injection attacks.

Where it is in the code:
File: backend/src/routes/customers.js
Function: router.get('/search') - Lines 19

const { name } = req.query;
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
const result = await pool.query(query);

Why it matters (impact):
This is a CRITICAL SECURITY VULNERABILITY because:

Attackers can inject malicious SQL code through the search parameter

They can delete entire tables by searching for: ' OR 1=1; DROP TABLE customers; --

They can steal sensitive customer data (emails, phone numbers)

They can bypass authentication and access restrictions

They can potentially gain access to the entire database

How to fix it:
Use parameterized queries with placeholders instead of string concatenation:

router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const result = await pool.query(
      'SELECT * FROM customers WHERE name ILIKE $1 ORDER BY name',
      [`%${name}%`]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

Issue 2: N+1 Query Problem in Orders Fetch
What the issue is:
When fetching all orders, the code first gets all orders and then makes separate queries for each order to fetch customer and product details. This creates an N+1 query problem.

Where it is in the code:
File: backend/src/routes/orders.js
Function: router.get('/') - Lines 8-24

const ordersResult = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
const orders = ordersResult.rows;

// Fetch customer and product details for each order individually
const enrichedOrders = [];
for (const order of orders) {
  const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [order.customer_id]);
  const productResult = await pool.query('SELECT name, price FROM products WHERE id = $1', [order.product_id]);

  enrichedOrders.push({
    ...order,
    customer_name: customerResult.rows[0]?.name || 'Unknown',
    customer_email: customerResult.rows[0]?.email || '',
    product_name: productResult.rows[0]?.name || 'Unknown',
    product_price: productResult.rows[0]?.price || 0,
  });
}

Why it matters (impact):
This is a MAJOR PERFORMANCE ISSUE because:

For N orders, the code makes 2N+1 database queries

With 100 orders: 1 query for orders + 100 for customers + 100 for products = 201 total queries

As order count grows, API response time increases linearly

Database connection pool can be exhausted quickly

Can cause timeout errors for users when there are many orders

How to fix it:
Use a single SQL query with JOINs to fetch all data at once:

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.customer_id,
        o.product_id,
        o.quantity,
        o.total_amount,
        o.shipping_address,
        o.status,
        o.created_at,
        o.updated_at,
        c.name as customer_name,
        c.email as customer_email,
        p.name as product_name,
        p.price as product_price
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      INNER JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

Issue 3: Missing Database Transaction in Order Creation

What the issue is:
When creating an order, the code first inserts the order and then updates the inventory. These two operations are not wrapped in a database transaction, so if one fails, the data becomes inconsistent.

Where it is in the code:
File: backend/src/routes/orders.js
Function: router.post('/') - Lines 54-77

// Check inventory
const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
if (productResult.rows.length === 0) {
  return res.status(404).json({ error: 'Product not found' });
}

const product = productResult.rows[0];

if (product.inventory_count < quantity) {
  return res.status(400).json({ error: 'Insufficient inventory' });
}

const total_amount = product.price * quantity;

// Create order
const orderResult = await pool.query(
  `INSERT INTO orders ... RETURNING *`,
  [customer_id, product_id, quantity, total_amount, shipping_address]
);

// Decrement inventory
await pool.query(
  'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
  [quantity, product_id]
);

Why it matters (impact):
This is a CRITICAL DATA INTEGRITY ISSUE because:

If the server crashes AFTER creating the order but BEFORE updating inventory, data becomes inconsistent

Order is recorded but inventory is NOT reduced

This leads to overselling - multiple orders can be placed for the same limited stock

Financial records will show revenue from orders that shouldn't exist

Customer satisfaction drops when orders can't be fulfilled

How to fix it:
Use database transactions with row-level locking:

router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { customer_id, product_id, quantity, shipping_address } = req.body;

    // Input validation
    if (!customer_id || !product_id || !quantity || !shipping_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    await client.query('BEGIN');

    // Check inventory with row lock
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );
    
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    if (product.inventory_count < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const total_amount = product.price * quantity;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders 
        (customer_id, product_id, quantity, total_amount, shipping_address, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW()) 
       RETURNING *`,
      [customer_id, product_id, quantity, total_amount, shipping_address]
    );

    // Decrement inventory
    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1, updated_at = NOW() WHERE id = $2',
      [quantity, product_id]
    );

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

Issue 4: Improper Error Handler Masking All Errors
What the issue is:
The global error handler catches all errors but returns a 200 OK status with { success: true }, completely hiding that an error occurred.

Where it is in the code:
File: backend/src/index.js
Lines: 23-26

app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});

Why it matters (impact):
This is a CRITICAL OPERATIONAL ISSUE because:

All errors return 200 OK status code, making clients think everything succeeded

When database connection fails → API returns { success: true }

When order creation fails → API returns { success: true }

When route is not found (404) → API returns { success: true }

No error details are logged, making debugging impossible

Production issues cannot be diagnosed

How to fix it:
Implement proper error handling middleware:

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.url,
    method: req.method
  });
});

// Global error handler - FIXED
app.use((err, req, res, next) => {
  console.error('=================================');
  console.error('ERROR:', err.message);
  console.error('Stack:', err.stack);
  console.error('URL:', req.url);
  console.error('Method:', req.method);
  console.error('=================================');
  
  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({ 
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

Issue 5: Hardcoded Database Credentials
What the issue is:
Database connection credentials (username, password, database name) are hardcoded directly in the source code.

Where it is in the code:
File: backend/src/config/db.js
Lines: 4-10

const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  host: 'db',
  port: 5432,
  database: 'orderdb',
});

Why it matters (impact):
This is a HIGH SECURITY VULNERABILITY because:

Database passwords are exposed in source code

Anyone with access to the codebase can see the database password

Cannot use different credentials for different environments

If password is compromised, changing it requires code change

Accidental exposure on public repositories can lead to data breach

How to fix it:
Use environment variables with proper configuration:

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orderdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;

SECTION B: FRONTEND BUGS

Issue 6: React useEffect Missing Dependency
What the issue is:
A useEffect hook is missing a dependency, causing it not to run when that dependency changes.

Where it is in the code:
File: frontend/src/components/CreateOrder.js
Lines: 21-25

const [selectedProductData, setSelectedProductData] = useState(null);
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // Missing: selectedProduct

Why it matters (impact):
This is a MEDIUM REACT BUG because:

When selectedProduct changes, the effect doesn't run

Product details don't update when switching products

Users see wrong product information and pricing

State inconsistency in UI

How to fix it:
Add missing dependency:

useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  } else {
    setSelectedProductData(null);
  }
}, [products, selectedProduct]); // Added selectedProduct dependency

Issue 7: Array Key Using Index in React Lists
What the issue is:
React lists are using array index as the key prop instead of unique IDs.

Where it is in the code:
File: frontend/src/components/CustomerSearch.js - Line 88

{results.map((customer, idx) => (
  <div className="customer-card" key={idx}>
    <h3>{customer.name}</h3>
    <p>{customer.email} • {customer.phone}</p>
  </div>
))}

File: frontend/src/components/OrderList.js - Line 59

{sortedOrders.map((order, index) => (
  <tr key={index}>
    <td>#{order.id}</td>
    <td>{order.customer_name}</td>
    <td>{order.product_name}</td>
  </tr>
))}

Why it matters (impact):
This is a LOW PERFORMANCE ISSUE because:

React uses index as key, causing unnecessary re-renders

When list order changes (sorting), components re-mount instead of re-order

Lost component state during sorting

Poor performance with large lists

How to fix it:
Use unique IDs as keys:

// In CustomerSearch.js
{results.map((customer) => (
  <div className="customer-card" key={customer.id}>
    <h3>{customer.name}</h3>
    <p>{customer.email} • {customer.phone}</p>
  </div>
))}

// In OrderList.js
{sortedOrders.map((order) => (
  <tr key={order.id}>
    <td>#{order.id}</td>
    <td>{order.customer_name}</td>
    <td>{order.product_name}</td>
  </tr>
))}

SECTION C: DOCKER/INFRASTRUCTURE BUGS

Issue 8: Backend Dockerfile - Copies Everything Including node_modules

What the issue is:
The backend Dockerfile copies all files including potential node_modules from host, and doesn't optimize for layer caching.

Where it is in the code:
File: backend/Dockerfile

FROM node:18

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3001

CMD ["npm", "start"]

Why it matters (impact):
This is a MEDIUM BUILD PERFORMANCE & SECURITY ISSUE because:

Copies local node_modules which may be for different OS (causing errors)

No layer caching - reinstalls all deps on every code change

Copies sensitive files (.env, credentials) into image

Large image size due to unnecessary files (node_modules, tests, etc.)

Development dependencies included in production image

Runs as root user (security risk)

How to fix it:
Optimize Dockerfile with multi-stage builds and non-root user:

# backend/Dockerfile - FIXED
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application source code
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

CMD ["node", "src/index.js"]

Issue 9: Frontend Dockerfile - Not Optimized for Production
What the issue is:
The frontend Dockerfile uses development server instead of building static files and serving with nginx.

Where it is in the code:
File: frontend/Dockerfile

FROM node:18

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]

Why it matters (impact):
This is a MEDIUM PRODUCTION READINESS ISSUE because:

Uses development server (not suitable for production)

No build optimization (minification, tree shaking)

Large image size

No static file serving optimization

Runs as root user

No caching for static assets

How to fix it:
Use multi-stage build with nginx:

# frontend/Dockerfile - FIXED
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY public/ ./public/
COPY src/ ./src/

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 && \
    chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

Create frontend/nginx.conf:

server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

Issue 10: Docker Compose - Missing Database Environment Variables for Backend

What the issue is:
The docker-compose.yml file doesn't pass database environment variables to the backend service, so it uses hardcoded values.

Where it is in the code:
File: docker-compose.yml
Lines: 16-19

backend:
  build: ./backend
  ports:
    - "3001:3001"
  environment:
    PORT: 3001   # Only PORT is set, no database variables
  depends_on:
    - db

Why it matters (impact):
This is a HIGH CONFIGURATION ISSUE because:

Backend cannot connect to database in Docker environment

Uses default values instead of Docker network

Configuration mismatch between environments

Container fails to connect to database

No way to change credentials without rebuilding

How to fix it:
Add database environment variables:

# docker-compose.yml - FIXED
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: orderdb
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
      POSTGRES_DB: orderdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d orderdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend-network

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      DB_USER: admin
      DB_PASSWORD: admin123
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: orderdb
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - backend-network
            driver: bridge
            internal: true
      - frontend-network
            driver: bridge

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      REACT_APP_API_URL: http://localhost:3001/api
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - frontend-network

networks:
  backend-network:
    driver: bridge
    internal: true  # Database not accessible from outside
  frontend-network:
    driver: bridge

volumes:
  pgdata:

Issue 11: Docker Compose - Missing Health Checks
What the issue is:
The docker-compose.yml doesn't have health checks, so services start before dependencies are ready.

Where it is in the code:
File: docker-compose.yml
All services - no healthcheck configuration

Why it matters (impact):
This is a MEDIUM RELIABILITY ISSUE because:

Backend starts before database is ready (connection failures)

Frontend starts before backend is ready (API errors)

Containers show as "up" even if app crashed

No way to know if services are actually running

First startup always fails

How to fix it:
Add health checks (already included in fixed compose file above)

Issue 12: Docker Compose - No Restart Policy
What the issue is:
The docker-compose.yml doesn't have restart policies, so containers don't restart after crashes.

Where it is in the code:
File: docker-compose.yml
All services - no restart policy

Why it matters (impact):
This is a MEDIUM RELIABILITY ISSUE because:

If container crashes, it stays down

No automatic recovery from failures

Manual intervention required to restart

Production downtime

How to fix it:
Add restart policies (already included in fixed compose file above)

Issue 13: Docker Compose - No Network Isolation
What the issue is:
All services are on the default network without isolation.

Where it is in the code:
File: docker-compose.yml
No custom networks defined

Why it matters (impact):
This is a MEDIUM SECURITY ISSUE because:

Database is accessible from frontend (should be isolated)

No network segmentation

If frontend is compromised, attacker can access database directly

Services can access each other unnecessarily

How to fix it:
Add separate networks with internal network for database (already included in fixed compose file above)

Issue 14: Database init.sql - Missing Indexes for Performance

What the issue is:
The database schema doesn't have indexes on foreign keys and frequently queried columns.

Where it is in the code:
File: db/init.sql
No INDEX statements

Why it matters (impact):
This is a MEDIUM PERFORMANCE ISSUE because:

Queries on customer_id, product_id in orders table are slow

Search by customer email is slow

Sorting by dates is slow

As data grows, queries become slower

How to fix it:
Add indexes to the schema:

-- Add to init.sql after table creation
-- Indexes for better performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_products_name ON products(name);

Issue 15: Missing .dockerignore Files
What the issue is:
No .dockerignore files exist, so unnecessary files are copied into Docker images.

Where it is in the code:
Missing files: backend/.dockerignore and frontend/.dockerignore

Why it matters (impact):
This is a LOW BUILD PERFORMANCE ISSUE because:

node_modules copied unnecessarily

.git folder copied (large)

.env files copied (security risk)

Build logs and temp files copied

Larger image size

Slower builds

How to fix it:
Create backend/.dockerignore:

node_modules
npm-debug.log
.env
.env.local
.env.production
.git
.gitignore
README.md
Dockerfile
.dockerignore
coverage
.nyc_output
test
tests
__tests__
*.log

Create frontend/.dockerignore:

node_modules
build
.env
.env.local
.env.production
.git
.gitignore
README.md
Dockerfile
.dockerignore
coverage
.nyc_output
test
tests
__tests__
*.log