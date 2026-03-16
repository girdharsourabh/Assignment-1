import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
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
            </tr>
          ))}
        </tbody>
      </table>
      
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
