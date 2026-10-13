import type { DocsTypeTokens, DocsVarType } from './types.js';

export interface VarTypeData {
	names?: string[];
	description?: string;
	nullable?: boolean;
}

/** A JSDoc type (`{string|Array<Guild>}`), possibly with the description of a returned value. */
export class DocumentedVarType {
	readonly data: VarTypeData;

	constructor(data: VarTypeData = {}) {
		this.data = data;
	}

	serialize(): DocsVarType {
		const names = (this.data.names ?? []).map(splitVarName);
		if (!this.data.description && !this.data.nullable) return names;
		return {
			types: names,
			description: this.data.description,
			nullable: this.data.nullable
		};
	}
}

const WORD = /^[\w*$]/;

/**
 * Splits a type name into `[name, separator]` pairs, so the website can link every name.
 * @example
 * splitVarName('Collection<string, Guild>'); // [['Collection', '<'], ['string', ', '], ['Guild', '>']]
 */
export function splitVarName(name: string): DocsTypeTokens {
	if (name === '*') return ['*'];
	// `Array.<string>` is the JSDoc spelling of `Array<string>`
	const tokens = name.replace(/\.</g, '<').match(/[\w*$]+|[^\w*$]+/g) ?? [];
	const output: string[][] = [];
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index]!;
		const next = tokens[index + 1];
		if (WORD.test(token) && next !== undefined) {
			output.push([token, next]);
			index++;
		} else {
			// A name ending the type, or a separator starting it (`{a: string}`, `'literal'`)
			output.push([token]);
		}
	}
	return output;
}
