import React, { useEffect, useRef, useState } from 'react';
import { searchCustomers, createCustomer } from '../api';

function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [message, setMessage] = useState(null);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const requestId = ++latestRequestIdRef.current;
    const t = setTimeout(async () => {
      const data = await searchCustomers(trimmed);
      if (latestRequestIdRef.current !== requestId) return; // ignore stale response
      setResults(Array.isArray(data) ? data : []);
    }, 300);

    return () => clearTimeout(t);
  }, [query]);

  const handleAddCustomer = async () => {
    const result = await createCustomer({
      name: newName,
      email: newEmail,
      phone: newPhone,
    });

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Customer "${result.name}" added!` });
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setShowAdd(false);
      // Refresh search
      const trimmed = query.trim();
      if (trimmed) {
        const requestId = ++latestRequestIdRef.current;
        const data = await searchCustomers(trimmed);
        if (latestRequestIdRef.current !== requestId) return;
        setResults(Array.isArray(data) ? data : []);
      }
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
        onChange={(e) => setQuery(e.target.value)}
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
        <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <div className="form-group">
            <label>Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </div>
          <button className="submit-btn" onClick={handleAddCustomer}>Save Customer</button>
        </div>
      )}

      {results.length > 0 ? (
        results.map((customer, idx) => (
          <div className="customer-card" key={idx}>
            <h3>{customer.name}</h3>
            <p>{customer.email} • {customer.phone}</p>
          </div>
        ))
      ) : (
        query.length > 0 && <p style={{ color: '#999' }}>No customers found.</p>
      )}
    </div>
  );
}

export default CustomerSearch;
