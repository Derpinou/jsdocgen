import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { parseArguments, type CliOptions } from '../dist/options.js';

async function optionsOf(argv: string[]): Promise<CliOptions> {
	const parsed = await parseArguments(argv);
	if (parsed.command !== 'generate') assert.fail(`Expected options, got the ${parsed.command} command`);
	return parsed.options;
}

describe('parseArguments', () => {
	it('applies the defaults', async () => {
		assert.deepEqual(await optionsOf(['--source', 'src']), {
			source: ['src'],
			custom: undefined,
			root: '.',
			output: undefined,
			spaces: 0,
			jsdoc: undefined,
			verbose: false,
			compress: false
		});
	});

	it('takes every value following --source, like the shell expansion of a glob', async () => {
		const options = await optionsOf(['--jsdoc', 'jsdoc.json', '--source', 'src/a.ts', 'src/b.ts', '--custom', 'docs/index.yml']);
		assert.deepEqual(options.source, ['src/a.ts', 'src/b.ts']);
		assert.equal(options.jsdoc, 'jsdoc.json');
		assert.equal(options.custom, 'docs/index.yml');
	});

	it('accepts the aliases of the options', async () => {
		assert.deepEqual(await optionsOf(['-s', 'a.js', '-i', 'b.js', 'c.js', '-c', 'index.yml', '-r', 'root', '-o', 'docs.json', '-S', '2', '-j', 'jsdoc.json', '-V', '--compress']), {
			source: ['a.js', 'b.js', 'c.js'],
			custom: 'index.yml',
			root: 'root',
			output: 'docs.json',
			spaces: 2,
			jsdoc: 'jsdoc.json',
			verbose: true,
			compress: true
		});
	});

	it('handles --help and --version', async () => {
		assert.deepEqual(await parseArguments(['--help']), { command: 'help' });
		assert.deepEqual(await parseArguments(['-v']), { command: 'version' });
	});

	it('rejects invalid arguments', async () => {
		await assert.rejects(parseArguments([]), { name: 'UsageError', message: 'Missing required argument: source' });
		await assert.rejects(parseArguments(['--source', 'src', '--unknown']), { name: 'UsageError', message: /Unknown option '--unknown'/ });
		await assert.rejects(parseArguments(['--source', 'src', '--spaces', 'two']), { name: 'UsageError', message: /--spaces expects a number/ });
	});

	describe('--config', () => {
		let directory: string;
		before(async () => {
			directory = await mkdtemp(join(tmpdir(), 'jsdocgen-test-'));
		});
		after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		async function configFile(name: string, content: string): Promise<string> {
			const path = join(directory, name);
			await writeFile(path, content);
			return path;
		}

		it('reads the options of a YAML or JSON file, overridden by the arguments', async () => {
			const yaml = await configFile('docgen.yml', 'source:\n  - src\n  - lib\ncustom: docs/index.yml\nspaces: 2\nverbose: true\n');
			assert.deepEqual(await optionsOf(['--config', yaml, '--spaces', '4', '--no-verbose']), {
				source: ['src', 'lib'],
				custom: 'docs/index.yml',
				root: '.',
				output: undefined,
				spaces: 4,
				jsdoc: undefined,
				verbose: false,
				compress: false
			});

			const json = await configFile('docgen.json', '{"source": "src", "output": "docs.json"}');
			const options = await optionsOf(['-C', json, '--source', 'lib']);
			assert.deepEqual(options.source, ['lib']);
			assert.equal(options.output, 'docs.json');
		});

		const invalid: [string, string, RegExp][] = [
			['unknown-key.yml', 'sources: src', /unknown option "sources"/],
			['bad-type.yml', 'source: src\nspaces: -1', /"spaces" must be a positive integer/],
			['bad-source.json', '{"source": [1]}', /"source" must be a path or a list of paths/],
			['not-an-object.json', '[]', /it must contain an object/],
			['docgen.toml', 'source = "src"', /Unknown config file type/]
		];
		for (const [name, content, message] of invalid) {
			it(`rejects ${name}`, async () => {
				await assert.rejects(parseArguments(['--config', await configFile(name, content)]), { name: 'UsageError', message });
			});
		}
	});
});
