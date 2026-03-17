const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  return res.json();
}

export async function fetchOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  return res.json();
}

export async function createOrder(data) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateOrderStatus(id, status) {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/customers`);
  return res.json();
}

export async function searchCustomers(name) {
  const res = await fetch(`${API_BASE}/customers/search?name=${name}`);
  return res.json();
}

export async function createCustomer(data) {
  const res = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
}

export async function cancelOrder(orderId) {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel order');
    }
    
    return data;
  } catch (error) {
    console.error('Cancel order error:', error);
    throw error;
  }
}
