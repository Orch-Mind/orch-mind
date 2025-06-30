#!/bin/bash

# Script to install Hyperswarm dependencies for P2P sharing

echo "🔧 Installing Hyperswarm dependencies..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Install hyperswarm and related packages
echo "📦 Installing hyperswarm..."
npm install hyperswarm hypercore-crypto b4a --save

# Install types if available
echo "📦 Installing TypeScript types..."
npm install @types/hyperswarm @types/b4a --save-dev 2>/dev/null || echo "ℹ️  Types not available, continuing..."

echo "✅ Hyperswarm installation complete!"
echo ""
echo "📝 Note: Hyperswarm requires native modules that may need rebuilding for Electron."
echo "   Run 'npm run electron:rebuild' if you encounter issues." 