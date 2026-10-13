import { relative } from 'node:path';
/** Base of every documented item: wraps a doclet and serializes it to the docs.json format. */
export class DocumentedItem {
    data;
    constructor(data) {
        this.data = data;
    }
    serialize(context) {
        try {
            return this.serializer(context);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Error while serializing ${this.detailedName()}: ${message}`, { cause: error });
        }
    }
    detailedName() {
        const label = this.data.id ?? this.data.longname ?? this.data.name;
        return label ? `${label} (${this.constructor.name})` : this.constructor.name;
    }
    /** `path/to/file.ts:12`, relative to the root, to point at the item in messages */
    location(root) {
        return formatLocation(this.data.meta, root);
    }
}
export function serializeMeta(meta, context) {
    return {
        line: meta?.lineno,
        file: meta?.filename,
        path: meta?.path === undefined ? undefined : toPosixPath(relative(context.root, meta.path))
    };
}
export function formatLocation(meta, root) {
    if (!meta?.filename)
        return '';
    const file = meta.path === undefined ? meta.filename : toPosixPath(relative(root, `${meta.path}/${meta.filename}`));
    return meta.lineno === undefined ? file : `${file}:${meta.lineno}`;
}
export function toPosixPath(path) {
    return path.replace(/\\/g, '/');
}
