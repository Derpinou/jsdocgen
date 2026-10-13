import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildJsdocConfig, DEFAULT_INCLUDE_PATTERN, stripJsonComments } from '../dist/jsdoc.js';
import { recordingLogger } from './helpers.ts';

describe('buildJsdocConfig', () => {
	it('adds the jsdocgen plugin first and reads TypeScript files by default', () => {
		const config = buildJsdocConfig({ plugins: ['plugins/markdown'], tags: { allowUnknownTags: true } }, recordingLogger());
		assert.match(config.plugins![0]!, /[\\/]dist[\\/]plugin[\\/]index\.js$/);
		assert.deepEqual(config.plugins!.slice(1), ['plugins/markdown']);
		assert.equal(config.source!.includePattern, DEFAULT_INCLUDE_PATTERN);
		assert.deepEqual(config.tags, { allowUnknownTags: true });
		for (const file of ['a.js', 'b.jsx', 'c.mjs', 'd.cjs', 'e.ts', 'f.tsx', 'g.mts', 'h.cts', 'i.jsdoc']) {
			assert.match(file, new RegExp(DEFAULT_INCLUDE_PATTERN));
		}
		assert.doesNotMatch('j.json', new RegExp(DEFAULT_INCLUDE_PATTERN));
	});

	it('keeps the source options of the project', () => {
		const config = buildJsdocConfig({ source: { includePattern: '.+\\.ts$', exclude: ['src/legacy'] } }, recordingLogger());
		assert.deepEqual(config.source, { includePattern: '.+\\.ts$', exclude: ['src/legacy'] });
	});

	it('skips jsdoc-babel when it only reads TypeScript', () => {
		const logger = recordingLogger();
		const config = buildJsdocConfig({
			plugins: ['plugins/markdown', 'node_modules/jsdoc-babel'],
			babel: { extensions: ['ts'], presets: ['@babel/preset-typescript'] }
		}, logger);
		assert.deepEqual(config.plugins!.slice(1), ['plugins/markdown']);
		assert.equal(logger.warnings.length, 1);
		assert.match(logger.warnings[0]!, /"node_modules\/jsdoc-babel" JSDoc plugin has been skipped/);
	});

	it('keeps jsdoc-babel when it reads JavaScript too', () => {
		const logger = recordingLogger();
		const config = buildJsdocConfig({ plugins: ['node_modules/jsdoc-babel'], babel: { extensions: ['js', 'ts'] } }, logger);
		assert.deepEqual(config.plugins!.slice(1), ['node_modules/jsdoc-babel']);
		assert.deepEqual(logger.warnings, []);
	});

	it('rejects invalid plugin lists', () => {
		assert.throws(() => buildJsdocConfig({ plugins: 'plugins/markdown' as unknown as string[] }, recordingLogger()), /must be a list of paths/);
	});
});

describe('stripJsonComments', () => {
	it('removes the comments and keeps the line breaks', () => {
		const json = '{\n\t// line comment\n\t"a": 1, /* block\n comment */ "b": 2\n}';
		const stripped = stripJsonComments(json);
		assert.deepEqual(JSON.parse(stripped), { a: 1, b: 2 });
		assert.equal(stripped.split('\n').length, json.split('\n').length);
	});

	it('keeps the strings that look like comments', () => {
		const json = '{"url": "https://example.com//path", "glob": "src/**/*.ts", "quote": "say \\"/*hi*/\\""}';
		assert.equal(stripJsonComments(json), json);
	});
});
