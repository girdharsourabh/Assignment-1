const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;

  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.response = data;
    error.status = res.status;
    throw error;
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
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(id, status) {
  return request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
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
    body: JSON.stringify(data),
  });
}

export async function fetchProducts() {
  return request('/products');
}

export async function cancelOrder(id) {
  return request(`/orders/${id}/cancel`, {
    method: 'PATCH',
  });
}