import React, { useState, useEffect } from 'react';
import { fetchCustomers, fetchProducts, createOrder } from '../api';

function CreateOrder() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customers and products
  useEffect(() => {
    fetchCustomers().then(setCustomers);
    fetchProducts().then(setProducts);
  }, []);

  const [selectedProductData, setSelectedProductData] = useState(null);
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find(p => p.id === parseInt(selectedProduct));
      setSelectedProductData(product);
    }
  }, [products, selectedProduct]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!selectedCustomer || !selectedProduct || !address) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    const available = Number(selectedProductData?.inventory_count);
    if (Number.isFinite(available) && quantity > available) {
      setMessage({ type: 'error', text: `Only ${available} units available` });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await createOrder({
        customer_id: parseInt(selectedCustomer, 10),
        product_id: parseInt(selectedProduct, 10),
        quantity,
        shipping_address: address,
      });

      if (result && result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: `Order #${result.id} created successfully!` });
        setSelectedCustomer('');
        setSelectedProduct('');
        setQuantity(1);
        setAddress('');
        setSelectedProductData(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keep quantity within available stock for selected product.
  useEffect(() => {
    const available = Number(selectedProductData?.inventory_count);
    if (!Number.isFinite(available)) return;
    if (available <= 0) {
      setQuantity(1);
      return;
    }
    setQuantity((prev) => Math.min(Math.max(prev, 1), available));
  }, [selectedProductData]);

  return (
    <div className="create-order">
      <h2>Create New Order</h2>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="form-group">
        <label>Customer</label>
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Select customer...</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Product</label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Select product...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} - ₹{p.price} (Stock: {p.inventory_count})</option>
          ))}
        </select>
      </div>

      {selectedProductData && (
        <div style={{ padding: '0.5rem', background: '#f0f0f0', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Selected: <strong>{selectedProductData.name}</strong> — ₹{selectedProductData.price} × {quantity} = ₹{(selectedProductData.price * quantity).toLocaleString()}
          <br />
          <small>Available: {selectedProductData.inventory_count} units</small>
        </div>
      )}

      <div className="form-group">
        <label>Quantity</label>
        <input
          type="number"
          min="1"
          max={selectedProductData ? selectedProductData.inventory_count : undefined}
          value={quantity}
          onChange={(e) => {
            const raw = parseInt(e.target.value, 10);
            const next = Number.isFinite(raw) ? raw : 1;
            const available = Number(selectedProductData?.inventory_count);
            const bounded = Number.isFinite(available)
              ? Math.min(Math.max(next, 1), Math.max(available, 1))
              : Math.max(next, 1);
            setQuantity(bounded);
          }}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label>Shipping Address</label>
        <textarea
          rows="2"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter shipping address..."
          disabled={isSubmitting}
        />
      </div>

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{ opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Placing…' : 'Place Order'}
      </button>
    </div>
  );
}

export default CreateOrder;
