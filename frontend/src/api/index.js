const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data && data.error ? data.error : 'Request failed');
  }

  return data;
}

export async function fetchOrders() {
  return request('/orders');
}

export async function fetchOrder(id) {
  return request(`/orders/${id}`);
}

export async function createOrder(data) {
  return request('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(id, status) {
  return request(`/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function cancelOrder(id) {
  return request(`/orders/${id}/cancel`, {
    method: 'POST',
  });
}

export async function fetchCustomers() {
  return request('/customers');
}

export async function searchCustomers(name) {
  return request(`/customers/search?name=${encodeURIComponent(name)}`);
}

export async function createCustomer(data) {
  return request('/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function fetchProducts() {
  return request('/products');
}
