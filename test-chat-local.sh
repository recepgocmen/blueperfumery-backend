#!/bin/bash

# Local chat endpoint test script
echo "🧪 Testing /api/agent/chat endpoint locally..."
echo ""

# Test 1: Basic request
echo "Test 1: Basic chat request"
curl -X POST 'http://localhost:5000/api/agent/chat' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data-raw '{"message":"Erkek parfümü öner"}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "---"
echo ""

# Test 2: Empty message (should fail)
echo "Test 2: Empty message (should return 400)"
curl -X POST 'http://localhost:5000/api/agent/chat' \
  -H 'Content-Type: application/json' \
  --data-raw '{"message":""}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "---"
echo ""

# Test 3: Health check
echo "Test 3: Health check"
curl -X GET 'http://localhost:5000/api/health' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Tests completed!"
