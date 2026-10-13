import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { generate, version, type Docs, type DocsItemMeta } from '../dist/index.js';
import { assertMatchesExpected, fixture, recordingLogger } from './helpers.ts';

function generateTypeScriptFixture(logger = recordingLogger()): Promise<Docs> {
	return generate({ cwd: fixture('typescript'), source: 'src', custom: 'docs/index.yml', jsdoc: 'jsdoc.json', date: 0, logger });
}

describe('generate', () => {
	it('produces the docs of discord.js-docgen 0.9 for its own test project', async () => {
		const logger = recordingLogger();
		const docs = await generate({ cwd: fixture('legacy'), source: 'src/SomeClass.js', custom: 'docs/index.yml', date: 0, logger });
		// expected.json is the output of discord.js-docgen 0.9.0, with a normalized date and generator
		assertMatchesExpected(docs, fixture('legacy', 'expected.json'));
		assert.deepEqual(logger.warnings, ['- "exports" (member of "module", src/SomeClass.js:70) has no accessible parent.']);
		// The custom docs and the JSDocs are loaded in parallel
		assert.deepEqual([...logger.logs].sort(), [
			'Parsing JSDocs in source files...',
			'Loading custom docs files...',
			'3 custom docs files in 2 categories loaded.',
			'10 JSDoc items parsed.',
			'Serializing documentation with format version 20...'
		].sort());
	});

	it('documents TypeScript projects', async () => {
		const logger = recordingLogger();
		const docs = await generateTypeScriptFixture(logger);
		assertMatchesExpected(docs, fixture('typescript', 'expected.json'));
		assert.deepEqual(logger.warnings, []);
		assert.equal(docs.meta.generator, version);
		assert.equal(docs.meta.format, 20);
	});

	it('points at the exact line of every TypeScript item', async () => {
		const docs = await generateTypeScriptFixture();
		const root = fixture('typescript');
		const check = (name: string | undefined, meta: DocsItemMeta, virtual = false) => {
			const source = readFileSync(join(root, meta.path!, meta.file!), 'utf8').split('\n');
			const line = source[meta.line! - 1]!;
			if (virtual) {
				// Items declared by a comment (@event, @typedef...) point at the comment
				assert.match(line, /^\s*\/\*\*/, `${name} should point at its comment, not "${line}"`);
			} else {
				// A decorated item starts with its decorators
				const declaration = line.trim().startsWith('@') ? source[meta.line!]! : line;
				assert.ok(declaration.includes(name!), `${name} should be declared at ${meta.file}:${meta.line}, not "${line}"`);
			}
		};
		for (const item of docs.classes) {
			check(item.name, item.meta);
			for (const prop of item.props ?? []) check(prop.name, prop.meta);
			for (const method of item.methods ?? []) check(method.name, method.meta);
			for (const event of item.events ?? []) check(event.name, event.meta, true);
		}
		for (const item of [...docs.typedefs, ...docs.externals]) check(item.name, item.meta, true);
	});

	it('documents incomplete and unsupported items instead of crashing like discord.js-docgen', async () => {
		const logger = recordingLogger();
		// As written to the docs.json file, without the undefined fields
		const docs = JSON.parse(JSON.stringify(await generate({ cwd: fixture('incomplete'), source: 'src', date: 0, logger }))) as Docs;
		const [foo] = docs.classes;
		assert.deepEqual(foo?.props?.[0]?.type, []);
		assert.deepEqual(foo?.methods?.[0]?.params?.[0]?.type, []);
		assert.deepEqual(foo?.methods?.[0]?.returns, { types: [], description: 'The thing' });
		assert.deepEqual(docs.typedefs.map(typedef => [typedef.name, typedef.type]), [['Options', [[['Object']]]], ['Untyped', []]]);
		assert.deepEqual(logger.warnings.sort(), [
			'- "CONSTANT" (src/constant.js:5) is not documented: the kind "constant" is not supported.',
			'- "foo" (member of "Options", src/typedef-member.js:5) has no accessible parent.'
		]);
	});

	it('runs the JSDoc plugins of the project, found next to its configuration', async () => {
		const docs = await generate({ cwd: fixture('plugins'), source: 'src', jsdoc: 'config/jsdoc.json', logger: recordingLogger() });
		assert.equal(docs.classes[0]?.description, 'GREETS PEOPLE');
		assert.equal(docs.classes[0]?.methods?.[0]?.description, 'SAYS HELLO');
	});

	it('uses SOURCE_DATE_EPOCH as the generation date', async () => {
		process.env.SOURCE_DATE_EPOCH = '1700000000';
		try {
			const docs = await generate({ cwd: fixture('legacy'), source: 'src', logger: recordingLogger() });
			assert.equal(docs.meta.date, 1_700_000_000_000);
		} finally {
			delete process.env.SOURCE_DATE_EPOCH;
		}
	});

	it('reports the sources that do not exist', async () => {
		const options = { cwd: fixture('typescript'), logger: recordingLogger() };
		await assert.rejects(generate({ ...options, source: 'src/Missing.ts' }), /Source "src\/Missing\.ts" does not exist\./);
		await assert.rejects(generate({ ...options, source: 'src/**/*.java' }), /No source file matches "src\/\*\*\/\*\.java"\./);
	});

	it('explains why JSDoc found nothing to parse', async () => {
		const logger = recordingLogger();
		await assert.rejects(
			generate({ cwd: fixture('typescript'), source: 'docs/guides/getting-started.md', logger }),
			/JSDoc did not return any documentation: There are no input files to process\./
		);
		assert.equal(logger.warnings.length, 1);
		assert.match(logger.warnings[0]!, /JSDoc will ignore 1 source file because of the "source" options/);
	});
});
