import type { Doclet, DocletMeta, DocsItemMeta } from './types.js';
export interface SerializeContext {
    /** Absolute path of the project root, source paths are written relative to it */
    root: string;
}
/** Base of every documented item: wraps a doclet and serializes it to the docs.json format. */
export declare abstract class DocumentedItem<Data extends Doclet, Serialized> {
    readonly data: Data;
    constructor(data: Data);
    serialize(context: SerializeContext): Serialized;
    protected abstract serializer(context: SerializeContext): Serialized;
    detailedName(): string;
    /** `path/to/file.ts:12`, relative to the root, to point at the item in messages */
    location(root: string): string;
}
export declare function serializeMeta(meta: DocletMeta | undefined, context: SerializeContext): DocsItemMeta;
export declare function formatLocation(meta: DocletMeta | undefined, root: string): string;
export declare function toPosixPath(path: string): string;
