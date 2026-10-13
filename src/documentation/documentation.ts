import { formatLocation, type SerializeContext } from './item.js';
import { DocumentedConstructor, DocumentedEvent, DocumentedFunction, DocumentedMember } from './members.js';
import { DocumentedClass, DocumentedExternal, DocumentedInterface, DocumentedTypeDef, type DocumentedChild } from './roots.js';
import type { CustomDocs, Doclet, Docs } from './types.js';
import { consoleLogger, type Logger } from '../logger.js';

/** Version of the docs.json format, unchanged since discord.js-docgen 0.9 */
export const FORMAT_VERSION = 20;

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

const CHILD_TYPES = new Map<string, new (data: Doclet) => DocumentedChild>([
	['constructor', DocumentedConstructor],
	['member', DocumentedMember],
	['function', DocumentedFunction],
	['event', DocumentedEvent]
]);

/** Builds the docs.json content out of the doclets of jsdoc-parse. */
export class Documentation {
	readonly classes = new Map<string, DocumentedClass>();
	readonly interfaces = new Map<string, DocumentedInterface>();
	readonly typedefs = new Map<string, DocumentedTypeDef>();
	readonly externals = new Map<string, DocumentedExternal>();
	readonly options: DocumentationOptions;
	readonly #logger: Logger;

	constructor(items: Doclet[], options: DocumentationOptions) {
		this.options = options;
		this.#logger = options.logger ?? consoleLogger;
		this.#parse(items);
	}

	/** Root items, by doclet kind. A later item replaces an earlier one with the same name. */
	#registerRoot(item: Doclet): boolean {
		const name = item.name ?? '';
		switch (item.kind) {
			case 'class':
				this.classes.set(name, new DocumentedClass(item));
				return true;
			case 'interface':
				this.interfaces.set(name, new DocumentedInterface(item));
				return true;
			case 'typedef':
				this.typedefs.set(name, new DocumentedTypeDef(item));
				return true;
			case 'external':
				this.externals.set(name, new DocumentedExternal(item));
				return true;
			default:
				return false;
		}
	}

	/** Only classes and interfaces have children. */
	#findParent(item: Doclet): DocumentedClass | undefined {
		if (item.memberof === undefined) return undefined;
		return this.classes.get(item.memberof) ?? this.interfaces.get(item.memberof);
	}

	#parse(items: Doclet[]): void {
		const children = items.filter(item => !this.#registerRoot(item));

		for (const member of children) {
			const Type = CHILD_TYPES.get(member.kind);
			const parent = this.#findParent(member);
			if (Type && parent) {
				parent.add(new Type(member), this.options.root);
				continue;
			}

			const info = [
				member.memberof ? `member of "${member.memberof}"` : '',
				formatLocation(member.meta, this.options.root)
			].filter(Boolean);
			const suffix = info.length > 0 ? ` (${info.join(', ')})` : '';
			if (Type) this.#logger.warn(`- "${member.name}"${suffix} has no accessible parent.`);
			else this.#logger.warn(`- "${member.name}"${suffix} is not documented: the kind "${member.kind}" is not supported.`);
			if (!member.name && info.length === 0) this.#logger.warn(`Raw object: ${JSON.stringify(member)}`);
		}
	}

	serialize(): Docs {
		const context: SerializeContext = { root: this.options.root };
		return {
			meta: {
				generator: this.options.generator,
				format: FORMAT_VERSION,
				date: this.options.date ?? Date.now()
			},
			custom: this.options.custom,
			classes: [...this.classes.values()].map(item => item.serialize(context)),
			interfaces: [...this.interfaces.values()].map(item => item.serialize(context)),
			typedefs: [...this.typedefs.values()].map(item => item.serialize(context)),
			externals: [...this.externals.values()].map(item => item.serialize(context))
		};
	}
}
