import React, { useState, useEffect, useMemo } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchOrders();
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };

    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    // ❌ Prevent manual change to cancelled
    if (newStatus === "cancelled") {
      alert("Use Cancel button to cancel an order.");
      return;
    }

    try {
      await updateOrderStatus(orderId, newStatus);

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Unable to update order status. Please try again.");
    }
  };

  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    try {
      await cancelOrder(orderId);

      // ✅ Re-fetch updated data
      const updatedOrders = await fetchOrders();
      setOrders(updatedOrders);

    } catch (error) {
      console.error("Cancel order failed:", error);
      alert(error.message || "Failed to cancel order.");
    }
  };

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'total_amount') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [orders, sortField, sortDir]);

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

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
            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sortedOrders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>

              <td>
                <div>{order.customer_name}</div>
                <small style={{ color: '#999' }}>{order.customer_email}</small>
              </td>

              <td>{order.product_name}</td>

              <td>{order.quantity}</td>

              <td>₹{parseFloat(order.total_amount).toLocaleString()}</td>

              <td>
                <select
                  className="status-select"
                  value={order.status}
                  disabled={order.status === "cancelled"} // ✅ disable if cancelled
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                >
                  {statusOptions.map((s) => (
                    <option
                      key={s}
                      value={s}
                      style={s === "cancelled" ? { color: "red" } : {}}
                    >
                      {s}
                    </option>
                  ))}
                </select>
              </td>

              <td>{new Date(order.created_at).toLocaleDateString()}</td>

              <td>
                {["pending", "confirmed"].includes(order.status) && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    style={{
                      background: "#e53935",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OrderList;