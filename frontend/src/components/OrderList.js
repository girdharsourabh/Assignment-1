import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';
=======
import { fetchOrders, updateOrderStatus } from '../api';
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
<<<<<<< HEAD
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [message, setMessage] = useState(null);
=======
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89


  useEffect(() => {
    fetchOrders().then(data => setOrders(data));
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    const data = await fetchOrders();
    setOrders(data);
  };

<<<<<<< HEAD
  const handleCancelClick = (order) => {
    setCancellingOrder(order);
    setShowConfirmDialog(true);
    setMessage(null);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingOrder) return;

    try {
      const result = await cancelOrder(cancellingOrder.id);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: `Order #${cancellingOrder.id} cancelled successfully!` });
        const data = await fetchOrders();
        setOrders(data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel order' });
    } finally {
      setShowConfirmDialog(false);
      setCancellingOrder(null);
    }
  };

  const handleCancelDialogClose = () => {
    setShowConfirmDialog(false);
    setCancellingOrder(null);
  };

  const canCancelOrder = (order) => {
    return order.status === 'pending' || order.status === 'confirmed';
  };

=======
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89
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
<<<<<<< HEAD
      
      {message && (
        <div className={`message ${message.type}`} style={{ 
          padding: '0.5rem', 
          borderRadius: '4px', 
          marginBottom: '1rem',
          backgroundColor: message.type === 'error' ? '#fee' : '#efe',
          color: message.type === 'error' ? '#c00' : '#090'
        }}>
          {message.text}
        </div>
      )}

=======
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89
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
<<<<<<< HEAD
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrders.map((order) => (
            <tr key={order.id}>
=======
          </tr>
        </thead>
        <tbody>
          {/**/}
          {sortedOrders.map((order, index) => (
            <tr key={index}>
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89
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
<<<<<<< HEAD
                  disabled={order.status === 'cancelled'}
=======
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
<<<<<<< HEAD
              <td>
                {canCancelOrder(order) && (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelClick(order)}
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
=======
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89
            </tr>
          ))}
        </tbody>
      </table>
<<<<<<< HEAD

      {showConfirmDialog && (
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
            <p>Are you sure you want to cancel Order #{cancellingOrder?.id}?</p>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              This will restore {cancellingOrder?.quantity} units of {cancellingOrder?.product_name} to inventory.
            </p>
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={handleCancelConfirm}
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
                onClick={handleCancelDialogClose}
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
=======
>>>>>>> a441329b7ce905790fdb1a6d65a86d28ac0bfc89
    </div>
  );
}

export default OrderList;
