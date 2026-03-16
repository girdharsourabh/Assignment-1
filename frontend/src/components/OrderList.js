import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
        setError(data?.error || 'Failed to load orders');
      }
    } catch (err) {
      setOrders([]);
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus, currentStatus) => {
    if (newStatus === currentStatus) {
      return;
    }

    setActiveOrderId(orderId);
    setMessage(null);
    const result = await updateOrderStatus(orderId, newStatus);

    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Order #${orderId} status updated.` });
      await loadOrders();
    }

    setActiveOrderId(null);
  };

  const handleCancelOrder = async (order) => {
    const shouldCancel = window.confirm(
      `Cancel order #${order.id}? Inventory for ${order.quantity} unit(s) will be restored.`
    );
    if (!shouldCancel) {
      return;
    }

    setActiveOrderId(order.id);
    setMessage(null);
    const result = await cancelOrder(order.id);

    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Order #${order.id} cancelled successfully.` });
      await loadOrders();
    }

    setActiveOrderId(null);
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
  const canCancelOrder = (status) => status === 'pending' || status === 'confirmed';

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      {error && <div className="message error">{error}</div>}
      {isLoading && <p style={{ color: '#666', marginBottom: '0.75rem' }}>Loading orders...</p>}
      <table className="order-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>Qty</th>
            <th onClick={() => handleSort('total_amount')} style={{ cursor: 'pointer' }}>Total</th>
            <th>Status</th>
            <th>Actions</th>
            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date</th>
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
                  onChange={(e) => handleStatusChange(order.id, e.target.value, order.status)}
                  disabled={activeOrderId === order.id || order.status === 'cancelled'}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s} disabled={s === 'cancelled'}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                {canCancelOrder(order.status) ? (
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => handleCancelOrder(order)}
                    disabled={activeOrderId === order.id}
                  >
                    Cancel
                  </button>
                ) : (
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>Not allowed</span>
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
