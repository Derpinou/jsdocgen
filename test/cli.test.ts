import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { inflateSync } from 'node:zlib';
import { generate, silentLogger, version } from '../dist/index.js';
import { fixture, runCli } from './helpers.ts';

const LEGACY = fixture('legacy');
const SOURCES = ['--source', 'src/SomeClass.js', '--custom', 'docs/index.yml'];

describe('docgen', () => {
	let directory: string;
	before(async () => {
		directory = await mkdtemp(join(tmpdir(), 'jsdocgen-test-'));
	});
	after(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it('prints its version and its help', () => {
		assert.deepEqual(runCli(['--version'], LEGACY), { code: 0, stdout: `${version}\n`, stderr: '' });
		const help = runCli(['--help'], LEGACY);
		assert.equal(help.code, 0);
		assert.match(help.stdout, /^Usage: docgen --source <path\.\.\.> \[options\]/);
	});

	it('explains the mistakes in its arguments', () => {
		const unknown = runCli(['--source', 'src', '--unknown'], LEGACY);
		assert.equal(unknown.code, 1);
		assert.match(unknown.stderr, /Unknown option '--unknown'/);
		assert.match(unknown.stderr, /Run "docgen --help" to see the available options\./);

		const missing = runCli(['--output', 'docs.json'], LEGACY);
		assert.equal(missing.code, 1);
		assert.match(missing.stderr, /^Missing required argument: source/);
	});

	it('writes the docs, creating the output directory', async () => {
		const output = join(directory, 'nested', 'docs.json');
		const result = runCli([...SOURCES, '--output', output, '--spaces', '2'], LEGACY, { SOURCE_DATE_EPOCH: '0' });
		assert.equal(result.code, 0, result.stderr);
		assert.match(result.stdout, /Serializing documentation with format version 20\.\.\.\nWriting to .*docs\.json\.\.\.\nDone!\n$/);

		const content = readFileSync(output, 'utf8');
		assert.ok(content.startsWith('{\n  "meta": {\n    "generator"'), 'indented with 2 spaces');
		const expected = await generate({ cwd: LEGACY, source: 'src/SomeClass.js', custom: 'docs/index.yml', date: 0, logger: silentLogger });
		assert.deepEqual(JSON.parse(content), JSON.parse(JSON.stringify(expected)));
	});

	it('compresses the docs with --compress', () => {
		const output = join(directory, 'docs.json.gz');
		const result = runCli([...SOURCES, '--output', output, '--compress'], LEGACY);
		assert.equal(result.code, 0, result.stderr);
		assert.match(result.stdout, /Compressing\.\.\./);
		const docs = JSON.parse(inflateSync(readFileSync(output)).toString('utf8'));
		assert.equal(docs.meta.format, 20);
		assert.deepEqual(docs.classes.map((item: { name: string }) => item.name), ['ClassyClass']);
	});

	it('reads its options from --config', async () => {
		const output = join(directory, 'from-config.json');
		const config = join(directory, 'docgen.yml');
		await writeFile(config, `source: src/SomeClass.js\ncustom: docs/index.yml\noutput: ${JSON.stringify(output)}\n`);
		const result = runCli(['--config', config], LEGACY);
		assert.equal(result.code, 0, result.stderr);
		assert.deepEqual(Object.keys(JSON.parse(readFileSync(output, 'utf8')).custom), ['general', 'examples']);
	});

	it('fails with a readable message', () => {
		const result = runCli(['--source', 'src/Missing.js'], LEGACY);
		assert.equal(result.code, 1);
		assert.equal(result.stderr, 'Source "src/Missing.js" does not exist.\n');
	});
});
