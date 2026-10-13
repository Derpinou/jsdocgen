import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';
import { parse as parseYaml } from 'yaml';

/** Options of the command line, also accepted by the --config file */
export interface CliOptions {
	/** Source files, directories or glob patterns */
	source: string[];
	custom?: string;
	root: string;
	output?: string;
	spaces: number;
	jsdoc?: string;
	verbose: boolean;
	compress: boolean;
}

export type CliCommand =
	| { command: 'help' }
	| { command: 'version' }
	| { command: 'generate'; options: CliOptions };

/** A mistake in the arguments or the --config file */
export class UsageError extends Error {
	override name = 'UsageError';
}

export const HELP = `Usage: docgen --source <path...> [options]

Generates a docs.json file from the JSDoc comments of JavaScript and TypeScript sources.

Options:
  -s, -i, --source <path...>  Source files, directories or glob patterns to parse JSDocs in  [required]
  -c, --custom <file>         Custom docs definition file (JSON or YAML)
  -r, --root <dir>            Root directory of the project                       [default: "."]
  -o, --output <file>         Path to the output file
  -S, --spaces <number>       Number of spaces to indent the output JSON with     [default: 0]
  -j, --jsdoc <file>          Path to a JSDoc configuration file
      --compress              Compresses the output with zlib (deflate)
  -V, --verbose               Logs extra information
  -C, --config <file>         JSON/YAML file setting any of the options above
  -h, --help                  Shows this help
  -v, --version               Shows the version number

Examples:
  docgen --source src --custom docs/index.yml --output docs/docs.json
  docgen --source "src/**/*.ts" --jsdoc jsdoc.json --output stable.json
  docgen --config docgen.yml
`;

const OPTIONS = {
	source: { type: 'string', short: 's', multiple: true },
	input: { type: 'string', short: 'i', multiple: true },
	custom: { type: 'string', short: 'c' },
	root: { type: 'string', short: 'r' },
	output: { type: 'string', short: 'o' },
	spaces: { type: 'string', short: 'S' },
	jsdoc: { type: 'string', short: 'j' },
	compress: { type: 'boolean' },
	verbose: { type: 'boolean', short: 'V' },
	config: { type: 'string', short: 'C' },
	help: { type: 'boolean', short: 'h' },
	version: { type: 'boolean', short: 'v' }
} satisfies ParseArgsOptionsConfig;

type FileOptions = Partial<Omit<CliOptions, 'source'> & { source: string | string[] }>;

/**
 * Parses the command line. Like before, the values following --source are all sources:
 * `--source a.js b.js` is the same as `--source a.js --source b.js`.
 * @throws {UsageError} When an argument or the --config file is invalid
 */
export async function parseArguments(argv: readonly string[]): Promise<CliCommand> {
	let parsed;
	try {
		parsed = parseArgs({ args: [...argv], options: OPTIONS, allowPositionals: true, allowNegative: true, strict: true });
	} catch (error) {
		throw new UsageError(error instanceof Error ? error.message : String(error));
	}
	const { values, positionals } = parsed;
	if (values.help) return { command: 'help' };
	if (values.version) return { command: 'version' };

	const file = values.config === undefined ? {} : await loadConfigFile(values.config);
	const source = [...values.source ?? [], ...values.input ?? [], ...positionals];
	const options: CliOptions = {
		source: source.length > 0 ? source : typeof file.source === 'string' ? [file.source] : file.source ?? [],
		custom: values.custom ?? file.custom,
		root: values.root ?? file.root ?? '.',
		output: values.output ?? file.output,
		spaces: values.spaces === undefined ? file.spaces ?? 0 : parseSpaces(values.spaces),
		jsdoc: values.jsdoc ?? file.jsdoc,
		verbose: values.verbose ?? file.verbose ?? false,
		compress: values.compress ?? file.compress ?? false
	};
	if (options.source.length === 0) throw new UsageError('Missing required argument: source');
	return { command: 'generate', options };
}

function parseSpaces(value: string): number {
	if (!/^\d+$/.test(value)) throw new UsageError(`--spaces expects a number of spaces, got "${value}"`);
	return Number(value);
}

const STRING_OPTIONS = new Set(['custom', 'root', 'output', 'jsdoc']);
const BOOLEAN_OPTIONS = new Set(['verbose', 'compress']);

/** Loads the --config file. Its relative paths are resolved from the current directory, like the arguments. */
async function loadConfigFile(path: string): Promise<FileOptions> {
	const extension = extname(path).toLowerCase();
	if (extension !== '.json' && extension !== '.yml' && extension !== '.yaml') {
		throw new UsageError(`Unknown config file type: ${path} (expected .json, .yml or .yaml).`);
	}

	let data: unknown;
	try {
		const content = await readFile(path, 'utf8');
		data = extension === '.json' ? JSON.parse(content) : parseYaml(content);
	} catch (error) {
		throw new UsageError(`Unable to load the config file ${path}: ${error instanceof Error ? error.message : error}`);
	}
	const fail = (message: string): never => {
		throw new UsageError(`Invalid config file ${path}: ${message}`);
	};
	if (typeof data !== 'object' || data === null || Array.isArray(data)) return fail('it must contain an object.');

	for (const [key, value] of Object.entries(data)) {
		if (key === 'source') {
			const valid = typeof value === 'string' || (Array.isArray(value) && value.every(item => typeof item === 'string'));
			if (!valid) fail('"source" must be a path or a list of paths.');
		} else if (key === 'spaces') {
			if (!Number.isInteger(value) || (value as number) < 0) fail('"spaces" must be a positive integer.');
		} else if (STRING_OPTIONS.has(key)) {
			if (typeof value !== 'string') fail(`"${key}" must be a string.`);
		} else if (BOOLEAN_OPTIONS.has(key)) {
			if (typeof value !== 'boolean') fail(`"${key}" must be a boolean.`);
		} else {
			fail(`unknown option "${key}".`);
		}
	}
	return data as FileOptions;
}
