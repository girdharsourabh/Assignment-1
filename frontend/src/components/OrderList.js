import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // BUG: No loading state, no error handling - shows blank screen if API fails
  // useEffect(() => {
  //   fetchOrders().then(data => setOrders(data));
  // }, []);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const data = await fetchOrders();

    if (data.error) {
      alert(data.error);
      return;
    }

    setOrders(data);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    // BUG: useEffect has missing dependency 
    // const data = await fetchOrders();
    // setOrders(data);
    await loadOrders();
  };

  const handleCancel = async (orderId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    const result = await cancelOrder(orderId);

    if (result.error) {
      alert(result.error);
      return;
    }

    await loadOrders();
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
          </tr>
        </thead>
        <tbody>
          {/* BUG: Using array index as key on a sortable list */}

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
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>

              <td>{new Date(order.created_at).toLocaleDateString()}</td>

              <td>
                {(order.status === 'pending' || order.status === 'confirmed') && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer'
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
    </div>
  );
}

export default OrderList;
