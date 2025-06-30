# Script to install Hyperswarm dependencies for P2P sharing (Windows)

Write-Host "🔧 Installing Hyperswarm dependencies..." -ForegroundColor Cyan

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install hyperswarm and related packages
Write-Host "📦 Installing hyperswarm..." -ForegroundColor Yellow
npm install hyperswarm hypercore-crypto b4a --save

# Install types if available
Write-Host "📦 Installing TypeScript types..." -ForegroundColor Yellow
npm install @types/hyperswarm @types/b4a --save-dev 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ℹ️  Types not available, continuing..." -ForegroundColor Gray
}

Write-Host "✅ Hyperswarm installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Note: Hyperswarm requires native modules that may need rebuilding for Electron." -ForegroundColor Yellow
Write-Host "   Run 'npm run electron:rebuild' if you encounter issues." -ForegroundColor Yellow 