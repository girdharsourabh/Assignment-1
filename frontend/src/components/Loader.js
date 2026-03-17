import React from 'react';
import './Loader.css';

export default function Loader({ size = 32, color = '#333', style = {} }) {
  return (
    <div className="loader" style={{ width: size, height: size, ...style }}>
      <div className="spinner" style={{ borderColor: `${color} transparent transparent transparent` }} />
    </div>
  );
}
