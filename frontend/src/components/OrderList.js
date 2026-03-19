import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [message, setMessage] = useState(null);


  useEffect(() => {
    fetchOrders()
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
        setMessage(null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to load orders' });
        setTimeout(() => setMessage(null), 3000);
      }
      })
      .catch(err => {
        setMessage({ type: 'error', text: 'Failed to load orders' });
        setTimeout(() => setMessage(null), 3000);
      });
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    const data = await fetchOrders();
    setOrders(data);
  };

  const handleCancelOrder = async (orderId) => {
    setCancellingOrderId(orderId);
    setShowCancelConfirm(true);
  };

  const confirmCancelOrder = async () => {
    try {
      const result = await cancelOrder(cancellingOrderId);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.message });
        const data = await fetchOrders();
        setOrders(data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel order' });
    } finally {
      setShowCancelConfirm(false);
      setCancellingOrderId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const cancelCancelOrder = () => {
    setShowCancelConfirm(false);
    setCancellingOrderId(null);
  };

  const canCancelOrder = (status) => {
    return status === 'pending' || status === 'confirmed';
  };

  const sortedOrders = Array.isArray(orders) ? [...orders].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'total_amount') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }
    if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  }) : [];

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
        <div className={`message ${message.type}`} style={{ 
          padding: '0.75rem', 
          marginBottom: '1rem', 
          borderRadius: '4px',
          backgroundColor: message.type === 'error' ? '#fee' : '#efe',
          border: `1px solid ${message.type === 'error' ? '#fcc' : '#cfc'}`
        }}>
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
                {canCancelOrder(order.status) && (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelOrder(order.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
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

      {showCancelConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3>Confirm Order Cancellation</h3>
            <p>Are you sure you want to cancel order #{cancellingOrderId}? This action cannot be undone.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                onClick={confirmCancelOrder}
                style={{
                  marginRight: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Yes, Cancel Order
              </button>
              <button
                onClick={cancelCancelOrder}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                No, Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderList;
