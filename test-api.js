// Simple API test script to verify endpoints
const express = require('express');
const cors = require('cors');

// Mock database for testing
const mockOrders = [
  {
    id: 1,
    customer_id: 1,
    product_id: 1,
    quantity: 2,
    total_amount: 4998.00,
    status: 'pending',
    shipping_address: '42 MG Road, Bangalore',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer_name: 'Aarav Sharma',
    customer_email: 'aarav@example.com',
    product_name: 'Wireless Earbuds',
    product_price: 2499.00
  },
  {
    id: 2,
    customer_id: 2,
    product_id: 3,
    quantity: 1,
    total_amount: 4599.00,
    status: 'confirmed',
    shipping_address: '15 Park Street, Kolkata',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer_name: 'Priya Patel',
    customer_email: 'priya@example.com',
    product_name: 'Mechanical Keyboard',
    product_price: 4599.00
  }
];

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Orders endpoints
app.get('/api/orders', (req, res) => {
  res.json(mockOrders);
});

app.delete('/api/orders/:id', (req, res) => {
  const orderId = parseInt(req.params.id);
  const order = mockOrders.find(o => o.id === orderId);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  if (order.status !== 'pending' && order.status !== 'confirmed') {
    return res.status(400).json({ 
      error: 'Order cannot be cancelled. Only pending or confirmed orders can be cancelled.' 
    });
  }
  
  order.status = 'cancelled';
  order.updated_at = new Date().toISOString();
  
  res.json({
    message: 'Order cancelled successfully',
    order: order
  });
});

// Customers endpoints
app.get('/api/customers', (req, res) => {
  res.json([
    { id: 1, name: 'Aarav Sharma', email: 'aarav@example.com', phone: '9876543210' },
    { id: 2, name: 'Priya Patel', email: 'priya@example.com', phone: '9876543211' }
  ]);
});

app.get('/api/customers/search', (req, res) => {
  const { name } = req.query;
  const customers = [
    { id: 1, name: 'Aarav Sharma', email: 'aarav@example.com', phone: '9876543210' },
    { id: 2, name: 'Priya Patel', email: 'priya@example.com', phone: '9876543211' }
  ];
  
  if (name) {
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(name.toLowerCase())
    );
    res.json(filtered);
  } else {
    res.json(customers);
  }
});

// Products endpoints
app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Wireless Earbuds', price: 2499.00, inventory_count: 50 },
    { id: 2, name: 'USB-C Hub', price: 1899.00, inventory_count: 30 },
    { id: 3, name: 'Mechanical Keyboard', price: 4599.00, inventory_count: 20 }
  ]);
});

app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Orders: http://localhost:${PORT}/api/orders`);
});

// Test the endpoints after server starts
setTimeout(() => {
  console.log('\n=== Testing API Endpoints ===\n');
  
  // Test health check
  fetch(`http://localhost:${PORT}/api/health`)
    .then(res => res.json())
    .then(data => console.log('✓ Health check:', data))
    .catch(err => console.log('✗ Health check failed:', err.message));
  
  // Test orders
  fetch(`http://localhost:${PORT}/api/orders`)
    .then(res => res.json())
    .then(data => console.log('✓ Get orders:', data.length, 'orders found'))
    .catch(err => console.log('✗ Get orders failed:', err.message));
  
  // Test order cancellation
  fetch(`http://localhost:${PORT}/api/orders/1`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => console.log('✓ Cancel order:', data.message))
    .catch(err => console.log('✗ Cancel order failed:', err.message));
    
  // Test customer search
  fetch(`http://localhost:${PORT}/api/customers/search?name=aarav`)
    .then(res => res.json())
    .then(data => console.log('✓ Customer search:', data.length, 'results found'))
    .catch(err => console.log('✗ Customer search failed:', err.message));
    
}, 2000);
