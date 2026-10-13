import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from '@babel/parser';
import { transformSource } from '../dist/plugin/transform.js';

/** Transforms a source, checking that no line moved and that the result is valid JavaScript */
function transform(source: string, filename = 'file.ts'): string {
	const { code, warnings } = transformSource(source, filename);
	assert.deepEqual(warnings, []);
	assert.equal(code.split('\n').length, source.split('\n').length, 'lines must not move');
	parse(code, { sourceType: 'module', plugins: [['decorators', {}], 'jsx'] });
	return code;
}

function lines(code: string): string[] {
	return code.split('\n');
}

describe('TypeScript files', () => {
	it('blanks the types out without moving any character', () => {
		const source = [
			'/** A thing */',
			'export class Thing<T> implements Named {',
			'\tprivate readonly value: T;',
			'\tconstructor(value: T) {',
			'\t\tthis.value = value as T;',
			'\t}',
			'}',
			''
		].join('\n');
		const code = transform(source);
		assert.equal(code.length, source.length);
		assert.match(code, /^\/\*\* A thing \*\/\n\s+class Thing\s+\{\n\s+value\s*;\n\tconstructor\(value\s*\) \{\n\t\tthis\.value = value\s*;/);
		assert.doesNotMatch(code, /export|implements|private|readonly|: T|as T/);
	});

	it('stops the comment of a removed declaration from describing the next symbol', () => {
		const code = transform([
			'/** Describes the type only */',
			'export type Callback = () => void;',
			'export function helper() {}',
			'/** Describes the interface only */',
			'interface Options {}',
			'class Next {}',
			''
		].join('\n'));
		assert.match(lines(code)[1]!, /^;\s*$/);
		assert.match(lines(code)[4]!, /^;\s*$/);
		assert.match(lines(code)[2]!, /^\s+function helper\(\) \{\}$/);
	});

	it('lets the comment of overload signatures describe the implementation', () => {
		const code = transform([
			'/** Documents the implementation */',
			'export function fetch(id: string): string;',
			'export function fetch(id: string, force?: boolean): string;',
			'export function fetch(id: string, force = false) { return id; }',
			''
		].join('\n'));
		assert.match(lines(code)[1]!, /^\s*$/);
		assert.match(lines(code)[2]!, /^\s*$/);
		assert.match(lines(code)[3]!, /^\s+function fetch\(id\s*, force = false\)/);
	});

	it('removes enums, namespaces and import aliases, keeping the comment in front', () => {
		const code = transform([
			'/**',
			' * @typedef {string} Mode',
			' */',
			'export const enum Mode {',
			'\t/** Removed with the enum */',
			'\tA = \'a\'',
			'}',
			'export namespace Internals {',
			'\texport const secret = 1;',
			'}',
			'import fs = require(\'node:fs\');',
			'export import Alias = Mode;',
			'export class After {}',
			''
		].join('\n'));
		assert.match(code, /^\/\*\*\n \* @typedef \{string\} Mode\n \*\/\n;/);
		for (const index of [3, 7, 10, 11]) assert.match(lines(code)[index]!, /^;\s*$/);
		assert.doesNotMatch(code, /enum|namespace|Removed|secret|require|Alias/);
		assert.match(lines(code)[12]!, /^\s+class After \{\}$/);
	});

	it('turns `export = class` into a declaration and removes other `export =`', () => {
		assert.match(transform('export = class Client {};\n'), /^\s+class Client \{\};\n$/);
		assert.match(transform('const client = 1;\nexport = client;\n'), /^const client = 1;\n;\s*\n$/);
	});

	it('removes the modifiers and decorators of parameters', () => {
		const code = transform([
			'class Client {',
			'\tconstructor(@inject() private readonly token: string, public mode = 1) {}',
			'\tsend(@validate content: string) {}',
			'}',
			''
		].join('\n'));
		assert.doesNotMatch(code, /@|private|readonly|public/);
		assert.match(code, /constructor\(\s*token\s*,\s*mode = 1\) \{\}/);
		assert.match(code, /send\(\s*content\s*\) \{\}/);
	});

	it('keeps abstract members and declared fields, so they can be documented', () => {
		const code = transform([
			'export abstract class Base {',
			'\t/** Declared field */',
			'\tdeclare readonly options: object;',
			'\t/** Abstract property */',
			'\tabstract name: string;',
			'\t/** Abstract method */',
			'\tabstract start(force: boolean): Promise<void>;',
			'\t/** Without return type */',
			'\tabstract stop();',
			'\tabstract send(content: string): void;',
			'\t/** Overloaded */',
			'\tabstract send(content: number): void;',
			'}',
			'export class After {}',
			''
		].join('\n'));
		assert.match(lines(code)[2]!, /^\s+options\s*;$/);
		assert.match(lines(code)[4]!, /^\s+name\s*;$/);
		assert.match(lines(code)[6]!, /^\s+start\(force\s*\)\{\}\s*$/);
		assert.match(lines(code)[8]!, /^\s+stop\(\)\{\}\s*$/);
		assert.match(lines(code)[9]!, /^\s*$/);
		assert.match(lines(code)[11]!, /^\s+send\(content\s*\)\{\}\s*$/);
		assert.match(lines(code)[13]!, /^\s+class After \{\}$/);
	});

	it('replaces the JSX elements of TSX files', () => {
		const code = transform([
			'export class Renderer {',
			'\trender(name: string) {',
			'\t\treturn <div className="greeting">',
			'\t\t\tHello {name}',
			'\t\t</div>;',
			'\t}',
			'}',
			''
		].join('\n'), 'Renderer.tsx');
		assert.match(code, /return 0\s+;/);
		assert.doesNotMatch(code, /<|Hello/);
	});

	it('keeps only the comments of declaration files', () => {
		const source = [
			'/**',
			' * @typedef {string} Snowflake',
			' */',
			'export type Snowflake = string;',
			'declare module \'assets\' {',
			'\tconst path: \'/* not a comment */\';',
			'}',
			''
		].join('\n');
		const code = transform(source, 'types.d.ts');
		assert.equal(code.length, source.length);
		assert.equal(code.trim(), '/**\n * @typedef {string} Snowflake\n */');
	});

	it('reports the files whose types cannot be stripped', () => {
		assert.throws(() => transformSource('const value: = 1;', 'broken.ts'), /Unable to strip the types of broken\.ts/);
	});
});

describe('JavaScript files', () => {
	it('turns the exported declarations into plain declarations', () => {
		assert.match(transform('export class A {}', 'a.js'), /^\s{7}class A \{\}$/);
		assert.match(transform('export default class B {}', 'a.js'), /^\s{15}class B \{\}$/);
		assert.match(transform('export async function c() {}', 'a.js'), /^\s{7}async function c\(\) \{\}$/);
		assert.match(transform('export const d = 1, e = 2;', 'a.js'), /^\s{7}const d = 1, e = 2;$/);
		assert.match(transform('@decorate export class F {}', 'a.js'), /^@decorate\s{8}class F \{\}$/);
	});

	it('keeps the exports that are not declarations', () => {
		for (const source of ['const a = 1;\nexport { a as b };', 'export default class {}', 'export default {};', 'export * from \'./a.js\';']) {
			assert.equal(transform(source, 'a.js'), source);
		}
	});

	it('leaves alone the files documented as a @module', () => {
		const source = '/** @module utils */\nexport class Util {}\n';
		assert.equal(transform(source, 'utils.js'), source);
		assert.match(transform(source.replace('Util {}', 'Util<T> {}'), 'utils.ts'), /export class Util\s+\{\}/);
	});

	it('returns the files without export as they are', () => {
		const source = 'class A {}\nmodule.exports = A;\n';
		assert.equal(transformSource(source, 'a.js').code, source);
	});

	it('warns about the files it cannot analyze', () => {
		const source = 'export const = ;';
		const { code, warnings } = transformSource(source, 'broken.js');
		assert.equal(code, source);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0]!, /broken\.js could not be analyzed/);
	});
});
