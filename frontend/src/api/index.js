const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

async function requestJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: data.error || "Request failed" };
  }
  return data;
}

export async function fetchOrders() {
  return requestJson(`${API_BASE}/orders`);
}

export async function fetchOrder(id) {
  return requestJson(`${API_BASE}/orders/${id}`);
}

export async function createOrder(data) {
  return requestJson(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(id, status) {
  return requestJson(`${API_BASE}/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function cancelOrder(id) {
  return requestJson(`${API_BASE}/orders/${id}/cancel`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
}

export async function fetchCustomers() {
  return requestJson(`${API_BASE}/customers`);
}

export async function searchCustomers(name) {
  return requestJson(
    `${API_BASE}/customers/search?name=${encodeURIComponent(name)}`,
  );
}

export async function createCustomer(data) {
  return requestJson(`${API_BASE}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fetchProducts() {
  return requestJson(`${API_BASE}/products`);
}
