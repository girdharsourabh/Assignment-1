import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus } from '../api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [offset, setOffset] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const limit = 20;


  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingInitial(true);
      setError('');
      const data = await fetchOrders(limit, 0);
      if (cancelled) return;

      if (data && data.error) {
        setOrders([]);
        setOffset(0);
        setHasMore(false);
        setError(data.error);
        setLoadingInitial(false);
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      setOffset(list.length);
      setHasMore(list.length === limit);
      setLoadingInitial(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setError('');
    const updated = await updateOrderStatus(orderId, newStatus);
    if (updated && updated.error) {
      setError(updated.error);
      return;
    }

    setOrders((prev) =>
      (Array.isArray(prev) ? prev : []).map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: updated?.status ?? newStatus,
              updated_at: updated?.updated_at ?? o.updated_at,
            }
          : o
      )
    );
  };

  const handleLoadMore = async () => {
    if (loadingMore || loadingInitial || !hasMore) return;

    setLoadingMore(true);
    setError('');

    const data = await fetchOrders(limit, offset);
    if (data && data.error) {
      setError(data.error);
      setLoadingMore(false);
      return;
    }

    const list = Array.isArray(data) ? data : [];
    setOrders((prev) => [...(Array.isArray(prev) ? prev : []), ...list]);
    setOffset((prev) => prev + list.length);
    setHasMore(list.length === limit);
    setLoadingMore(false);
  };

  const sortedOrders = (Array.isArray(orders) ? [...orders] : []).sort((a, b) => {
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
      {error ? (
        <div style={{ marginBottom: 10, color: '#d33', fontSize: 13 }}>
          {error}
        </div>
      ) : null}
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
          {loadingInitial ? (
            <tr>
              <td colSpan={7} style={{ padding: 16, color: '#999' }}>
                Loading orders…
              </td>
            </tr>
          ) : null}
          {/**/}
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

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="submit-btn"
          onClick={handleLoadMore}
          disabled={loadingInitial || loadingMore || !hasMore}
          style={{ opacity: loadingInitial || loadingMore || !hasMore ? 0.7 : 1 }}
        >
          {loadingMore ? 'Loading…' : hasMore ? 'Load more' : 'No more orders'}
        </button>
        <span style={{ color: '#999', fontSize: 13 }}>
          Showing {orders.length}
        </span>
      </div>
    </div>
  );
}

export default OrderList;
