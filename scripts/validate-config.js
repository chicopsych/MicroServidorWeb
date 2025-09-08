#!/usr/bin/env node
// Script para validar configuração
console.log('Validate config');

const fs = require('fs');
const path = require('path');

function validateConfig(configPath = 'micro-server.config.json') {
  try {
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Arquivo de configuração não encontrado: ${configPath}`);
      return false;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Validar rootDir
    if (!config.rootDir) {
      console.error('❌ Campo "rootDir" é obrigatório');
      return false;
    }

    const resolvedPath = path.resolve(config.rootDir);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ Diretório não existe: ${resolvedPath}`);
      return false;
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      console.error(`❌ Caminho não é um diretório: ${resolvedPath}`);
      return false;
    }

    // Verificar se tem arquivos HTML
    const files = fs.readdirSync(resolvedPath);
    const hasHtml = files.some(f => f.endsWith('.html') || f.endsWith('.htm'));
    
    if (!hasHtml) {
      console.warn(`⚠️  Nenhum arquivo HTML encontrado em: ${resolvedPath}`);
    }

    // Verificar arquivos de índice
    if (config.indexFiles) {
      const foundIndex = config.indexFiles.find(idx => 
        fs.existsSync(path.join(resolvedPath, idx))
      );
      
      if (!foundIndex) {
        console.warn(`⚠️  Nenhum arquivo de índice encontrado: ${config.indexFiles.join(', ')}`);
      } else {
        console.log(`✅ Arquivo de índice encontrado: ${foundIndex}`);
      }
    }

    console.log('✅ Configuração válida!');
    console.log(`📁 Diretório: ${resolvedPath}`);
    console.log(`🌐 Porta: ${config.port || 3000}`);
    console.log(`🖥️  Host: ${config.host || '0.0.0.0'}`);
    
    return true;

  } catch (error) {
    console.error('❌ Erro ao validar configuração:', error.message);
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const configPath = process.argv[2] || 'micro-server.config.json';
  validateConfig(configPath);
}

module.exports = { validateConfig };