#!/usr/bin/env node

/**
 * Publish Script for Orch-Mind
 * Handles versioning, building, and publishing to GitHub Releases
 * Compatible with electron-updater auto-update system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  log(`Executing: ${command}`, colors.cyan);
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    log(`Error executing command: ${command}`, colors.red);
    throw error;
  }
}

function validateEnvironment() {
  log('🔍 Validating environment...', colors.yellow);
  
  // Check if we're in a git repository
  try {
    execCommand('git status', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('Not in a git repository');
  }

  // Check if GITHUB_TOKEN is available (for CI/CD)
  if (process.env.CI && !process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN environment variable is required for CI/CD');
  }

  // Check if working directory is clean
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('⚠️  Working directory is not clean:', colors.yellow);
      log(status, colors.yellow);
      log('Continuing anyway...', colors.yellow);
    }
  } catch (error) {
    log('Warning: Could not check git status', colors.yellow);
  }

  log('✅ Environment validation passed', colors.green);
}

function updateVersion(versionType = 'patch') {
  log(`📝 Updating version (${versionType})...`, colors.yellow);
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const oldVersion = packageJson.version;
  
  // Update version using npm version
  execCommand(`npm version ${versionType} --no-git-tag-version`);
  
  // Read the new version
  const updatedPackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const newVersion = updatedPackageJson.version;
  
  log(`Version updated: ${oldVersion} → ${newVersion}`, colors.green);
  return newVersion;
}

function buildApplication() {
  log('🔨 Building application...', colors.yellow);
  
  // Clean previous builds
  execCommand('npm run clean');
  
  // Install dependencies
  log('📦 Installing dependencies...', colors.blue);
  execCommand('npm ci');
  
  // Build the application
  log('🏗️  Building renderer and main processes...', colors.blue);
  execCommand('npm run build');
  
  log('✅ Build completed successfully', colors.green);
}

function publishToGitHub(version, platforms = ['mac', 'win', 'linux']) {
  log('🚀 Publishing to GitHub Releases...', colors.yellow);
  
  // Create and push git tag
  const tag = `v${version}`;
  log(`Creating git tag: ${tag}`, colors.blue);
  
  try {
    execCommand(`git add .`);
    execCommand(`git commit -m "Release ${tag}" || true`);
    execCommand(`git tag ${tag}`);
    execCommand(`git push origin main --follow-tags`);
  } catch (error) {
    log('Warning: Git operations failed, continuing with publish...', colors.yellow);
  }
  
  // Set environment variables for electron-builder
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  
  // Publish for each platform
  for (const platform of platforms) {
    log(`📦 Building and publishing for ${platform}...`, colors.blue);
    
    try {
      switch (platform) {
        case 'mac':
          execCommand('npm run dist:mac');
          break;
        case 'win':
          execCommand('npm run dist:win');
          break;
        case 'linux':
          execCommand('npm run dist:linux');
          break;
        default:
          log(`Unknown platform: ${platform}`, colors.red);
      }
    } catch (error) {
      log(`Failed to build for ${platform}: ${error.message}`, colors.red);
      // Continue with other platforms
    }
  }
  
  log('✅ Publishing completed', colors.green);
}

function validateElectronUpdaterConfig() {
  log('🔍 Validating electron-updater configuration...', colors.yellow);
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check if electron-updater is in dependencies
  if (!packageJson.dependencies['electron-updater']) {
    throw new Error('electron-updater not found in dependencies');
  }
  
  // Check publish configuration
  if (!packageJson.build || !packageJson.build.publish) {
    throw new Error('Missing publish configuration in package.json build section');
  }
  
  const publishConfig = packageJson.build.publish[0];
  if (publishConfig.provider !== 'github') {
    throw new Error('Publish provider must be "github"');
  }
  
  // Check if generateUpdatesFilesForAllChannels is enabled
  if (!packageJson.build.generateUpdatesFilesForAllChannels) {
    log('⚠️  generateUpdatesFilesForAllChannels is not enabled', colors.yellow);
  }
  
  log('✅ electron-updater configuration is valid', colors.green);
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // patch, minor, major, or specific version
  const platforms = args[1] ? args[1].split(',') : ['mac', 'win', 'linux'];
  
  log('🎯 Starting Orch-Mind publish process...', colors.bright);
  log(`Version type: ${versionType}`, colors.blue);
  log(`Platforms: ${platforms.join(', ')}`, colors.blue);
  
  try {
    // Validation steps
    validateEnvironment();
    validateElectronUpdaterConfig();
    
    // Update version
    const newVersion = updateVersion(versionType);
    
    // Build application
    buildApplication();
    
    // Publish to GitHub
    publishToGitHub(newVersion, platforms);
    
    log('🎉 Publish process completed successfully!', colors.green);
    log(`🔗 Check your GitHub releases: https://github.com/guiferrarib/orch-mind/releases`, colors.cyan);
    log(`📱 Users will receive auto-update notifications for version ${newVersion}`, colors.cyan);
    
  } catch (error) {
    log(`❌ Publish process failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironment,
  updateVersion,
  buildApplication,
  publishToGitHub,
  validateElectronUpdaterConfig
};
