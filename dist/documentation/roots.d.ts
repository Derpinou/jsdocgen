import { DocumentedItem, type SerializeContext } from './item.js';
import { DocumentedConstructor, DocumentedEvent, DocumentedFunction, DocumentedMember } from './members.js';
import type { Doclet, DocsClass, DocsExternal, DocsInterface, DocsTypedef } from './types.js';
export type DocumentedChild = DocumentedConstructor | DocumentedFunction | DocumentedMember | DocumentedEvent;
/** A class, with its constructor, properties, methods and events. */
export declare class DocumentedClass extends DocumentedItem<Doclet, DocsClass> {
    construct?: DocumentedConstructor;
    readonly props: Map<string, DocumentedMember>;
    readonly methods: Map<string, DocumentedFunction>;
    readonly events: Map<string, DocumentedEvent>;
    /**
     * Adds a child item to the class.
     * @throws {Error} When the class already has an item with the same name
     */
    add(item: DocumentedChild, root: string): void;
    protected serializer(context: SerializeContext): DocsClass;
}
/** An interface (@interface): documented like a class, its description being in `classdesc`. */
export declare class DocumentedInterface extends DocumentedClass {
    protected serializer(context: SerializeContext): DocsInterface;
}
/** A type definition (@typedef, @callback). */
export declare class DocumentedTypeDef extends DocumentedItem<Doclet, DocsTypedef> {
    protected serializer(context: SerializeContext): DocsTypedef;
}
/** A type documented elsewhere (@external), usually linked with @see. */
export declare class DocumentedExternal extends DocumentedItem<Doclet, DocsExternal> {
    protected serializer(context: SerializeContext): DocsExternal;
}
