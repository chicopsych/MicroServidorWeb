import * as path from 'node:path';
import * as fs from 'node:fs';
import { startMicroServer } from './micro-server-http.js';

function getArg(flag: string): string | undefined {
	const idx = process.argv.indexOf(flag);
	if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
	// Também permitir formato --flag=valor
	const withEq = process.argv.find(a => a.startsWith(flag + '='));
	if (withEq) return withEq.split('=')[1];
	return undefined;
}

// 1. Carregar config JSON (se existir) - caminhos candidatos
const explicitConfigPath = getArg('--config');
const candidatePaths = [
	explicitConfigPath,
	path.join(process.cwd(), 'micro-server.config.json'),
	path.join(process.cwd(), 'microserver.config.json'),
	path.join(process.cwd(), 'server.config.json')
].filter(Boolean) as string[];

type ExtConfig = {
	port?: number | undefined;
	host?: string | undefined;
	rootDir?: string | undefined;
	indexFiles?: string[] | undefined;
	log?: boolean | undefined;
};
let fileConfig: Partial<ExtConfig> = {};
let loadedConfigFile: string | null = null;
for (const p of candidatePaths) {
	try {       
		if (fs.existsSync(p)) {
			const raw = fs.readFileSync(p, 'utf8');
			fileConfig = JSON.parse(raw);
			loadedConfigFile = p;
			break;
		}
	} catch (e) {
		console.error(`Falha ao ler config ${p}:`, e);
		process.exit(1);
	}
}

// 2. Variáveis de ambiente
const envConfig: Partial<ExtConfig> = {
	rootDir: process.env.MICRO_SERVER_ROOT || undefined,
	host: process.env.MICRO_SERVER_HOST || undefined,
	port: process.env.MICRO_SERVER_PORT ? Number(process.env.MICRO_SERVER_PORT) : undefined,
	log: process.env.MICRO_SERVER_LOG ? /^(1|true|yes)$/i.test(process.env.MICRO_SERVER_LOG) : undefined
};

// 3. Argumentos CLI
const cliConfig: Partial<ExtConfig> = {
	rootDir: getArg('--rootDir') || undefined,
	host: getArg('--host') || undefined,
	port: getArg('--port') ? Number(getArg('--port')!) : undefined,
	log: getArg('--log') ? /^(1|true|yes)$/i.test(getArg('--log')!) : undefined
};

// Precedência: CLI > ENV > FILE > defaults (aplicado no start)
const merged: Partial<ExtConfig> = {
	...fileConfig,
	...envConfig,
	...cliConfig
};

// Normalizações
if (merged.port !== undefined && (Number.isNaN(merged.port) || merged.port <= 0)) {
	console.error('Porta inválida em config/env/CLI.');
	process.exit(1);
}

if (merged.rootDir) {
	merged.rootDir = path.resolve(merged.rootDir);
} else {
	merged.rootDir = process.cwd();
}

if (!fs.existsSync(merged.rootDir) || !fs.statSync(merged.rootDir).isDirectory()) {
	console.error(`Diretório raiz inválido: ${merged.rootDir}`);
	process.exit(1);
}

startMicroServer({
	port: merged.port ?? 3000,
	rootDir: merged.rootDir,
	host: merged.host || '0.0.0.0',
	log: merged.log ?? true
});

if (loadedConfigFile) {
	console.log(`Config carregada de: ${loadedConfigFile}`);
}

// Ajuda básica se solicitado
if (process.argv.includes('--help')) {
		console.log(`\nUso: node dist/index.js [opções]\n\nOpções:\n  --config <arquivo>    Caminho do JSON de configuração (padrão: micro-server.config.json)\n  --rootDir <caminho>   Diretório a servir (CLI sobrescreve config/env)\n  --port <n>            Porta (MICRO_SERVER_PORT) [padrão: 3000]\n  --host <host>         Host (MICRO_SERVER_HOST) [padrão: 0.0.0.0]\n  --log <true|false>    Ativa/desativa log (MICRO_SERVER_LOG)\n  --help                Mostra esta ajuda\n\nOrdem de precedência: CLI > Variáveis de Ambiente > Arquivo JSON > Defaults\n`);
}
