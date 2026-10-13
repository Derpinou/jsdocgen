import { formatLocation } from './item.js';
import { DocumentedConstructor, DocumentedEvent, DocumentedFunction, DocumentedMember } from './members.js';
import { DocumentedClass, DocumentedExternal, DocumentedInterface, DocumentedTypeDef } from './roots.js';
import { consoleLogger } from '../logger.js';
/** Version of the docs.json format, unchanged since discord.js-docgen 0.9 */
export const FORMAT_VERSION = 20;
const CHILD_TYPES = new Map([
    ['constructor', DocumentedConstructor],
    ['member', DocumentedMember],
    ['function', DocumentedFunction],
    ['event', DocumentedEvent]
]);
/** Builds the docs.json content out of the doclets of jsdoc-parse. */
export class Documentation {
    classes = new Map();
    interfaces = new Map();
    typedefs = new Map();
    externals = new Map();
    options;
    #logger;
    constructor(items, options) {
        this.options = options;
        this.#logger = options.logger ?? consoleLogger;
        this.#parse(items);
    }
    /** Root items, by doclet kind. A later item replaces an earlier one with the same name. */
    #registerRoot(item) {
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
    #findParent(item) {
        if (item.memberof === undefined)
            return undefined;
        return this.classes.get(item.memberof) ?? this.interfaces.get(item.memberof);
    }
    #parse(items) {
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
            if (Type)
                this.#logger.warn(`- "${member.name}"${suffix} has no accessible parent.`);
            else
                this.#logger.warn(`- "${member.name}"${suffix} is not documented: the kind "${member.kind}" is not supported.`);
            if (!member.name && info.length === 0)
                this.#logger.warn(`Raw object: ${JSON.stringify(member)}`);
        }
    }
    serialize() {
        const context = { root: this.options.root };
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
