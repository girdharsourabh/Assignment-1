const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function parseJson(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) || `Request failed (${res.status})`;
    return { error: message, status: res.status, data };
  }
  return data;
}

export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`, { credentials: 'include' });
  return parseJson(res);
}

export async function fetchOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${id}`, { credentials: 'include' });
  return parseJson(res);
}

export async function createOrder(data) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return parseJson(res);
}

export async function updateOrderStatus(id, status) {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  return parseJson(res);
}

export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/customers`, { credentials: 'include' });
  return parseJson(res);
}

export async function searchCustomers(name) {
  const res = await fetch(`${API_BASE}/customers/search?name=${name}`, {
    credentials: 'include',
  });
  return parseJson(res);
}

export async function createCustomer(data) {
  const res = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return parseJson(res);
}

export async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  return parseJson(res);
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  return parseJson(res);
}

export async function logout() {
  const res = await fetch(`${API_BASE}/users/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJson(res);
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/users/me`, { credentials: 'include' });
  return parseJson(res);
}
