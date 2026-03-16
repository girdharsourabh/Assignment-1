import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [cancelErrors, setCancelErrors] = useState({});

  const loadOrders = () => {
    fetchOrders().then(data => setOrders(data));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    loadOrders();
  };

  const handleCancel = async (order) => {
    const confirmed = window.confirm(
      `Cancel order #${order.id} for "${order.product_name}"?\nThis will restore ${order.quantity} unit(s) to inventory.`
    );
    if (!confirmed) return;

    // Clear any previous error for this order
    setCancelErrors(prev => ({ ...prev, [order.id]: null }));

    const result = await cancelOrder(order.id);

    if (result.error) {
      setCancelErrors(prev => ({ ...prev, [order.id]: result.error }));
    } else {
      loadOrders();
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

  const cancellableStatuses = ['pending', 'confirmed'];
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
            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
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
                {order.status === 'cancelled' ? (
                  <span style={{ color: '#e53e3e', fontWeight: 500 }}>cancelled</span>
                ) : (
                  <select
                    className="status-select"
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                {cancellableStatuses.includes(order.status) && (
                  <div>
                    <button
                      onClick={() => handleCancel(order)}
                      style={{
                        background: '#e53e3e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      Cancel
                    </button>
                    {cancelErrors[order.id] && (
                      <div style={{ color: '#e53e3e', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {cancelErrors[order.id]}
                      </div>
                    )}
                  </div>
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
