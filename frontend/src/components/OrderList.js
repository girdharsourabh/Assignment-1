import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      setError('Failed to load orders');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
      setSuccessMessage('Order status updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update order status');
    }
  };

  const handleCancel = async (orderId) => {
    // Confirmation dialog
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setCancellingId(orderId);
    setError(null);

    try {
      const result = await cancelOrder(orderId);
      await loadOrders();
      setSuccessMessage(result.message || 'Order cancelled successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  // ✅ Function to check if cancel button should be shown
  const canCancel = (status) => {
    return ['pending', 'confirmed'].includes(status);
  };

  // ✅ Function to get status badge color
  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'confirmed': '#17a2b8',
      'shipped': '#007bff',
      'delivered': '#28a745',
      'cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
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
      
      {error && (
        <div className="message error" style={{ 
          marginBottom: '1rem', 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="message success" style={{ 
          marginBottom: '1rem', 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          borderRadius: '4px',
          border: '1px solid #c3e6cb'
        }}>
          {successMessage}
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
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  style={{
                    backgroundColor: getStatusColor(order.status),
                    color: 'white',
                    border: 'none',
                    padding: '5px',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s} style={{ backgroundColor: 'white', color: 'black' }}>{s}</option>
                  ))}
                </select>
              </td>
              <td>
                {canCancel(order.status) ? (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      cursor: cancellingId === order.id ? 'not-allowed' : 'pointer',
                      opacity: cancellingId === order.id ? 0.6 : 1,
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      width: '70px'
                    }}
                    onMouseEnter={(e) => {
                      if (cancellingId !== order.id) {
                        e.target.style.backgroundColor = '#c82333';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (cancellingId !== order.id) {
                        e.target.style.backgroundColor = '#dc3545';
                      }
                    }}
                  >
                    {cancellingId === order.id ? '...' : 'Cancel'}
                  </button>
                ) : (
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>
                    {order.status === 'cancelled' ? 'Cancelled' : 'No action'}
                  </span>
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