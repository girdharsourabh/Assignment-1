import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchOrders().then(data => setOrders(data));
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    const data = await fetchOrders();
    setOrders(data);
  };

  const handleCancel = async (orderId) => {
    setMessage(null);
    const result = await cancelOrder(orderId);
    setCancelConfirm(null);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Order #${orderId} has been cancelled.` });
      const data = await fetchOrders();
      setOrders(data);
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

  const canCancel = (status) => status === 'pending' || status === 'confirmed';
  const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      {cancelConfirm && (
        <div className="cancel-dialog-overlay">
          <div className="cancel-dialog">
            <h3>Cancel Order #{cancelConfirm.id}?</h3>
            <p>
              This will cancel the order for <strong>{cancelConfirm.product_name}</strong> (×{cancelConfirm.quantity})
              and restore the inventory. This action cannot be undone.
            </p>
            <div className="cancel-dialog-actions">
              <button className="cancel-dialog-btn confirm" onClick={() => handleCancel(cancelConfirm.id)}>
                Yes, Cancel Order
              </button>
              <button className="cancel-dialog-btn dismiss" onClick={() => setCancelConfirm(null)}>
                No, Keep It
              </button>
            </div>
          </div>
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
          {sortedOrders.map((order, index) => (
            <tr key={index} className={order.status === 'cancelled' ? 'row-cancelled' : ''}>
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
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  disabled={order.status === 'cancelled'}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                {canCancel(order.status) ? (
                  <button
                    className="cancel-btn"
                    onClick={() => setCancelConfirm(order)}
                  >
                    Cancel
                  </button>
                ) : (
                  <span style={{ color: '#ccc', fontSize: '0.85rem' }}>—</span>
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
