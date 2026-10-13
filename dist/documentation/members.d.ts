import { DocumentedItem, type SerializeContext } from './item.js';
import type { Doclet, DocletReturn, DocsConstructor, DocsEvent, DocsMethod, DocsProperty, DocsVarType } from './types.js';
/** The constructor of a class, `construct` in docs.json. */
export declare class DocumentedConstructor extends DocumentedItem<Doclet, DocsConstructor> {
    protected serializer(): DocsConstructor;
}
/** A property of a class, `props` in docs.json. */
export declare class DocumentedMember extends DocumentedItem<Doclet, DocsProperty> {
    protected serializer(context: SerializeContext): DocsProperty;
}
/** A method of a class, `methods` in docs.json. */
export declare class DocumentedFunction extends DocumentedItem<Doclet, DocsMethod> {
    protected serializer(context: SerializeContext): DocsMethod;
}
/** An event emitted by a class, `events` in docs.json. */
export declare class DocumentedEvent extends DocumentedItem<Doclet, DocsEvent> {
    protected serializer(context: SerializeContext): DocsEvent;
}
/** Only the first @returns tag is documented. */
export declare function serializeReturns(returns: DocletReturn[] | undefined): DocsVarType | undefined;
