# Orch-Mind Website

Official institutional website for the Orch-Mind federated AI training platform.

## 🚀 Features

- **Modern Design**: Dark theme with neural network-inspired visuals
- **Responsive**: Optimized for desktop and mobile devices
- **Fast**: Built with Vite for lightning-fast development and builds
- **Interactive**: Smooth animations and hover effects
- **OS Detection**: Automatic download button for user's operating system
- **SEO Optimized**: Meta tags and semantic HTML structure

## 🛠 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Animations**: Framer Motion (optional)

## 📦 Installation

1. **Clone the repository** (if not already done):

   ```bash
   git clone https://github.com/guiferrarib/orch-mind.git
   cd orch-mind/website
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## 🏗 Build for Production

1. **Create production build**:
   ```bash
   npm run build
   ```

2. **Preview production build** (optional):
   ```bash
   npm run preview
   ```

The build files will be generated in the `dist/` directory.

## 🚀 Deploy to GitHub Pages

### Option 1: Manual Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to GitHub Pages**:
   ```bash
   # Install gh-pages if not already installed
   npm install -g gh-pages
   
   # Deploy to gh-pages branch
   gh-pages -d dist
   ```

### Option 2: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml` in your repository root:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: website/package-lock.json
        
    - name: Install dependencies
      run: |
        cd website
        npm ci
        
    - name: Build
      run: |
        cd website
        npm run build
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./website/dist
```

### Option 3: Netlify/Vercel

For Netlify or Vercel deployment:

1. **Connect your repository** to your hosting platform
2. **Set build settings**:
   - Build command: `cd website && npm run build`
   - Publish directory: `website/dist`
   - Node version: `18`

## 📁 Project Structure

```
website/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── Header.tsx     # Navigation header
│   │   ├── Hero.tsx       # Landing section
│   │   ├── Features.tsx   # Features showcase
│   │   ├── Download.tsx   # Download section
│   │   ├── Tokenomics.tsx # Token information
│   │   ├── Roadmap.tsx    # Development roadmap
│   │   ├── News.tsx       # News and updates
│   │   ├── Footer.tsx     # Site footer
│   │   └── NeuralBackground.tsx # Animated background
│   ├── utils/
│   │   └── detectOS.ts    # OS detection utility
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── index.html            # HTML template
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind configuration
├── vite.config.ts        # Vite configuration
└── README.md            # This file
```

## 🎨 Customization

### Colors and Themes

The website uses a custom color palette defined in `tailwind.config.js`. Key colors:

- **Primary**: Blue gradient (`#0ea5e9` to `#3b82f6`)
- **Secondary**: Purple gradient (`#a855f7` to `#8b5cf6`)
- **Background**: Dark gray (`#111827`)
- **Text**: White and gray variants

### Content Updates

To update content:

1. **Hero Section**: Edit `src/components/Hero.tsx`
2. **Features**: Modify the features array in `src/components/Features.tsx`
3. **Download Links**: Update URLs in `src/utils/detectOS.ts`
4. **Token Info**: Edit token details in `src/components/Tokenomics.tsx`
5. **Roadmap**: Update roadmap items in `src/components/Roadmap.tsx`
6. **News**: Add/edit news items in `src/components/News.tsx`

### Adding New Sections

1. Create a new component in `src/components/`
2. Import and add it to `src/App.tsx`
3. Add navigation link in `src/components/Header.tsx`

## 🔧 Configuration

### GitHub Releases Integration

The download section automatically detects the user's OS and links to GitHub releases. Update the repository URL in:

- `src/utils/detectOS.ts` - Download URLs
- `package.json` - Repository field
- `vite.config.ts` - Base path for GitHub Pages

### SEO and Meta Tags

Update meta tags in `index.html`:

- Title and description
- Open Graph tags
- Twitter Card tags
- Canonical URLs

## 🐛 Troubleshooting

### Common Issues

1. **Build fails**: Check Node.js version (requires 16+)
2. **Styles not loading**: Verify Tailwind CSS configuration
3. **GitHub Pages 404**: Ensure base path is set correctly in `vite.config.ts`
4. **Icons not showing**: Check Lucide React installation

### Development Tips

- Use `npm run dev` for hot reloading during development
- Run `npm run build` to test production builds locally
- Use browser dev tools to test responsive design
- Check console for any JavaScript errors

## 📄 License

This website is part of the Orch-Mind project and is licensed under the MIT License. See the main project's LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For major changes, please open an issue first to discuss the proposed changes.

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/guiferrarib/orch-mind/issues)
- **Telegram**: [Join our community](https://t.me/orchmind)
- **Discord**: [Chat with developers](https://discord.gg/orchmind)
- **Email**: hello@orch-mind.com

---

Built with ❤️ by the Orch-Mind community
