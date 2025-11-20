#!/usr/bin/env node

// Validation script for production builds
// Ensures VITE_API_URL is set when building for Cloudflare Pages deployment

const fs = require('fs');
const path = require('path');

function validateConfig() {
  // Check if we're in a production Pages build context
  // This script should be run manually before Pages deployment
  const viteApiUrl = process.env.VITE_API_URL;
  
  if (!viteApiUrl || viteApiUrl.trim() === '') {
    console.error('\n❌ ERROR: VITE_API_URL is not configured\n');
    console.error('For Cloudflare Pages deployment, you must set VITE_API_URL');
    console.error('to point to your Cloudflare Workers API URL.\n');
    console.error('Example:');
    console.error('  export VITE_API_URL=https://nyc-subway-tracker.your-subdomain.workers.dev');
    console.error('  npm run build\n');
    console.error('Or create a .env.production file with:');
    console.error('  VITE_API_URL=https://nyc-subway-tracker.your-subdomain.workers.dev\n');
    console.error('For local builds or VPS deployment, this check can be skipped.\n');
    process.exit(1);
  }
  
  console.log('✓ VITE_API_URL is configured:', viteApiUrl);
}

// Only validate if explicitly requested
if (process.argv.includes('--validate-pages')) {
  validateConfig();
} else {
  console.log('Skipping API URL validation (use --validate-pages to enable)');
}
