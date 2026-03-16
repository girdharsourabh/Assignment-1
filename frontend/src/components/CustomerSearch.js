import React, { useState } from 'react';
import { searchCustomers, createCustomer } from '../api';

function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [message, setMessage] = useState(null);

  // BUG: No debounce - API call on every keystroke
  // BUG: No loading state, no error handling - blank results if API fails
  // const handleSearch = async (value) => {
  //   setQuery(value);
  //   if (value.length > 0) {
  //     const data = await searchCustomers(value);
  //     setResults(data);
  //   } else {
  //     setResults([]);
  //   }
  // };

  // debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const data = await searchCustomers(query);

        if (data.error) {
          setMessage({ type: 'error', text: data.error });
          setResults([]);
        } else {
          setResults(data);
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to search customers' });
      }

      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAddCustomer = async () => {
    // BUG: No client-side validation either - sends empty strings to the
    // backend which also has no validation
    // added client-side validation 
    if (!newName || !newEmail) {
      setMessage({ type: 'error', text: 'Name and email are required' });
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(newEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    try {
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

        if (query) setQuery(query); // refresh search
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create customer' });
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

      {loading && <p style={{ color: '#999' }}>Searching...</p>}

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
        <div
          style={{
            background: '#f9f9f9',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}
        >
          <div className="form-group">
            <label>Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>

          <button className="submit-btn" onClick={handleAddCustomer}>
            Save Customer
          </button>
        </div>
      )}

      {results.length > 0 ? (
        results.map((customer) => (
          <div className="customer-card" key={customer.id}>
            <h3>{customer.name}</h3>
            <p>{customer.email} • {customer.phone}</p>
          </div>
        ))
      ) : (
        !loading &&
        query.length > 0 && (
          <p style={{ color: '#999' }}>No customers found.</p>
        )
      )}
    </div>
  );
}

export default CustomerSearch;
