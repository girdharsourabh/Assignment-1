import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchOrders().then(data => setOrders(data));
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    const data = await fetchOrders();
    setOrders(data);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? Inventory will be restored.')) {
      return;
    }
    
    setCancellingId(orderId);
    try {
      const result = await cancelOrder(orderId);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        alert('Order cancelled successfully');
        const data = await fetchOrders();
        setOrders(data);
      }
    } catch (err) {
      alert('Failed to cancel order');
    } finally {
      setCancellingId(null);
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
  const canCellableStatuses = ['pending', 'confirmed'];

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
            <th>Action</th>
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
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                {canCellableStatuses.includes(order.status) && (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancellingId === order.id}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.85rem',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: cancellingId === order.id ? 'not-allowed' : 'pointer',
                      opacity: cancellingId === order.id ? 0.6 : 1,
                    }}
                  >
                    {cancellingId === order.id ? 'Cancelling...' : 'Cancel'}
                  </button>
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
