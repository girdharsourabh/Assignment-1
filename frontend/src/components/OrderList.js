import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';
import Loader from './Loader';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const [cancelLoading, setCancelLoading] = useState(null); // order id being cancelled
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(null); // order id being updated


  useEffect(() => {
    setLoading(true);
     fetchOrders().then(data => {
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]); // or handle error
      }
      setLoading(false);
    });
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setStatusLoading(orderId);
    // Optimistically update UI
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.error) {
        // Revert if error
        setError(result.error);
        const data = await fetchOrders();
        setOrders(data);
      }
    } catch (err) {
      setError('Failed to update order status. Please try again.');
      const data = await fetchOrders();
      setOrders(data);
    } finally {
      setStatusLoading(null);
    }
  };

  // Show modal to confirm cancel
  const openCancelModal = (orderId) => {
    setOrderToCancel(orderId);
    setShowCancelModal(true);
    setError(null);
  };

  // Handle actual cancel after confirmation
  const handleCancelConfirmed = async () => {
    if (!orderToCancel) return;
    setCancelLoading(orderToCancel);
    setShowCancelModal(false);
    try {
      const result = await cancelOrder(orderToCancel);
      if (result.error) {
        setError(result.error);
      } else {
        // Refresh orders
        const data = await fetchOrders();
        setOrders(data);
      }
    } catch (err) {
      setError('Failed to cancel order. Please try again.');
    } finally {
      setCancelLoading(null);
      setOrderToCancel(null);
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
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Loader size={36} />
        </div>
      ) : (
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order, index) => {
              const isCancelled = order.status === 'cancelled';
              return (
                <tr key={index} className={isCancelled ? 'order-cancelled-row' : undefined}>
                  <td>#{order.id}</td>
                  <td>
                    <div>{order.customer_name}</div>
                    <small style={{ color: '#999' }}>{order.customer_email}</small>
                  </td>
                  <td>{order.product_name}</td>
                  <td>{order.quantity}</td>
                  <td>₹{parseFloat(order.total_amount).toLocaleString()}</td>
                  <td>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <select
                        className="status-select"
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={isCancelled || statusLoading === order.id}
                        style={{ minWidth: 100 }}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {statusLoading === order.id && <Loader size={16} style={{ position: 'absolute', right: -24 }} />}
                    </div>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    {(['pending', 'confirmed'].includes(order.status) && !isCancelled) ? (
                      <button
                        onClick={() => openCancelModal(order.id)}
                        disabled={cancelLoading === order.id}
                        style={{
                          background: '#e94560', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                          opacity: cancelLoading === order.id ? 0.6 : 1
                        }}
                      >
                        {cancelLoading === order.id ? <Loader size={14} color="#fff" style={{ display: 'inline-block', verticalAlign: 'middle' }} /> : 'Cancel'}
                      </button>
                    ) : (
                      <span style={{ color: '#aaa', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Cancel Order</h3>
            <p>Are you sure you want to cancel this order?</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleCancelConfirmed}
                style={{ background: '#e94560', color: 'white', border: 'none', borderRadius: 4, padding: '6px 18px', fontWeight: 500, cursor: 'pointer' }}
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 4, padding: '6px 18px', fontWeight: 500, cursor: 'pointer' }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderList;
