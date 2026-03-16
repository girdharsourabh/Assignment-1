import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Fetch orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchOrders();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load orders:", err);
        setOrders([]);
      }
    };

    loadOrders();
  }, []);

  // Update order status
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);

      const data = await fetchOrders();
      const safeData = Array.isArray(data) ? data : [];

      const sorted = [...safeData].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === 'total_amount') {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        }

        if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });

      setOrders(sorted);

    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    try {
      await cancelOrder(orderId);

      const data = await fetchOrders();
      setOrders(Array.isArray(data) ? data : []);

    } catch (err) {
      console.error("Cancel failed", err);
    }
  };

  // Handle sorting
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Sort orders
  const sortedOrders = [...(orders || [])].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'total_amount') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }

    if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered'];

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>

      <table className="order-table">

        <thead>
          <tr>
            <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>Qty</th>
            <th onClick={() => handleSort('total_amount')} style={{ cursor: 'pointer' }}>Total</th>
            <th>Status</th>
            <th>Cancel</th>
            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date</th>
          </tr>
        </thead>

        <tbody>
          {sortedOrders.map((order) => (
            <tr key={order.id}>

              <td>#{order.id}</td>

              <td>
                <div>{order.customer_name}</div>
                <small style={{ color: '#999' }}>
                  {order.customer_email}
                </small>
              </td>

              <td>{order.product_name}</td>

              <td>{order.quantity}</td>

              <td>₹{parseFloat(order.total_amount || 0).toLocaleString()}</td>

              <td>
                <select
                  className="status-select"
                  value={order.status}
                  onChange={(e) =>
                    handleStatusChange(order.id, e.target.value)
                  }
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>

              <td>
                {(order.status === 'pending' || order.status === 'confirmed') && (
                  <button
                    style={{
                      background: "#ff4d4f",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer"
                    }}
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    Cancel
                  </button>
                )}
              </td>

              <td>
                {new Date(order.created_at).toLocaleDateString()}
              </td>

            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

export default OrderList;
