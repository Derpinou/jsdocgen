/*
 * Input: the doclets produced by JSDoc then reshaped by jsdoc-parse.
 */

export interface DocletType {
	names?: string[];
}

export interface DocletParam {
	name?: string;
	description?: string;
	type?: DocletType;
	optional?: boolean;
	defaultvalue?: unknown;
	variable?: boolean;
	nullable?: boolean;
}

export interface DocletReturn {
	type?: DocletType;
	description?: string;
	nullable?: boolean;
}

export interface DocletMeta {
	lineno?: number;
	filename?: string;
	path?: string;
}

export interface Doclet {
	id?: string;
	longname?: string;
	name?: string;
	kind: string;
	scope?: string;
	memberof?: string;
	description?: string;
	classdesc?: string;
	see?: string[];
	augments?: string[];
	implements?: string[];
	access?: string;
	virtual?: boolean;
	deprecated?: boolean | string;
	readonly?: boolean;
	nullable?: boolean;
	type?: DocletType;
	defaultvalue?: unknown;
	params?: DocletParam[];
	properties?: DocletParam[];
	returns?: DocletReturn[];
	exceptions?: DocletReturn[];
	examples?: string[];
	fires?: string[];
	inherits?: string;
	inherited?: boolean;
	async?: boolean;
	generator?: boolean;
	meta?: DocletMeta;
}

/*
 * Output: the docs.json format (version 20), as consumed by the discord.js documentation website.
 */

/**
 * A type expression split into `[name, separator]` pairs, so names can be linked:
 * `Collection<string, Guild>` becomes `[['Collection', '<'], ['string', ', '], ['Guild', '>']]`.
 * The `*` type is the exception and becomes `['*']`.
 */
export type DocsTypeTokens = string[][] | ['*'];

/** One entry per type of a union, with the description and nullability of returned values. */
export type DocsVarType = DocsTypeTokens[] | {
	types: DocsTypeTokens[];
	description?: string;
	nullable?: boolean;
};

export interface DocsItemMeta {
	line?: number;
	file?: string;
	path?: string;
}

export interface DocsParam {
	name?: string;
	description?: string;
	optional?: boolean;
	default?: unknown;
	variable?: boolean;
	nullable?: boolean;
	type: DocsVarType;
}

export interface DocsConstructor {
	name?: string;
	description?: string;
	see?: string[];
	access?: string;
	params?: DocsParam[];
}

export interface DocsProperty {
	name?: string;
	description?: string;
	see?: string[];
	scope?: string;
	access?: string;
	readonly?: boolean;
	nullable?: boolean;
	abstract?: boolean;
	deprecated?: boolean | string;
	default?: unknown;
	type: DocsVarType;
	props?: DocsParam[];
	meta: DocsItemMeta;
}

export interface DocsMethod {
	name?: string;
	description?: string;
	see?: string[];
	scope?: string;
	access?: string;
	inherits?: string;
	inherited?: boolean;
	implements?: string[];
	examples?: string[];
	abstract?: boolean;
	deprecated?: boolean | string;
	emits?: string[];
	throws?: DocsTypeTokens[];
	params?: DocsParam[];
	async?: boolean;
	generator?: boolean;
	returns?: DocsVarType;
	meta: DocsItemMeta;
}

export interface DocsEvent {
	name?: string;
	description?: string;
	see?: string[];
	deprecated?: boolean | string;
	params?: DocsParam[];
	meta: DocsItemMeta;
}

export interface DocsClass {
	name?: string;
	description?: string;
	see?: string[];
	extends?: DocsVarType;
	implements?: DocsVarType;
	access?: string;
	abstract?: boolean;
	deprecated?: boolean | string;
	construct?: DocsConstructor;
	props?: DocsProperty[];
	methods?: DocsMethod[];
	events?: DocsEvent[];
	meta: DocsItemMeta;
}

export type DocsInterface = DocsClass;

export interface DocsTypedef {
	name?: string;
	description?: string;
	see?: string[];
	access?: string;
	deprecated?: boolean | string;
	type: DocsVarType;
	props?: DocsParam[];
	params?: DocsParam[];
	returns?: DocsVarType;
	meta: DocsItemMeta;
}

export interface DocsExternal {
	name?: string;
	description?: string;
	see?: string[];
	meta: DocsItemMeta;
}

export interface CustomDocsFile {
	name?: string;
	/** Extension of the file, without the dot (`md`, `js`...) */
	type: string;
	content: string;
	/** Path of the file, relative to the root of the project */
	path: string;
}

export interface CustomDocsCategory {
	name: string;
	files: Record<string, CustomDocsFile>;
}

/** Custom pages (guides, examples...), by category id */
export type CustomDocs = Record<string, CustomDocsCategory>;

export interface DocsMeta {
	/** Version of jsdocgen */
	generator: string;
	/** Version of the docs.json format */
	format: number;
	/** Generation date, in milliseconds since the Unix epoch */
	date: number;
}

export interface Docs {
	meta: DocsMeta;
	custom?: CustomDocs;
	classes: DocsClass[];
	interfaces: DocsInterface[];
	typedefs: DocsTypedef[];
	externals: DocsExternal[];
}
