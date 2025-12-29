#!/bin/bash

# =============================================================================
# Volleyball Canada Rulebook Upload Script
# =============================================================================
# Usage: ./scripts/upload-rulebook.sh /path/to/rulebook.pdf [BASE_URL]
# 
# Examples:
#   ./scripts/upload-rulebook.sh ~/Downloads/volleyball-canada-rules.pdf
#   ./scripts/upload-rulebook.sh ~/Downloads/rules.pdf https://myapp.vercel.app
# =============================================================================

set -e

# Check if PDF path provided
if [ -z "$1" ]; then
  echo "❌ Error: Please provide the path to the rulebook PDF"
  echo ""
  echo "Usage: $0 /path/to/rulebook.pdf [BASE_URL]"
  echo ""
  echo "Examples:"
  echo "  $0 ~/Downloads/volleyball-canada-rules.pdf"
  echo "  $0 ~/Downloads/rules.pdf https://myapp.vercel.app"
  exit 1
fi

PDF_PATH="$1"
BASE_URL="${2:-http://localhost:3001}"

# Check if file exists
if [ ! -f "$PDF_PATH" ]; then
  echo "❌ Error: File not found: $PDF_PATH"
  exit 1
fi

echo "🏐 Volleyball Canada Rulebook Upload"
echo "======================================"
echo "📄 PDF: $PDF_PATH"
echo "🌐 Server: $BASE_URL"
echo ""

# Step 1: Upload the PDF
echo "📤 Step 1: Uploading PDF to Supabase storage..."
UPLOAD_RESPONSE=$(curl -s -X POST -F "file=@$PDF_PATH" "$BASE_URL/api/upload-rules")

# Check for error
if echo "$UPLOAD_RESPONSE" | grep -q '"error"'; then
  echo "❌ Upload failed: $UPLOAD_RESPONSE"
  exit 1
fi

# Extract path from response
PDF_STORAGE_PATH=$(echo "$UPLOAD_RESPONSE" | grep -o '"path":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PDF_STORAGE_PATH" ]; then
  echo "❌ Failed to get storage path from response: $UPLOAD_RESPONSE"
  exit 1
fi

echo "✅ Uploaded to: $PDF_STORAGE_PATH"
echo ""

# Step 2: Embed the PDF
echo "🧠 Step 2: Processing and embedding rulebook (this may take 30-60 seconds)..."
EMBED_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"$PDF_STORAGE_PATH\"}" \
  "$BASE_URL/api/embed-rules")

# Check for error
if echo "$EMBED_RESPONSE" | grep -q '"error"'; then
  echo "❌ Embedding failed: $EMBED_RESPONSE"
  exit 1
fi

# Extract inserted count
INSERTED_COUNT=$(echo "$EMBED_RESPONSE" | grep -o '"inserted":[0-9]*' | cut -d':' -f2)

echo "✅ Embedded $INSERTED_COUNT chunks into the database"
echo ""

# Step 3: Verify RAG is working
echo "🔍 Step 3: Verifying RAG search..."
TEST_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"What is a fault in volleyball?","limit":2}' \
  "$BASE_URL/api/rag-search")

if echo "$TEST_RESPONSE" | grep -q '"results"'; then
  echo "✅ RAG search is working!"
else
  echo "⚠️  RAG verification returned unexpected response: $TEST_RESPONSE"
fi

echo ""
echo "======================================"
echo "🎉 Rulebook upload complete!"
echo ""
echo "You can now use:"
echo "  • Quiz generation at /quiz"
echo "  • AI Tutor chatbot"
echo "  • Lesson modules at /learn"
echo "  • Scenario builder"
echo "======================================"

