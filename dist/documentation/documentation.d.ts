import { DocumentedClass, DocumentedExternal, DocumentedInterface, DocumentedTypeDef } from './roots.js';
import type { CustomDocs, Doclet, Docs } from './types.js';
import { type Logger } from '../logger.js';
/** Version of the docs.json format, unchanged since discord.js-docgen 0.9 */
export declare const FORMAT_VERSION = 20;
export interface DocumentationOptions {
    /** Absolute path of the project root, source paths are written relative to it */
    root: string;
    /** Version written in `meta.generator` */
    generator: string;
    /** Custom pages, written as is */
    custom?: CustomDocs;
    /** Generation date written in `meta.date`, now by default */
    date?: number;
    logger?: Logger;
}
/** Builds the docs.json content out of the doclets of jsdoc-parse. */
export declare class Documentation {
    #private;
    readonly classes: Map<string, DocumentedClass>;
    readonly interfaces: Map<string, DocumentedInterface>;
    readonly typedefs: Map<string, DocumentedTypeDef>;
    readonly externals: Map<string, DocumentedExternal>;
    readonly options: DocumentationOptions;
    constructor(items: Doclet[], options: DocumentationOptions);
    serialize(): Docs;
}
