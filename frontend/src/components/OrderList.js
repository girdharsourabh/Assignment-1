import React, { useState, useEffect } from "react";
import { fetchOrders, updateOrderStatus, cancelOrder } from "../api";

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [message, setMessage] = useState(null);

  const loadOrders = async () => {
    const data = await fetchOrders();
    if (data.error) {
      setMessage({ type: "error", text: data.error });
      return;
    }
    setOrders(data);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    await loadOrders();
  };

  const handleCancel = async (orderId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?",
    );
    if (!confirmed) return;

    const result = await cancelOrder(orderId);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setMessage({
      type: "success",
      text: `Order #${orderId} cancelled successfully`,
    });
    await loadOrders();
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

  const statusOptions = ["pending", "confirmed", "shipped", "delivered"];

  return (
    <div className="order-list">
      <h2>Orders ({orders.length})</h2>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
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
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {/**/}
          {sortedOrders.map((order, index) => (
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
                <select
                  className="status-select"
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                {["pending", "confirmed"].includes(order.status) ? (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancel(order.id)}
                  >
                    Cancel
                  </button>
                ) : (
                  <span style={{ color: "#888", fontSize: "0.85rem" }}>-</span>
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
