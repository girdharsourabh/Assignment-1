import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject({ error: message });
  }
);

export async function fetchOrders() {
  return api.get('/orders');
}

export async function fetchOrder(id) {
  return api.get(`/orders/${id}`);
}

export async function createOrder(data) {
  return api.post('/orders', data);
}

export async function cancelOrder(id) {
  return api.patch(`/orders/${id}/cancel`);
}

export async function updateOrderStatus(id, status) {
  return api.patch(`/orders/${id}/status`, { status });
}

export async function fetchCustomers() {
  return api.get('/customers');
}

export async function searchCustomers(name) {
  // SAFE: Axios handles URL encoding for params
  return api.get('/customers/search', { params: { name } });
}

export async function createCustomer(data) {
  return api.post('/customers', data);
}

export async function fetchProducts() {
  return api.get('/products');
}
