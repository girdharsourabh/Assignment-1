import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [message, setMessage] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch orders' });
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const isLockedOrder = (status) => status === 'cancelled';
  const canCancelOrder = (status) => ['pending', 'confirmed'].includes(status);

  const handleStatusChange = async (orderId, newStatus, currentStatus) => {
    if (isLockedOrder(currentStatus)) {
      return;
    }

    try {
      setMessage(null);
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update order status' });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (order) => {
    if (isLockedOrder(order.status)) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel Order #${order.id}?`
    );

    if (!confirmed) return;

    try {
      setMessage(null);
      setCancellingOrderId(order.id);

      await cancelOrder(order.id);

      setMessage({
        type: 'success',
        text: `Order #${order.id} cancelled successfully`,
      });

      await loadOrders();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to cancel order',
      });
    } finally {
      setCancellingOrderId(null);
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

  const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
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
            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrders.map((order) => {
            const locked = isLockedOrder(order.status);

            return (
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
                    disabled={locked || updatingOrderId === order.id}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value, order.status)
                    }
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                  {locked ? (
                    <span style={{ color: '#999', fontWeight: 500 }}>Locked</span>
                  ) : canCancelOrder(order.status) ? (
                    <button
                      onClick={() => handleCancelOrder(order)}
                      disabled={cancellingOrderId === order.id}
                    >
                      {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  ) : (
                    <span style={{ color: '#999' }}>Not allowed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default OrderList;