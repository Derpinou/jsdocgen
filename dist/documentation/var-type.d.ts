import type { DocsTypeTokens, DocsVarType } from './types.js';
export interface VarTypeData {
    names?: string[];
    description?: string;
    nullable?: boolean;
}
/** A JSDoc type (`{string|Array<Guild>}`), possibly with the description of a returned value. */
export declare class DocumentedVarType {
    readonly data: VarTypeData;
    constructor(data?: VarTypeData);
    serialize(): DocsVarType;
}
/**
 * Splits a type name into `[name, separator]` pairs, so the website can link every name.
 * @example
 * splitVarName('Collection<string, Guild>'); // [['Collection', '<'], ['string', ', '], ['Guild', '>']]
 */
export declare function splitVarName(name: string): DocsTypeTokens;
