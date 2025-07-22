# Documentação Técnica do Orch-Mind

Bem-vindo ao centro de documentação do Orch-Mind. Estes documentos fornecem uma visão aprofundada da arquitetura, funcionalidades e diretrizes de contribuição do projeto.

## Começando

Se você é novo no projeto, comece por aqui.

- **[Guia de Setup para Desenvolvedores](./Developer_Setup.md)**: Instruções passo a passo para configurar seu ambiente de desenvolvimento local.
- **[Guia de Contribuição](./Contributing.md)**: Diretrizes sobre como relatar bugs, sugerir funcionalidades e submeter Pull Requests.

## Arquitetura e Features Avançadas

Explore os documentos abaixo para entender o funcionamento interno das principais funcionalidades do Orch-Mind.

- **[01 - Treinamento de IA e Ajuste Fino](./features/01_AI_Training_and_Tuning.md)**: Uma visão geral sobre o processo de treinamento de modelos.
- **[02 - Fusão e Implantação de Adaptadores](./features/02_Adapter_Merging_and_Deployment.md)**: Como os adaptadores LoRA são combinados e implantados.
- **[03 - Rede P2P e Compartilhamento de Adaptadores](./features/03_P2P_Network.md)**: Detalhes sobre a arquitetura da rede descentralizada para compartilhamento de adaptadores.
- **[04 - Banco de Dados Vetorial e Memória Semântica](./features/04_Vector_Database_and_Memory.md)**: Explicação sobre como o DuckDB é usado para criar uma memória de longo prazo para a IA.
- **[05 - Busca na Web em Tempo Real](./features/05_Web_Search.md)**: Como o Orch-Mind busca informações atualizadas na web para enriquecer suas respostas.
- **[06 - Simulação de Consciência Quântica (Orch-OS)](./features/06_Orch_OS_Quantum_Simulation.md)**: Uma análise da feature experimental que visualiza a atividade cognitiva da IA.
- **[07 - Treinamento de Adaptadores LoRA](./features/07_LoRA_Training.md)**: O guia detalhado sobre o fluxo de treinamento de LoRA, desde a preparação dos dados até a criação do adaptador.
- **[08 - Aprendizado Federado](./features/08_Federated_Learning.md)**: A explicação do ciclo completo de aprendizado colaborativo que une treinamento local, compartilhamento P2P и fusão de adaptadores.
Nome: www
Valor: guiferrarib.github.io
```

**3. Configurar no GitHub:**
- Vá em **Settings > Pages**
- Em **Custom domain**, digite seu domínio
- Clique **Save**
- Aguarde verificação DNS (até 24h)

**4. Resultado:**
- Site disponível em seu domínio customizado
- HTTPS automático via GitHub Pages
- Redirecionamento automático configurado

### Deploy Manual (Alternativo)

Se preferir fazer deploy manual:

```bash
# 1. Build do projeto
npm run build

# 2. Install gh-pages (se necessário)
npm install -g gh-pages

# 3. Deploy para GitHub Pages
gh-pages -d dist
```
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
