import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:3001/api";

function CreateOrder() {

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState("");

  const [selectedProductData, setSelectedProductData] = useState(null);

  useEffect(() => {

    const fetchData = async () => {

      const customersRes = await fetch(`${API_URL}/customers`);
      const customersData = await customersRes.json();
      setCustomers(customersData);

      const productsRes = await fetch(`${API_URL}/products`);
      const productsData = await productsRes.json();
      setProducts(productsData);

    };

    fetchData();

  }, []);

  // FIXED REACT BUG
  useEffect(() => {

    if (selectedProduct) {

      const product = products.find(
        (p) => p.id === parseInt(selectedProduct)
      );

      setSelectedProductData(product);

    }

  }, [products, selectedProduct]); // <-- FIX HERE


  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_id: customerId,
          product_id: selectedProduct,
          quantity: quantity,
          shipping_address: shippingAddress
        })
      });

      alert("Order created successfully!");

      setCustomerId("");
      setSelectedProduct("");
      setQuantity(1);
      setShippingAddress("");

    } catch (error) {

      console.error("Order creation failed", error);

    }

  };

  return (
    <div>

      <h2>Create Order</h2>

      <form onSubmit={handleSubmit}>

        <div>
          <label>Customer</label>

          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >

            <option value="">Select customer</option>

            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}

          </select>
        </div>


        <div>
          <label>Product</label>

          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            required
          >

            <option value="">Select product</option>

            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (${product.price})
              </option>
            ))}

          </select>

        </div>

        {selectedProductData && (
          <p>
            Price: ${selectedProductData.price} | Stock: {selectedProductData.inventory_count}
          </p>
        )}

        <div>
          <label>Quantity</label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

        </div>


        <div>
          <label>Shipping Address</label>

          <input
            type="text"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            required
          />

        </div>


        <button type="submit">
          Create Order
        </button>

      </form>

    </div>
  );
}

export default CreateOrder;