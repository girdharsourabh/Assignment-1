import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [message, setMessage] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);

  const loadOrders = async () => {
    const data = await fetchOrders();
    setOrders(data);
  };

  useEffect(() => {
    const loadInitialOrders = async () => {
      try {
        await loadOrders();
        setMessage(null);
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      }
    };

    loadInitialOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setActiveOrderId(orderId);
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
      setMessage(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActiveOrderId(null);
    }
  };

  const handleCancelOrder = async (order) => {
    const confirmed = window.confirm(`Cancel order #${order.id}? Inventory will be restored.`);
    if (!confirmed) {
      return;
    }

    try {
      setActiveOrderId(order.id);
      await cancelOrder(order.id);
      await loadOrders();
      setMessage({ type: 'success', text: `Order #${order.id} cancelled successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActiveOrderId(null);
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'total_amount') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }
    if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered'];

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <table className="order-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>Qty</th>
            <th onClick={() => handleSort('total_amount')} style={{ cursor: 'pointer' }}>Total</th>
            <th>Status</th>
            <th>Action</th>
            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {/**/}
          {sortedOrders.map((order, index) => (
            <tr key={index}>
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
                  disabled={order.status === 'cancelled' || activeOrderId === order.id}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                >
                  {(order.status === 'cancelled'
                    ? [...statusOptions, 'cancelled']
                    : statusOptions
                  ).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td className="order-action-cell">
                {['pending', 'confirmed'].includes(order.status) ? (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelOrder(order)}
                    disabled={activeOrderId === order.id}
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="order-action-text">Not allowed</span>
                )}
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OrderList;
