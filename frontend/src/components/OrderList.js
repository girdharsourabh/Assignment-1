import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:3001/api";

function OrderList() {

  const [orders, setOrders] = useState([]);

  const statusOptions = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled"
  ];

  const fetchOrders = async () => {

    const response = await fetch(`${API_URL}/orders`);
    const data = await response.json();
    setOrders(data);

  };

  useEffect(() => {
    fetchOrders();
  }, []);


  const handleStatusChange = async (id, status) => {

    await fetch(`${API_URL}/orders/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    fetchOrders();

  };


  // CANCEL ORDER FUNCTION
  const handleCancel = async (id) => {

    const confirmCancel = window.confirm("Cancel this order?");

    if (!confirmCancel) return;

    await fetch(`${API_URL}/orders/${id}/cancel`, {
      method: "PATCH"
    });

    fetchOrders();

  };


  return (

    <div>

      <h2>Orders</h2>

      <table border="1" cellPadding="10">

        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {orders.map((order) => (

            <tr key={order.id}>

              <td>{order.id}</td>
              <td>{order.customer_name}</td>
              <td>{order.product_name}</td>
              <td>{order.quantity}</td>
              <td>{order.total_amount}</td>

              <td>

                <select
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


                {(order.status === "pending" || order.status === "confirmed") && (

                  <button
                    style={{
                      marginLeft: "10px",
                      background: "red",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer"
                    }}
                    onClick={() => handleCancel(order.id)}
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