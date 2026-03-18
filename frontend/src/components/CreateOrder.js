import React, { useState, useEffect } from 'react';
import { fetchCustomers, fetchProducts, createOrder } from '../api';

function CreateOrder() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductData, setSelectedProductData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, productsData] = await Promise.all([
          fetchCustomers(),
          fetchProducts(),
        ]);
        setCustomers(customersData);
        setProducts(productsData);
      } catch (err) {
        setMessage({ type: 'error', text: err.message || 'Failed to load form data' });
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedProductData(null);
      return;
    }

    const product = products.find((p) => p.id === parseInt(selectedProduct, 10));
    setSelectedProductData(product || null);
  }, [products, selectedProduct]);

  const validateForm = () => {
    const errors = {};

    if (!selectedCustomer) {
      errors.customer_id = 'Customer is required';
    }

    if (!selectedProduct) {
      errors.product_id = 'Product is required';
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      errors.quantity = 'Quantity must be a positive integer';
    }

    if (!address.trim()) {
      errors.shipping_address = 'Shipping address is required';
    }

    return errors;
  };

  const handleSubmit = async () => {
    setMessage(null);

    const errors = validateForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createOrder({
        customer_id: parseInt(selectedCustomer, 10),
        product_id: parseInt(selectedProduct, 10),
        quantity: parseInt(quantity, 10),
        shipping_address: address.trim(),
      });

      setMessage({ type: 'success', text: `Order #${result.id} created successfully!` });
      setFieldErrors({});
      setSelectedCustomer('');
      setSelectedProduct('');
      setQuantity('1');
      setAddress('');
      setSelectedProductData(null);
    } catch (err) {
      if (err.response?.fields) {
        setFieldErrors(err.response.fields);
      } else {
        setMessage({ type: 'error', text: err.message || 'Failed to create order' });
      }
    } finally {
      setIsSubmitting(false);
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
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
        >
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email})
            </option>
          ))}
        </select>
        {fieldErrors.customer_id && (
          <div className="field-error">{fieldErrors.customer_id}</div>
        )}
      </div>

      <div className="form-group">
        <label>Product</label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
        >
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} - ₹{p.price} (Stock: {p.inventory_count})
            </option>
          ))}
        </select>
        {fieldErrors.product_id && (
          <div className="field-error">{fieldErrors.product_id}</div>
        )}
      </div>

      <div className="form-group">
        <label>Quantity</label>
        <input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        {fieldErrors.quantity && (
          <div className="field-error">{fieldErrors.quantity}</div>
        )}
      </div>

      {selectedProductData && (
        <div
          style={{
            padding: '0.5rem',
            background: '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          Selected: <strong>{selectedProductData.name}</strong> — ₹
          {selectedProductData.price} × {quantity || 0} = ₹
          {(selectedProductData.price * (parseInt(quantity, 10) || 0)).toLocaleString()}
          <br />
          <small>Available: {selectedProductData.inventory_count} units</small>
        </div>
      )}

      <div className="form-group">
        <label>Shipping Address</label>
        <textarea
          rows="2"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter shipping address..."
        />
        {fieldErrors.shipping_address && (
          <div className="field-error">{fieldErrors.shipping_address}</div>
        )}
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Placing Order...' : 'Place Order'}
      </button>
    </div>
  );
}

export default CreateOrder;