# Orch-OS Deployment & Auto-Update Guide

This guide covers the complete deployment process for Orch-OS using GitHub Releases and electron-updater for automatic updates.

## 🚀 Quick Start

### Publishing a New Release

```bash
# Patch version (0.0.1 → 0.0.2)
npm run publish:patch

# Minor version (0.0.1 → 0.1.0)
npm run publish:minor

# Major version (0.0.1 → 1.0.0)
npm run publish:major

# Platform-specific releases
npm run publish:mac
npm run publish:win
npm run publish:linux
```

### Manual GitHub Workflow

You can also trigger releases manually via GitHub Actions:

1. Go to the [Actions tab](https://github.com/guiferrarib/orch-mind/actions)
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter the version (e.g., `v1.0.0`)

## 📋 Prerequisites

### Environment Setup

1. **GitHub Token**: Required for CI/CD
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   # or
   export GH_TOKEN=your_github_token_here
   ```

2. **Repository Access**: Ensure you have push access to the repository

3. **Dependencies**: All dependencies should be installed
   ```bash
   npm ci
   ```

## 🔧 Configuration Details

### electron-updater Configuration

The app is configured with the following settings in `package.json`:

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "guiferrarib",
        "repo": "orch-mind",
        "private": true,
        "releaseType": "release"
      }
    ],
    "generateUpdatesFilesForAllChannels": true,
    "electronUpdaterCompatibility": ">= 2.16"
  }
}
```

### Auto-Update Features

- **Automatic Download**: Updates download automatically when available
- **Install on Quit**: Updates install when the app is closed
- **Security**: Downgrades disabled, only stable releases
- **Logging**: Comprehensive logging with electron-log
- **Progress Tracking**: Real-time download progress
- **User Notifications**: UI notifications for available updates

## 🛠️ Development & Testing

### Testing Auto-Updates Locally

1. **Enable Development Mode**:
   ```bash
   export NODE_ENV=development
   export ENABLE_UPDATER_DEV=true
   ```

2. **Use Development Config**: The `dev-app-update.yml` file is automatically used

3. **Test Update Flow**:
   - Create a test release on GitHub
   - Run the app in development mode
   - Trigger update check manually

### Development Commands

```bash
# Build without publishing
npm run build

# Build for specific platforms
npm run dist:mac
npm run dist:win
npm run dist:linux

# Build all platforms
npm run dist:all
```

## 📁 Generated Files

After building, the following files are generated for auto-updates:

- `latest.yml` / `latest-mac.yml` / `latest-linux.yml`: Update metadata
- `*.blockmap`: Binary diff files for efficient updates
- Application installers (`.pkg`, `.exe`, `.AppImage`)

## 🔄 Update Process Flow

### For End Users

1. **Automatic Check**: App checks for updates every hour
2. **Download**: Updates download in the background
3. **Notification**: User receives notification when ready
4. **Installation**: User can install immediately or on next restart

### For Developers

1. **Version Bump**: Script automatically updates version
2. **Build**: Application is built for all platforms
3. **Git Tag**: Version tag is created and pushed
4. **GitHub Release**: Release is created with all artifacts
5. **Auto-Update Files**: Metadata files are uploaded for electron-updater

## 🚨 Troubleshooting

### Common Issues

1. **Update Check Fails**:
   - Verify GitHub token permissions
   - Check repository access
   - Ensure release exists

2. **Download Fails**:
   - Check network connectivity
   - Verify release artifacts exist
   - Check electron-updater logs

3. **Installation Fails**:
   - Check file permissions
   - Verify app signature (if code signing enabled)
   - Check available disk space

### Debug Logging

Enable verbose logging:

```javascript
// In main process
autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "debug"
```

Log files are located at:
- **macOS**: `~/Library/Logs/Orch-Mind/main.log`
- **Windows**: `%USERPROFILE%\AppData\Roaming\Orch-Mind\logs\main.log`
- **Linux**: `~/.config/Orch-Mind/logs/main.log`

## 🔐 Security Considerations

- **Code Signing**: Currently disabled (`CSC_IDENTITY_AUTO_DISCOVERY=false`)
- **Private Repository**: Updates served from private GitHub repo
- **Downgrade Protection**: Prevents malicious downgrades
- **Stable Releases Only**: Pre-releases disabled by default

## 📊 Monitoring

### GitHub Releases

Monitor releases at: https://github.com/guiferrarib/orch-mind/releases

### Update Analytics

Track update adoption through:
- GitHub release download statistics
- Application logs
- User feedback

## 🔄 Rollback Strategy

If a release has issues:

1. **Immediate**: Delete the problematic release from GitHub
2. **New Release**: Create a new release with higher version number
3. **Hotfix**: Use patch version for critical fixes

## 📚 Additional Resources

- [electron-updater Documentation](https://www.electron.build/auto-update.html)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)
- [Electron Builder Configuration](https://www.electron.build/configuration/configuration)

---

**Note**: This deployment system is designed for the Orch-OS neural-symbolic AI desktop application with automatic update capabilities for seamless user experience.
