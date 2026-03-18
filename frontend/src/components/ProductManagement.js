import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct } from '../api';

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newInventory, setNewInventory] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await fetchProducts();
    setProducts(data);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const result = await createProduct({
      name: newName,
      description: newDescription,
      price: parseFloat(newPrice),
      inventory_count: parseInt(newInventory),
    });

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Product "${result.name}" added!` });
      setNewName('');
      setNewDescription('');
      setNewPrice('');
      setNewInventory('');
      setShowAdd(false);
      loadProducts();
    }
  };

  return (
    <div className="product-management">
      <h2>Product Management</h2>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <button
          className="submit-btn"
          style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddProduct} style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <div className="form-group">
            <label>Name</label>
            <input required value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Price</label>
            <input type="number" step="0.01" required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Initial Inventory</label>
            <input type="number" required value={newInventory} onChange={(e) => setNewInventory(e.target.value)} />
          </div>
          <button type="submit" className="submit-btn" style={{ background: '#1a1a2e' }}>Save Product</button>
        </form>
      )}

      <table className="order-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Inventory</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <strong>{product.name}</strong>
                <br />
                <small style={{ color: '#666' }}>{product.description}</small>
              </td>
              <td>₹{parseFloat(product.price).toFixed(2)}</td>
              <td>{product.inventory_count}</td>
              <td>{new Date(product.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductManagement;
