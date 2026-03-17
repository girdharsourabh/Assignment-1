import React, { useState } from 'react';
import { login } from '../api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    const result = await login(username, password);
    setLoading(false);

    if (result && result.error) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    setMessage({ type: 'success', text: 'Logged in.' });
    onLogin && onLogin();
  };

  return (
    <div style={{ maxWidth: 420, margin: '2rem auto' }}>
      <h2>Login</h2>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="form-group">
        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Logging in…' : 'Login'}
      </button>
    </div>
  );
}

export default Login;

