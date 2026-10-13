import type { DocletParam, DocsParam } from './types.js';
/** A parameter, or a property of a typedef or member. */
export declare class DocumentedParam {
    readonly data: DocletParam;
    constructor(data: DocletParam);
    serialize(): DocsParam;
}
/** Serializes a list of parameters, `undefined` when it is empty. */
export declare function serializeParams(params: DocletParam[] | undefined): DocsParam[] | undefined;
