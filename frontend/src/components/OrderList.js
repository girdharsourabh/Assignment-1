import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [error, setError] = useState('');
  const LIMIT = 5;


  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  const loadOrders = async () => {
    const offset = currentPage * LIMIT;
    const data = await fetchOrders(LIMIT, offset);
    setOrders(data);
    setHasMore(data.length === LIMIT);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    await loadOrders();
  };

  const handleCancelOrder = async (orderId) => {
    setCancellingOrderId(orderId);
    setError('');
  };

  const confirmCancelOrder = async () => {
    if (!cancellingOrderId) return;
    
    try {
      await cancelOrder(cancellingOrderId);
      await loadOrders();
      setCancellingOrderId(null);
    } catch (err) {
      setError(err.error || 'Failed to cancel order');
    }
  };

  const cancelCancelOrder = () => {
    setCancellingOrderId(null);
    setError('');
  };

  const isCancellable = (status) => {
    return ['pending', 'confirmed'].includes(status);
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
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
          {error}
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
                  style={order.status === 'cancelled' ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                {isCancellable(order.status) && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {cancellingOrderId && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          <h3>Confirm Order Cancellation</h3>
          <p>Are you sure you want to cancel order #{cancellingOrderId}?</p>
          <p>This action will restore the product inventory and cannot be undone.</p>
          
          {error && (
            <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
              {error}
            </div>
          )}
          
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button
              onClick={cancelCancelOrder}
              style={{
                marginRight: '10px',
                padding: '8px 16px',
                border: '1px solid #ccc',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              No, Keep Order
            </button>
            <button
              onClick={confirmCancelOrder}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Yes, Cancel Order
            </button>
          </div>
        </div>
      )}
      
      {cancellingOrderId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999
        }} onClick={cancelCancelOrder} />
      )}
      
      <div className="pagination-controls" style={{ marginTop: '20px', textAlign: 'center' }}>
        <button 
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 0}
          style={{ marginRight: '10px', padding: '5px 15px' }}
        >
          Previous
        </button>
        <span style={{ margin: '0 15px' }}>Page {currentPage + 1}</span>
        <button 
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={!hasMore}
          style={{ marginLeft: '10px', padding: '5px 15px' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default OrderList;
