import React, { useEffect, useState } from 'react';
import { createOrder, fetchCustomers, fetchProducts } from '../api';

function CreateOrder() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState(null);
  const [selectedProductData, setSelectedProductData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [customerData, productData] = await Promise.all([
          fetchCustomers(),
          fetchProducts(),
        ]);

        setCustomers(customerData);
        setProducts(productData);
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedProductData(null);
      return;
    }

    const product = products.find((item) => item.id === Number.parseInt(selectedProduct, 10));
    setSelectedProductData(product || null);
  }, [products, selectedProduct]);

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedProduct || !address.trim()) {
      setMessage({ type: 'error', text: 'Please fill all fields.' });
      return;
    }

    if (quantity < 1) {
      setMessage({ type: 'error', text: 'Quantity must be at least 1.' });
      return;
    }

    try {
      const result = await createOrder({
        customer_id: Number.parseInt(selectedCustomer, 10),
        product_id: Number.parseInt(selectedProduct, 10),
        quantity,
        shipping_address: address.trim(),
      });

      const refreshedProducts = await fetchProducts();
      setProducts(refreshedProducts);
      setMessage({ type: 'success', text: `Order #${result.id} created successfully.` });
      setSelectedCustomer('');
      setSelectedProduct('');
      setQuantity(1);
      setAddress('');
      setSelectedProductData(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="create-order">
      <h2>Create New Order</h2>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="form-group">
        <label>Customer</label>
        <select value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>
          <option value="">Select customer...</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} ({customer.email})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Product</label>
        <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>
          <option value="">Select product...</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} - Rs {product.price} (Stock: {product.inventory_count})
            </option>
          ))}
        </select>
      </div>

      {selectedProductData && (
        <div className="product-summary">
          Selected: <strong>{selectedProductData.name}</strong> - Rs {selectedProductData.price} x {quantity} ={' '}
          Rs {(selectedProductData.price * quantity).toLocaleString('en-IN')}
          <br />
          <small>Available: {selectedProductData.inventory_count} units</small>
        </div>
      )}

      <div className="form-group">
        <label>Quantity</label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(event) => setQuantity(Number.parseInt(event.target.value, 10) || 1)}
        />
      </div>

      <div className="form-group">
        <label>Shipping Address</label>
        <textarea
          rows="2"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Enter shipping address..."
        />
      </div>

      <button className="submit-btn" onClick={handleSubmit}>
        Place Order
      </button>
    </div>
  );
}

export default CreateOrder;
