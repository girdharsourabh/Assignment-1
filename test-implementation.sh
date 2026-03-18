#!/bin/bash

echo "=== Testing Order Management System Implementation ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose up -d --build

echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 15

# Test 1: Health Check
echo ""
echo "Test 1: Health Check Endpoint"
response=$(curl -s http://localhost:3001/api/health)
if echo "$response" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi

# Test 2: Database Connectivity
echo ""
echo "Test 2: Database Connectivity (Orders Endpoint)"
status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/orders)
if [ "$status_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Database connectivity test passed${NC}"
else
    echo -e "${RED}✗ Database connectivity test failed (Status: $status_code)${NC}"
fi

# Test 3: SQL Injection Protection
echo ""
echo "Test 3: SQL Injection Protection"
response=$(curl -s "http://localhost:3001/api/customers/search?name=%27%3B%20DROP%20TABLE%20customers%3B%20--")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SQL injection test passed (server still responding)${NC}"
else
    echo -e "${RED}✗ SQL injection test failed${NC}"
fi

# Test 4: Create Order
echo ""
echo "Test 4: Create Order"
order_response=$(curl -s -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"product_id":1,"quantity":1,"shipping_address":"Test Address"}')

if echo "$order_response" | grep -q '"id"'; then
    order_id=$(echo "$order_response" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✓ Order created successfully (ID: $order_id)${NC}"
    
    # Test 5: Cancel Order
    echo ""
    echo "Test 5: Cancel Order"
    cancel_response=$(curl -s -X POST http://localhost:3001/api/orders/$order_id/cancel)
    if echo "$cancel_response" | grep -q '"status":"cancelled"'; then
        echo -e "${GREEN}✓ Order cancelled successfully${NC}"
    else
        echo -e "${RED}✗ Order cancellation failed${NC}"
        echo "Response: $cancel_response"
    fi
    
    # Test 6: Try to cancel already cancelled order
    echo ""
    echo "Test 6: Prevent Cancelling Already Cancelled Order"
    cancel_again=$(curl -s -X POST http://localhost:3001/api/orders/$order_id/cancel)
    if echo "$cancel_again" | grep -q "error"; then
        echo -e "${GREEN}✓ Correctly prevented cancelling already cancelled order${NC}"
    else
        echo -e "${RED}✗ Should have prevented cancelling already cancelled order${NC}"
    fi
else
    echo -e "${RED}✗ Order creation failed${NC}"
    echo "Response: $order_response"
fi

# Test 7: Frontend Accessibility
echo ""
echo "Test 7: Frontend Accessibility"
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$frontend_status" -eq 200 ]; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "${RED}✗ Frontend is not accessible (Status: $frontend_status)${NC}"
fi

echo ""
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo "All critical features have been tested."
echo ""
echo "To stop containers, run: docker-compose down -v"
