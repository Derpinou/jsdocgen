import { DocumentedItem, serializeMeta } from './item.js';
import { serializeParams } from './param.js';
import { DocumentedVarType, splitVarName } from './var-type.js';
/** The constructor of a class, `construct` in docs.json. */
export class DocumentedConstructor extends DocumentedItem {
    serializer() {
        return {
            name: this.data.name,
            description: this.data.description,
            see: this.data.see,
            access: this.data.access,
            params: serializeParams(this.data.params)
        };
    }
}
/** A property of a class, `props` in docs.json. */
export class DocumentedMember extends DocumentedItem {
    serializer(context) {
        return {
            name: this.data.name,
            description: this.data.description,
            see: this.data.see,
            scope: this.data.scope !== 'instance' ? this.data.scope : undefined,
            access: this.data.access,
            readonly: this.data.readonly,
            nullable: this.data.nullable,
            abstract: this.data.virtual,
            deprecated: this.data.deprecated,
            default: this.data.defaultvalue,
            type: new DocumentedVarType(this.data.type).serialize(),
            props: serializeParams(this.data.properties),
            meta: serializeMeta(this.data.meta, context)
        };
    }
}
/** A method of a class, `methods` in docs.json. */
export class DocumentedFunction extends DocumentedItem {
    serializer(context) {
        return {
            name: this.data.name,
            description: this.data.description,
            see: this.data.see,
            scope: this.data.scope !== 'instance' ? this.data.scope : undefined,
            access: this.data.access,
            inherits: this.data.inherits,
            inherited: this.data.inherited,
            implements: this.data.implements,
            examples: this.data.examples,
            abstract: this.data.virtual && !this.data.inherited,
            deprecated: this.data.deprecated,
            emits: this.data.fires,
            throws: serializeExceptions(this.data.exceptions),
            params: serializeParams(this.data.params),
            async: this.data.async,
            generator: this.data.generator,
            returns: serializeReturns(this.data.returns),
            meta: serializeMeta(this.data.meta, context)
        };
    }
}
/** An event emitted by a class, `events` in docs.json. */
export class DocumentedEvent extends DocumentedItem {
    serializer(context) {
        return {
            name: this.data.name,
            description: this.data.description,
            see: this.data.see,
            deprecated: this.data.deprecated,
            params: serializeParams(this.data.params),
            meta: serializeMeta(this.data.meta, context)
        };
    }
}
/** Only the first @returns tag is documented. */
export function serializeReturns(returns) {
    const [first] = returns ?? [];
    if (!first)
        return undefined;
    return new DocumentedVarType({
        names: first.type?.names,
        description: first.description || undefined,
        nullable: first.nullable ? true : undefined
    }).serialize();
}
/** The types of the @throws tags: `@throws {TypeError} When...` */
function serializeExceptions(exceptions) {
    const names = exceptions?.flatMap(exception => exception.type?.names ?? []) ?? [];
    return names.length ? names.map(splitVarName) : undefined;
}
