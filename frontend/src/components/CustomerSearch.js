import React, { useState } from 'react';
import { createCustomer, searchCustomers } from '../api';

function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [message, setMessage] = useState(null);

  const handleSearch = async (value) => {
    setQuery(value);

    if (value.length === 0) {
      setResults([]);
      return;
    }

    try {
      const data = await searchCustomers(value);
      setResults(data);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setResults([]);
    }
  };

  const handleAddCustomer = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required.' });
      return;
    }

    try {
      const result = await createCustomer({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
      });

      setMessage({ type: 'success', text: `Customer "${result.name}" added.` });
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setShowAdd(false);

      if (query) {
        await handleSearch(query);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="customer-search">
      <h2>Customer Search</h2>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <input
        className="search-input"
        type="text"
        placeholder="Search customers by name..."
        value={query}
        onChange={(event) => handleSearch(event.target.value)}
      />

      <div style={{ marginBottom: '1rem' }}>
        <button
          className="submit-btn"
          style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showAdd && (
        <div className="inline-panel">
          <div className="form-group">
            <label>Name</label>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
          </div>
          <button className="submit-btn" onClick={handleAddCustomer}>Save Customer</button>
        </div>
      )}

      {results.length > 0 ? (
        results.map((customer) => (
          <div className="customer-card" key={customer.id}>
            <h3>{customer.name}</h3>
            <p>{customer.email} | {customer.phone}</p>
          </div>
        ))
      ) : (
        query.length > 0 && <p style={{ color: '#999' }}>No customers found.</p>
      )}
    </div>
  );
}

export default CustomerSearch;
