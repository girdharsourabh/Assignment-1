const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function apiFetch(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchOrders() {
  return apiFetch('/orders');
}

export async function fetchOrder(id) {
  return apiFetch(`/orders/${id}`);
}

export async function createOrder(data) {
  return apiFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(id, status) {
  return apiFetch(`/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function cancelOrder(id) {
  return apiFetch(`/orders/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchCustomers() {
  return apiFetch('/customers');
}

export async function searchCustomers(name) {
  const encoded = encodeURIComponent(name);
  return apiFetch(`/customers/search?name=${encoded}`);
}

export async function createCustomer(data) {
  return apiFetch('/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function fetchProducts() {
  return apiFetch('/products');
}
