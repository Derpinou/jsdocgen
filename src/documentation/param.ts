import { DocumentedVarType } from './var-type.js';
import type { DocletParam, DocsParam } from './types.js';

/** A parameter, or a property of a typedef or member. */
export class DocumentedParam {
	readonly data: DocletParam;

	constructor(data: DocletParam) {
		this.data = data;
	}

	serialize(): DocsParam {
		return {
			name: this.data.name,
			description: this.data.description,
			optional: this.data.optional,
			default: this.data.defaultvalue,
			variable: this.data.variable,
			nullable: this.data.nullable,
			type: new DocumentedVarType(this.data.type).serialize()
		};
	}
}

/** Serializes a list of parameters, `undefined` when it is empty. */
export function serializeParams(params: DocletParam[] | undefined): DocsParam[] | undefined {
	return params?.length ? params.map(param => new DocumentedParam(param).serialize()) : undefined;
}
