#!/bin/bash

# =============================================================================
# Volleyball Scorekeeping Content Upload Script
# =============================================================================
# This script uploads the scorekeeping.txt content to Supabase via the
# /api/embed-text endpoint, making it available to the AI chatbot via RAG.
#
# Usage: ./scripts/upload-scorekeeping.sh [BASE_URL]
# 
# Examples:
#   # Local development (default):
#   ./scripts/upload-scorekeeping.sh
#
#   # Against local dev server on different port:
#   ./scripts/upload-scorekeeping.sh http://localhost:3000
#
#   # Against production/staging server:
#   ./scripts/upload-scorekeeping.sh https://myapp.vercel.app
#
# Prerequisites:
#   - SUPABASE_URL environment variable must be set
#   - SUPABASE_SERVICE_KEY environment variable must be set
#   - OPENAI_API_KEY environment variable must be set
# =============================================================================

set -e

# Load environment variables from .env.local
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
else
  echo "⚠️  Warning: .env.local not found. Make sure environment variables are set."
fi

BASE_URL="${1:-http://localhost:3001}"

echo "📋 Volleyball Scorekeeping Content Upload to Supabase"
echo "====================================================="
echo "🌐 Server: $BASE_URL"
echo "📂 File: public/scorekeeping.txt"
echo ""

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: Supabase credentials not configured"
  echo "   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OpenAI API key not configured"
  echo "   Set OPENAI_API_KEY in .env.local"
  exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Embed the scorekeeping text file
echo "🧠 Processing and embedding scorekeeping content..."
echo "   (This may take 1-2 minutes as it embeds all chunks...)"
EMBED_RESPONSE=$(curl -s --max-time 300 -X POST \
  -H "Content-Type: application/json" \
  -d '{"filePath":"scorekeeping.txt","source":"Volleyball Scorekeeping Guide"}' \
  "$BASE_URL/api/embed-text")

# Check for empty response
if [ -z "$EMBED_RESPONSE" ]; then
  echo "❌ No response from server. The request may have timed out or the server is unreachable."
  echo "   Check that your server is running and accessible at: $BASE_URL"
  exit 1
fi

# Check for error
if echo "$EMBED_RESPONSE" | grep -q '"error"'; then
  echo "❌ Embedding failed:"
  echo "$EMBED_RESPONSE"
  exit 1
fi

# Check for success message
if echo "$EMBED_RESPONSE" | grep -q '"inserted"'; then
  echo "✅ Upload response received"
else
  echo "⚠️  Unexpected response from server:"
  echo "$EMBED_RESPONSE"
  exit 1
fi

# Extract inserted count
INSERTED_COUNT=$(echo "$EMBED_RESPONSE" | grep -o '"inserted":[0-9]*' | cut -d':' -f2)

echo "✅ Embedded $INSERTED_COUNT chunks into Supabase database"
echo ""

# Verify RAG is working with a scorekeeping query
echo "🔍 Verifying RAG search with scorekeeping query..."
TEST_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"How do you record substitutions on a volleyball score sheet?","limit":2}' \
  "$BASE_URL/api/rag-search")

if echo "$TEST_RESPONSE" | grep -q '"results"'; then
  echo "✅ RAG search verified and working!"
else
  echo "⚠️  RAG verification returned unexpected response"
  echo "$TEST_RESPONSE" | head -c 200
fi

echo ""
echo "====================================================="
echo "🎉 Scorekeeping content successfully uploaded!"
echo ""
echo "📊 Database Status:"
echo "   - Content: Stored in Supabase 'rules_embeddings' table"
echo "   - Available to: AI chatbot and RAG search"
echo "   - Scope: Production-ready for all users"
echo ""
echo "🤖 Users can now ask the chatbot:"
echo "   • How do I fill out a volleyball score sheet?"
echo "   • How do you record timeouts?"
echo "   • What happens at the court change in set 5?"
echo "   • How are substitutions recorded?"
echo ""
