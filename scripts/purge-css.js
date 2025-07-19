// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * CSS Neural Purification Script
 * 
 * Intent simbólico: Eliminar neurônios não utilizados do córtex visual,
 * mantendo apenas sinapses ativas que contribuem para a interface neural-simbólica.
 * 
 * Este script usa PurgeCSS para remover estilos CSS não utilizados dos componentes
 * do Orch-Mind, resultando em um sistema mais eficiente e responsivo.
 */

const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Diretórios e padrões de arquivos relevantes
const SRC_DIR = path.join(__dirname, '..', 'src');
const CSS_FILES = glob.sync(`${SRC_DIR}/**/*.css`);
const CONTENT_FILES = glob.sync(`${SRC_DIR}/**/*.{js,jsx,ts,tsx}`);

// Log neurônico: número de arquivos encontrados
console.log(`🧠 Analisando ${CSS_FILES.length} arquivos CSS...`);
console.log(`🔍 Buscando em ${CONTENT_FILES.length} arquivos de conteúdo...`);

async function purgeUnusedCSS() {
  try {
    const results = await new PurgeCSS().purge({
      content: CONTENT_FILES,
      css: CSS_FILES,
      // Preservar comentários com Copyright e metadados
      defaultExtractor: content => {
        const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
        return [...broadMatches, ...innerMatches];
      }
    });

    // Escrever os resultados otimizados de volta nos arquivos
    let totalSaved = 0;
    let totalOriginal = 0;

    results.forEach(result => {
      const originalSize = fs.statSync(result.file).size;
      totalOriginal += originalSize;
      
      fs.writeFileSync(result.file, result.css);
      
      const newSize = result.css.length;
      totalSaved += (originalSize - newSize);
      
      const percentReduction = ((originalSize - newSize) / originalSize * 100).toFixed(2);
      console.log(`✅ ${path.basename(result.file)}: ${percentReduction}% redução`);
    });

    console.log(`\n🧠 Purificação neural completa!`);
    console.log(`📊 Economia total: ${(totalSaved / 1024).toFixed(2)}KB (${(totalSaved / totalOriginal * 100).toFixed(2)}%)`);
  } catch (error) {
    console.error('❌ Erro na purificação neural:', error);
    process.exit(1);
  }
}

purgeUnusedCSS();