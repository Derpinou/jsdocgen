import { relative } from 'node:path';
import type { Doclet, DocletMeta, DocsItemMeta } from './types.js';

export interface SerializeContext {
	/** Absolute path of the project root, source paths are written relative to it */
	root: string;
}

/** Base of every documented item: wraps a doclet and serializes it to the docs.json format. */
export abstract class DocumentedItem<Data extends Doclet, Serialized> {
	readonly data: Data;

	constructor(data: Data) {
		this.data = data;
	}

	serialize(context: SerializeContext): Serialized {
		try {
			return this.serializer(context);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Error while serializing ${this.detailedName()}: ${message}`, { cause: error });
		}
	}

	protected abstract serializer(context: SerializeContext): Serialized;

	detailedName(): string {
		const label = this.data.id ?? this.data.longname ?? this.data.name;
		return label ? `${label} (${this.constructor.name})` : this.constructor.name;
	}

	/** `path/to/file.ts:12`, relative to the root, to point at the item in messages */
	location(root: string): string {
		return formatLocation(this.data.meta, root);
	}
}

export function serializeMeta(meta: DocletMeta | undefined, context: SerializeContext): DocsItemMeta {
	return {
		line: meta?.lineno,
		file: meta?.filename,
		path: meta?.path === undefined ? undefined : toPosixPath(relative(context.root, meta.path))
	};
}

export function formatLocation(meta: DocletMeta | undefined, root: string): string {
	if (!meta?.filename) return '';
	const file = meta.path === undefined ? meta.filename : toPosixPath(relative(root, `${meta.path}/${meta.filename}`));
	return meta.lineno === undefined ? file : `${file}:${meta.lineno}`;
}

export function toPosixPath(path: string): string {
	return path.replace(/\\/g, '/');
}
