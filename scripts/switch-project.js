#!/usr/bin/env node
// Script para alternar projetos
console.log('Switch project');

const fs = require('fs');
const path = require('path');

const projects = {
  'empresa': {
    rootDir: '/home/usuario/sites/empresa',
    port: 8080
  },
  'portfolio': {
    rootDir: '/home/usuario/sites/portfolio', 
    port: 8081
  },
  'blog': {
    rootDir: '/home/usuario/sites/blog',
    port: 8082
  }
};

const projectName = process.argv[2];

if (!projectName || !projects[projectName]) {
  console.log('Uso: node switch-project.js <projeto>');
  console.log('Projetos disponíveis:', Object.keys(projects).join(', '));
  process.exit(1);
}

const config = {
  ...projects[projectName],
  host: '0.0.0.0',
  log: true,
  indexFiles: ['index.html', 'home.html']
};

fs.writeFileSync('micro-server.config.json', JSON.stringify(config, null, 2));
console.log(`Configuração alterada para projeto: ${projectName}`);
console.log(`Diretório: ${config.rootDir}`);
console.log(`Porta: ${config.port}`);