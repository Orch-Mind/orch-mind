#!/usr/bin/env node

/**
 * Script de teste para verificar funcionalidade do DuckDB
 * Execute: npm run test-duckdb
 */

const { app } = require('electron');
const path = require('path');

// Import DuckDB Helper
const { DuckDBHelper } = require('../dist-electron/DuckDBHelper.js');

async function testDuckDB() {
  console.log('🧪 Iniciando teste do DuckDB...\n');
  
  // Mock app.getPath for testing
  if (!app.getPath) {
    app.getPath = (name) => {
      if (name === 'userData') {
        return path.join(process.env.HOME || '/tmp', 'Library', 'Application Support', 'orch-os-test');
      }
      return '/tmp';
    };
  }

  const duckDB = new DuckDBHelper();
  
  try {
    // Test 1: Initialize
    console.log('📡 1. Inicializando DuckDB...');
    await duckDB.initialize();
    console.log('✅ DuckDB inicializado com sucesso');
    
    // Test 2: Clear any existing data
    console.log('\n🗑️ 2. Limpando dados existentes...');
    await duckDB.clearVectors();
    console.log('✅ Dados limpos');
    
    // Test 3: Store test vectors
    console.log('\n💾 3. Armazenando vetores de teste...');
    const testVectors = [
      {
        id: 'test-doc-1',
        values: [0.1, 0.2, 0.3, 0.4, 0.5],
        metadata: { type: 'document', title: 'Test Document 1' }
      },
      {
        id: 'test-doc-2', 
        values: [0.15, 0.25, 0.35, 0.45, 0.55],
        metadata: { type: 'document', title: 'Test Document 2' }
      },
      {
        id: 'test-doc-3',
        values: [0.8, 0.7, 0.6, 0.5, 0.4],
        metadata: { type: 'document', title: 'Test Document 3' }
      }
    ];
    
    for (const vector of testVectors) {
      await duckDB.storeVector(vector.id, vector.values, vector.metadata);
      console.log(`   ✅ Armazenado: ${vector.id}`);
    }
    
    // Test 4: Get vector count
    console.log('\n📊 4. Verificando contagem de vetores...');
    const count = await duckDB.getVectorCount();
    console.log(`✅ Total de vetores: ${count}`);
    
    // Test 5: Query similar vectors
    console.log('\n🔍 5. Testando busca por similaridade...');
    const queryVector = [0.12, 0.22, 0.32, 0.42, 0.52]; // Similar to test-doc-1 and test-doc-2
    const results = await duckDB.findSimilarVectors(queryVector, 5, 0.7);
    
    console.log(`✅ Encontrados ${results.length} vetores similares:`);
    results.forEach((result, index) => {
      console.log(`   ${index + 1}. ID: ${result.id}`);
      console.log(`      Score: ${result.score.toFixed(4)}`);
      console.log(`      Metadata:`, result.metadata);
      console.log('');
    });
    
    // Test 6: Test with different threshold
    console.log('\n🎯 6. Testando com threshold mais baixo (0.5)...');
    const resultsLowThreshold = await duckDB.findSimilarVectors(queryVector, 5, 0.5);
    console.log(`✅ Encontrados ${resultsLowThreshold.length} vetores com threshold 0.5`);
    
    // Test 7: Test with completely different vector
    console.log('\n🌐 7. Testando com vetor muito diferente...');
    const differentVector = [0.9, 0.8, 0.7, 0.6, 0.5];
    const differentResults = await duckDB.findSimilarVectors(differentVector, 5, 0.8);
    console.log(`✅ Encontrados ${differentResults.length} vetores similares ao vetor diferente`);
    
    await duckDB.close();
    console.log('\n🎉 Todos os testes passaram! DuckDB está funcionando corretamente.');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
    await duckDB.close();
    process.exit(1);
  }
}

// Se não estivermos no Electron, simular o ambiente
if (!process.versions.electron) {
  console.log('⚠️  Executando fora do Electron, simulando ambiente...\n');
  
  // Simular electron app
  global.app = {
    getPath: (name) => {
      if (name === 'userData') {
        return path.join(process.env.HOME || '/tmp', 'Library', 'Application Support', 'orch-os-test');
      }
      return '/tmp';
    }
  };
}

testDuckDB().catch(console.error); 