// Imports de módulos core Node no modo NodeNext (evita problemas de default import)
import * as http from 'node:http';
import * as url from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

export interface MicroServerOptions {
	port?: number;
	host?: string;
	rootDir?: string; // diretório base para servir arquivos
	indexFiles?: string[]; // ordem de busca para diretórios
	log?: boolean;
}

const defaultOptions: Required<MicroServerOptions> = {
	port: 3000,
	host: '0.0.0.0',
	rootDir: process.cwd(),
	indexFiles: ['index.html', 'index.htm'],
	log: true
};

function guessContentType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	switch (ext) {
		case '.html': case '.htm': return 'text/html; charset=utf-8';
		case '.js': return 'application/javascript; charset=utf-8';
		case '.mjs': return 'application/javascript; charset=utf-8';
		case '.css': return 'text/css; charset=utf-8';
		case '.json': return 'application/json; charset=utf-8';
		case '.png': return 'image/png';
		case '.jpg': case '.jpeg': return 'image/jpeg';
		case '.gif': return 'image/gif';
		case '.svg': return 'image/svg+xml';
		case '.ico': return 'image/x-icon';
		case '.txt': return 'text/plain; charset=utf-8';
		default: return 'application/octet-stream';
	}
}

export function createMicroServer(opts: MicroServerOptions = {}) {
	const options = { ...defaultOptions, ...opts };

	const server = http.createServer(async (req, res) => {
		try {
			if (!req.url) {
				res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
				return res.end('Bad Request');
			}

			const parsed = url.parse(req.url);
			const decodedPath = decodeURIComponent(parsed.pathname || '/');

			// Impedir path traversal
			const safePath = path.normalize(decodedPath).replace(/^\.\.(?=\\|\/|$)/g, '');
			let absolutePath = path.join(options.rootDir, safePath);

			const stat = await fs.promises.stat(absolutePath).catch(() => null);
			if (stat && stat.isDirectory()) {
				// tentar index
				for (const idx of options.indexFiles) {
					const candidate = path.join(absolutePath, idx);
						// eslint-disable-next-line no-await-in-loop
					const cStat = await fs.promises.stat(candidate).catch(() => null);
					if (cStat && cStat.isFile()) {
						absolutePath = candidate;
						break;
					}
				}
			}

			const fileStat = await fs.promises.stat(absolutePath).catch(() => null);
			if (!fileStat || !fileStat.isFile()) {
				res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
				return res.end('Not Found');
			}

			res.writeHead(200, { 'Content-Type': guessContentType(absolutePath) });
			const stream = fs.createReadStream(absolutePath);
			stream.pipe(res);
			stream.on('error', (e) => {
				if (!res.headersSent) {
					res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
				}
				res.end('Internal Server Error');
				if (options.log) console.error('Stream error', e);
			});

			if (options.log) {
				console.log(`${req.method} ${decodedPath} -> ${absolutePath}`);
			}
		} catch (e) {
			res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
			res.end('Internal Server Error');
			if (options.log) console.error(e);
		}
	});

	return {
		listen(callback?: () => void) {
			server.listen(options.port, options.host, () => {
				if (options.log) {
					console.log(`MicroServer ouvindo em http://${options.host === '0.0.0.0' ? 'localhost' : options.host}:${options.port}`);
					console.log(`Servindo diretório: ${options.rootDir}`);
				}
				callback?.();
			});
			return server;
		},
		httpServer: server,
		options
	};
}

export function startMicroServer(options?: MicroServerOptions) {
	return createMicroServer(options).listen();
}

// Permite executar diretamente: node dist/serverhttp/micro-server-http.js
const invokedScript = process.argv[1];
if (invokedScript && import.meta.url === url.pathToFileURL(invokedScript).href) {
	startMicroServer();
}