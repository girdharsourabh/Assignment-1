import React, { useState, useEffect } from "react";
import { fetchOrders, updateOrderStatus, cancelOrder } from "../api";

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const data = await fetchOrders();
    setOrders(data);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    await loadOrders();
  };

  const handleCancel = async (order) => {
    const confirmed = window.confirm(
      `Cancel order #${order.id} for ${order.customer_name}?\n\n` +
        `Product: ${order.product_name} × ${order.quantity}\n` +
        `This will restore inventory and cannot be undone.`,
    );
    if (!confirmed) return;

    setCancellingId(order.id);
    setError(null);
    try {
      const result = await cancelOrder(order.id);
      if (result.error) {
        setError(`Failed to cancel order #${order.id}: ${result.error}`);
      } else {
        await loadOrders();
      }
    } catch (err) {
      setError(`Failed to cancel order #${order.id}. Please try again.`);
    } finally {
      setCancellingId(null);
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === "total_amount") {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }
    if (sortDir === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const isCancellable = (status) =>
    status === "pending" || status === "confirmed";
  const statusOptions = ["pending", "confirmed", "shipped", "delivered"];

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>

      {error && (
        <div className="message error" style={{ marginBottom: "1rem" }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "1rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <table className="order-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("id")} style={{ cursor: "pointer" }}>
              ID
            </th>
            <th>Customer</th>
            <th>Product</th>
            <th
              onClick={() => handleSort("quantity")}
              style={{ cursor: "pointer" }}
            >
              Qty
            </th>
            <th
              onClick={() => handleSort("total_amount")}
              style={{ cursor: "pointer" }}
            >
              Total
            </th>
            <th>Status</th>
            <th
              onClick={() => handleSort("created_at")}
              style={{ cursor: "pointer" }}
            >
              Date
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* fix: use order.id as key (not array index) so React tracks rows correctly after sort */}
          {sortedOrders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>
                <div>{order.customer_name}</div>
                <small style={{ color: "#999" }}>{order.customer_email}</small>
              </td>
              <td>{order.product_name}</td>
              <td>{order.quantity}</td>
              <td>₹{parseFloat(order.total_amount).toLocaleString()}</td>
              <td>
                {order.status === "cancelled" ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      background: "#f5f5f5",
                      color: "#999",
                      fontSize: "0.85rem",
                    }}
                  >
                    cancelled
                  </span>
                ) : (
                  <select
                    className="status-select"
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value)
                    }
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                {isCancellable(order.status) && (
                  <button
                    onClick={() => handleCancel(order)}
                    disabled={cancellingId === order.id}
                    style={{
                      padding: "4px 10px",
                      background: cancellingId === order.id ? "#ccc" : "#fff",
                      color: cancellingId === order.id ? "#999" : "#c0392b",
                      border: "1px solid currentColor",
                      borderRadius: "4px",
                      cursor:
                        cancellingId === order.id ? "not-allowed" : "pointer",
                      fontSize: "0.8rem",
                      fontWeight: "500",
                    }}
                  >
                    {cancellingId === order.id ? "Cancelling…" : "Cancel"}
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
