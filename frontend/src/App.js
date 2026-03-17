import React, { useEffect, useState } from 'react';
import OrderList from './components/OrderList';
import CreateOrder from './components/CreateOrder';
import CustomerSearch from './components/CustomerSearch';
import Login from './components/Login';
import { fetchMe, logout } from './api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [me, setMe] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const refreshMe = async () => {
    const result = await fetchMe();
    setAuthChecked(true);
    if (result && result.error) {
      setMe(null);
      return;
    }
    setMe(result);
  };

  useEffect(() => {
    refreshMe();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Order Management System</h1>
        {me ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ opacity: 0.9, fontSize: 14 }}>
                Signed in as <b>{me.username}</b>
              </span>
              <button
                className="submit-btn"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.9rem' }}
                onClick={async () => {
                  await logout();
                  setActiveTab('orders');
                  await refreshMe();
                }}
              >
                Logout
              </button>
            </div>
            <nav className="tab-nav">
              <button
                className={activeTab === 'orders' ? 'active' : ''}
                onClick={() => setActiveTab('orders')}
              >
                Orders
              </button>
              <button
                className={activeTab === 'create' ? 'active' : ''}
                onClick={() => setActiveTab('create')}
              >
                New Order
              </button>
              <button
                className={activeTab === 'customers' ? 'active' : ''}
                onClick={() => setActiveTab('customers')}
              >
                Customer Search
              </button>
            </nav>
          </>
        ) : null}
      </header>

      <main className="app-content">
        {!authChecked ? (
          <p style={{ color: '#999' }}>Loading…</p>
        ) : !me ? (
          <Login onLogin={refreshMe} />
        ) : (
          <>
            {activeTab === 'orders' && <OrderList />}
            {activeTab === 'create' && <CreateOrder />}
            {activeTab === 'customers' && <CustomerSearch />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
