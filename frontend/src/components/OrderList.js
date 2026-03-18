import React, { useEffect, useState } from 'react';
import { cancelOrder, fetchOrders, updateOrderStatus } from '../api';

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered'];
const CANCELABLE_STATUSES = new Set(['pending', 'confirmed']);

function formatCurrency(amount) {
  return `Rs ${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);

  const loadOrders = async () => {
    const data = await fetchOrders();
    setOrders(data);
  };

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        const data = await fetchOrders();
        if (isMounted) {
          setOrders(data);
        }
      } catch (error) {
        if (isMounted) {
          setMessage({ type: 'error', text: error.message });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setBusyOrderId(orderId);
    setMessage(null);

    try {
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
      setMessage({ type: 'success', text: `Order #${orderId} updated to ${newStatus}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCancel = async (orderId) => {
    const confirmed = window.confirm('Cancel this order and restore the reserved inventory?');
    if (!confirmed) {
      return;
    }

    setBusyOrderId(orderId);
    setMessage(null);

    try {
      await cancelOrder(orderId);
      await loadOrders();
      setMessage({ type: 'success', text: `Order #${orderId} cancelled successfully.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusyOrderId(null);
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'total_amount' || sortField === 'quantity' || sortField === 'id') {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }

    if (sortField === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (aVal === bVal) {
      return 0;
    }

    if (sortDir === 'asc') {
      return aVal > bVal ? 1 : -1;
    }

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

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      {loading ? (
        <div className="empty-state">Loading orders...</div>
      ) : (
        <div className="table-wrap">
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
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">No orders found.</td>
                </tr>
              ) : (
                sortedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>
                      <div>{order.customer_name}</div>
                      <small style={{ color: '#999' }}>{order.customer_email}</small>
                    </td>
                    <td>{order.product_name}</td>
                    <td>{order.quantity}</td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>
                      <select
                        className="status-select"
                        value={order.status}
                        disabled={busyOrderId === order.id || order.status === 'cancelled'}
                        onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      >
                        {order.status === 'cancelled' && (
                          <option value="cancelled">cancelled</option>
                        )}
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {CANCELABLE_STATUSES.has(order.status) ? (
                        <button
                          className="secondary-btn danger-btn"
                          disabled={busyOrderId === order.id}
                          onClick={() => handleCancel(order.id)}
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="muted-text">-</span>
                      )}
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OrderList;
