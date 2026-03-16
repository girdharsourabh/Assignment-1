#!/usr/bin/env node

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3001,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Health check response:', response);
        if (response.status === 'ok') {
          console.log('✅ Health check passed');
          process.exit(0);
        } else {
          console.log('❌ Health check failed: Invalid status');
          process.exit(1);
        }
      } catch (error) {
        console.log('❌ Health check failed: Invalid JSON response');
        process.exit(1);
      }
    });
  } else {
    console.log(`❌ Health check failed: HTTP ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.log('❌ Health check failed:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Health check failed: Request timeout');
  req.destroy();
  process.exit(1);
});

req.end();
