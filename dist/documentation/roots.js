import { DocumentedItem, serializeMeta } from './item.js';
import { DocumentedConstructor, DocumentedEvent, DocumentedFunction, DocumentedMember, serializeReturns } from './members.js';
import { serializeParams } from './param.js';
import { DocumentedVarType } from './var-type.js';
/** A class, with its constructor, properties, methods and events. */
export class DocumentedClass extends DocumentedItem {
    construct;
    props = new Map();
    methods = new Map();
    events = new Map();
    /**
     * Adds a child item to the class.
     * @throws {Error} When the class already has an item with the same name
     */
    add(item, root) {
        const where = (existing) => {
            const locations = [existing.location(root), item.location(root)].filter(Boolean);
            return locations.length ? ` (${locations.join(' and ')})` : '';
        };
        if (item instanceof DocumentedConstructor) {
            if (this.construct)
                throw new Error(`Doc ${this.data.name} already has constructor${where(this.construct)}`);
            this.construct = item;
            return;
        }
        const name = item.data.name ?? '';
        const [items, label, key] = item instanceof DocumentedFunction ?
            [this.methods, 'method', (item.data.scope === 'static' ? 's-' : '') + name] :
            item instanceof DocumentedMember ? [this.props, 'prop', name] :
                [this.events, 'event', name];
        const existing = items.get(key);
        if (existing)
            throw new Error(`Doc ${this.data.name} already has ${label} ${name}${where(existing)}`);
        items.set(key, item);
    }
    serializer(context) {
        return {
            name: this.data.name,
            description: this.data.description,
            see: this.data.see,
            extends: this.data.augments ? new DocumentedVarType({ names: this.data.augments }).serialize() : undefined,
            implements: this.data.implements ? new DocumentedVarType({ names: this.data.implements }).serialize() : undefined,
            access: this.data.access,
            abstract: this.data.virtual,
            deprecated: this.data.deprecated,
            construct: this.construct?.serialize(context),
            props: this.props.size > 0 ? [...this.props.values()].map(prop => prop.serialize(context)) : undefined,
            methods: this.methods.size > 0 ? [...this.methods.values()].map(method => method.serialize(context)) : undefined,
            events: this.events.size > 0 ? [...this.events.values()].map(event => event.serialize(context)) : undefined,
            meta: serializeMeta(this.data.meta, context)
        };
    }
}
/** An interface (@interface): documented like a class, its description being in `classdesc`. */
export class DocumentedInterface extends DocumentedClass {
    serializer(context) {
        return { ...super.serializer(context), description: this.data.classdesc };
    }
}
/** A type definition (@typedef, @callback). */
export class DocumentedTypeDef extends DocumentedItem {
    serializer(context) {
        return {
            name: this.data.name,
            description: this.data.description,
            see: this.data.see,
            access: this.data.access,
            deprecated: this.data.deprecated,
            type: new DocumentedVarType(this.data.type).serialize(),
            props: serializeParams(this.data.properties),
            params: serializeParams(this.data.params),
            returns: serializeReturns(this.data.returns),
            meta: serializeMeta(this.data.meta, context)
        };
    }
}
/** A type documented elsewhere (@external), usually linked with @see. */
export class DocumentedExternal extends DocumentedItem {
    serializer(context) {
        return {
            name: this.data.name,
            description: this.data.description,
            see: this.data.see,
            meta: serializeMeta(this.data.meta, context)
        };
    }
}
