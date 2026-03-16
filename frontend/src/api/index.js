const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function handleResponse(res) {
  const data = await res.json();

  if (!res.ok) {
    return { error: data.error || 'Request failed' };
  }

  return data;
}
export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  return handleResponse(res);
}

export async function fetchOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  return handleResponse(res);
}

export async function createOrder(data) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateOrderStatus(id, status) {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function cancelOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
    method: 'PATCH',
  });
  return handleResponse(res);
}

export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/customers`);
  return handleResponse(res);
}

export async function searchCustomers(name) {
  const res = await fetch(`${API_BASE}/customers/search?name=${encodeURIComponent(name)}`);
  return handleResponse(res);
}

export async function createCustomer(data) {
  const res = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  return handleResponse(res);
}
