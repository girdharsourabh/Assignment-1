import React, { useState } from 'react';
import OrderList from './components/OrderList';
import CreateOrder from './components/CreateOrder';
import CustomerSearch from './components/CustomerSearch';
import './App.css';

const TABS = {
  ORDERS: 'orders',
  CREATE: 'create',
  CUSTOMERS: 'customers'
};

function App() {
  const [activeTab, setActiveTab] = useState(TABS.ORDERS);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Order Management System</h1>
        <nav className="tab-nav">
          <button
            className={activeTab === TABS.ORDERS ? 'active' : ''}
            onClick={() => setActiveTab(TABS.ORDERS)}
          >
            Orders
          </button>
          <button
            className={activeTab === TABS.CREATE ? 'active' : ''}
            onClick={() => setActiveTab(TABS.CREATE)}
          >
            New Order
          </button>
          <button
            className={activeTab === TABS.CUSTOMERS ? 'active' : ''}
            onClick={() => setActiveTab(TABS.CUSTOMERS)}
          >
            Customer Search
          </button>
        </nav>
      </header>

      <main className="app-content">
        {activeTab === TABS.ORDERS && <OrderList />}
        {activeTab === TABS.CREATE && <CreateOrder />}
        {activeTab === TABS.CUSTOMERS && <CustomerSearch />}
      </main>
    </div>
  );
}

export default App;