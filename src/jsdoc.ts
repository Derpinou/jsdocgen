import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Logger } from './logger.js';

const require = createRequire(import.meta.url);
const JSDOC = require.resolve('jsdoc/jsdoc.js');
const PLUGIN = fileURLToPath(new URL('./plugin/index.js', import.meta.url));

/** JSDoc's default pattern, extended to the extensions of TypeScript and ES modules */
export const DEFAULT_INCLUDE_PATTERN = '.+\\.(?:[cm]?[jt]sx?|jsdoc)$';
/** JSDoc's default pattern: files and directories starting with an underscore */
const DEFAULT_EXCLUDE_PATTERN = '(^|\\/|\\\\)_';
/** jsdoc-babel, which the TypeScript setups of discord.js-docgen relied on */
const LEGACY_BABEL_PLUGIN = /(?:^|[\\/])jsdoc-babel(?:[\\/]|$)/;

export interface JsdocConfig {
	plugins?: string[];
	source?: {
		include?: string[];
		exclude?: string[];
		includePattern?: string;
		excludePattern?: string;
		[key: string]: unknown;
	};
	babel?: {
		extensions?: unknown;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export interface RunJsdocOptions {
	/** Absolute paths of the files to parse */
	files: readonly string[];
	/** Absolute paths of the directories to parse recursively */
	directories: readonly string[];
	/** JSDoc configuration file of the project */
	configPath?: string;
	/** Directory JSDoc runs in, relative paths of its configuration are resolved from it */
	cwd: string;
	logger: Logger;
}

/**
 * Runs JSDoc in explain mode (`jsdoc -X`) and returns the doclets it finds.
 * The project configuration is used with jsdocgen's plugin added in front of its plugins.
 */
export async function runJsdoc(options: RunJsdocOptions): Promise<unknown[]> {
	const userConfig = options.configPath ? await readJsdocConfig(options.configPath) : {};
	const config = buildJsdocConfig(userConfig, options.logger, {
		cwd: options.cwd,
		configDirectory: options.configPath === undefined ? undefined : dirname(options.configPath)
	});
	warnAboutIgnoredFiles(options.files, config, options.cwd, options.logger);

	const directory = await mkdtemp(join(tmpdir(), 'jsdocgen-'));
	try {
		const configPath = join(directory, 'jsdoc.json');
		await writeFile(configPath, JSON.stringify(config));
		const { code, stdout, stderr } = await run(process.execPath, [
			JSDOC,
			'--explain',
			'--configure', configPath,
			...options.directories.length > 0 ? ['--recurse'] : [],
			...options.files,
			...options.directories
		], options.cwd);

		if (code !== 0) throw new Error(`JSDoc failed with exit code ${code}:\n${(stderr || stdout).trim()}`);
		for (const line of stderr.split(/\r?\n/)) if (line.trim()) options.logger.warn(line);

		let doclets: unknown;
		try {
			doclets = JSON.parse(stdout);
		} catch {
			// JSDoc prints a message instead of JSON when it has nothing to parse
			throw new Error(`JSDoc did not return any documentation: ${stdout.trim().split(/\r?\n/, 1)[0] || 'empty output'}`);
		}
		if (!Array.isArray(doclets)) throw new Error('JSDoc returned an unexpected output.');
		return doclets;
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

export interface ConfigLocation {
	/** Directory JSDoc runs in */
	cwd: string;
	/** Directory of the JSDoc configuration file of the project */
	configDirectory?: string;
}

/**
 * Adds the jsdocgen plugin and TypeScript files to a JSDoc configuration.
 * jsdoc-babel, only used to read TypeScript, is dropped: the plugin replaces it.
 */
export function buildJsdocConfig(userConfig: JsdocConfig, logger: Logger, location?: ConfigLocation): JsdocConfig {
	const config = JSON.parse(JSON.stringify(userConfig)) as JsdocConfig;
	if (config.plugins !== undefined && (!Array.isArray(config.plugins) || !config.plugins.every(plugin => typeof plugin === 'string'))) {
		throw new Error('The "plugins" option of the JSDoc configuration must be a list of paths.');
	}

	const plugins = (config.plugins ?? []).filter(plugin => {
		if (!LEGACY_BABEL_PLUGIN.test(plugin) || !handlesOnlyTypeScript(config.babel)) return true;
		logger.warn(`The "${plugin}" JSDoc plugin has been skipped: jsdocgen reads TypeScript on its own, so it can be removed from the JSDoc configuration, along with the "babel" options.`);
		return false;
	});

	return {
		...config,
		plugins: [PLUGIN, ...location ? plugins.map(plugin => resolvePlugin(plugin, location)) : plugins],
		source: {
			...config.source,
			includePattern: config.source?.includePattern ?? DEFAULT_INCLUDE_PATTERN
		}
	};
}

/**
 * JSDoc looks for a plugin in the current directory, then next to its configuration file, then in
 * its own directory. The configuration given to JSDoc is a copy written elsewhere, so the plugins
 * found next to the original file get an absolute path.
 */
function resolvePlugin(plugin: string, { cwd, configDirectory }: ConfigLocation): string {
	if (isAbsolute(plugin) || configDirectory === undefined || canLoad(resolve(cwd, plugin))) return plugin;
	const besideConfig = resolve(configDirectory, plugin);
	return canLoad(besideConfig) ? besideConfig : plugin;
}

function canLoad(path: string): boolean {
	if (existsSync(path)) return true;
	try {
		require.resolve(path);
		return true;
	} catch {
		return false;
	}
}

function handlesOnlyTypeScript(babel: JsdocConfig['babel']): boolean {
	const extensions = babel?.extensions;
	return Array.isArray(extensions) && extensions.length > 0 && extensions.every(extension => typeof extension === 'string' && /^\.?[cm]?tsx?$/i.test(extension));
}

/** JSDoc silently skips the files its patterns exclude, which is confusing when they are given explicitly. */
function warnAboutIgnoredFiles(files: readonly string[], config: JsdocConfig, cwd: string, logger: Logger): void {
	let include: RegExp;
	let exclude: RegExp | null;
	try {
		include = new RegExp(config.source?.includePattern ?? DEFAULT_INCLUDE_PATTERN);
		const excludePattern = config.source?.excludePattern ?? DEFAULT_EXCLUDE_PATTERN;
		exclude = excludePattern ? new RegExp(excludePattern) : null;
	} catch {
		// JSDoc reports the invalid patterns itself
		return;
	}
	const excludedPaths = (config.source?.exclude ?? []).map(path => resolve(cwd, path));

	const ignored = files.filter(file => !include.test(file) || exclude?.test(file) || excludedPaths.some(path => file.startsWith(path)));
	if (ignored.length > 0) {
		logger.warn(`JSDoc will ignore ${ignored.length} source file${ignored.length === 1 ? '' : 's'} because of the "source" options of its configuration (includePattern, excludePattern or exclude): ${ignored.join(', ')}`);
	}
}

/** Reads a JSDoc configuration file: JSON (comments allowed, like JSDoc does) or a JavaScript module. */
export async function readJsdocConfig(path: string): Promise<JsdocConfig> {
	let config: unknown;
	try {
		if (['.js', '.cjs', '.mjs'].includes(extname(path).toLowerCase())) {
			const module = await import(pathToFileURL(path).href) as { default?: unknown };
			config = module.default ?? module;
		} else {
			config = JSON.parse(stripJsonComments(stripByteOrderMark(await readFile(path, 'utf8'))));
		}
	} catch (error) {
		throw new Error(`Unable to read the JSDoc configuration ${path}: ${error instanceof Error ? error.message : error}`, { cause: error });
	}
	if (typeof config !== 'object' || config === null || Array.isArray(config)) {
		throw new Error(`The JSDoc configuration ${path} must contain an object.`);
	}
	return config as JsdocConfig;
}

function stripByteOrderMark(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Removes the comments of a JSON document, keeping its line breaks. */
export function stripJsonComments(json: string): string {
	let result = '';
	let index = 0;
	while (index < json.length) {
		const char = json[index];
		const next = json[index + 1];
		if (char === '"') {
			let end = index + 1;
			while (end < json.length && json[end] !== '"') end += json[end] === '\\' ? 2 : 1;
			result += json.slice(index, end + 1);
			index = end + 1;
		} else if (char === '/' && next === '/') {
			const end = json.indexOf('\n', index);
			index = end === -1 ? json.length : end;
		} else if (char === '/' && next === '*') {
			const end = json.indexOf('*/', index + 2);
			const stop = end === -1 ? json.length : end + 2;
			result += json.slice(index, stop).replace(/[^\r\n]/g, ' ');
			index = stop;
		} else {
			result += char;
			index++;
		}
	}
	return result;
}

interface RunResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

function run(command: string, args: string[], cwd: string): Promise<RunResult> {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
		child.on('error', reject);
		child.on('close', code => resolvePromise({
			code,
			stdout: Buffer.concat(stdout).toString('utf8'),
			stderr: Buffer.concat(stderr).toString('utf8')
		}));
	});
}
