#!/bin/bash

echo "Building NYC Subway Tracker Frontend for Cloudflare Pages..."
echo ""

# Validate configuration
echo "Validating configuration..."
node validate-config.js --validate-pages

if [ $? -ne 0 ]; then
  exit 1
fi

echo ""

# Build the frontend
echo "Building frontend with Vite..."
npm run build

if [ $? -ne 0 ]; then
  echo "Error: Frontend build failed"
  exit 1
fi

echo "✓ Frontend build complete"
echo ""

echo "Build successful! Ready to deploy to Cloudflare Pages:"
echo "  wrangler pages deploy dist/public --project-name=nyc-subway-tracker"
echo ""
echo "Make sure you've also:"
echo "  1. Deployed the Worker API (./build-worker.sh && wrangler deploy)"
echo "  2. Configured ALLOWED_ORIGIN in wrangler.toml to match your Pages URL"
