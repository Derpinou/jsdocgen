/*
 * Source transformation applied by the JSDoc plugin, right before JSDoc parses a file.
 *
 * TypeScript files are turned into JavaScript by blanking out their types with amaro, the type
 * stripper used by Node.js itself. Every character keeps its position, so the line numbers reported
 * by JSDoc are exact and every comment stays where it was written. The few constructs amaro cannot
 * strip (enums, namespaces, parameter properties...) are neutralized beforehand, the same way.
 *
 * In every file, JavaScript included, the `export` keyword in front of a declaration is blanked out
 * as well: without a @module tag, JSDoc names an exported class `exports.Foo` and documents its
 * constructor as a `Foo#Foo` member, which breaks the generated documentation.
 */
import { parse } from '@babel/parser';
import amaro from 'amaro';
const TYPESCRIPT_FILE = /\.[cm]?tsx?$/i;
const DECLARATION_FILE = /\.d\.[cm]?ts$/i;
const TSX_FILE = /\.tsx$/i;
/** Babel options mirroring the ones JSDoc parses sources with (jsdoc/lib/jsdoc/src/astbuilder.js). */
const PARSER_OPTIONS = {
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    errorRecovery: true,
    sourceType: 'module',
    tokens: true
};
/** Accepts decorators before and after `export`, and parameter decorators as a recoverable error */
const DECORATORS = ['decorators', { allowCallParenthesized: true }];
const JAVASCRIPT_PLUGINS = [
    'asyncDoExpressions',
    'decoratorAutoAccessors',
    DECORATORS,
    'destructuringPrivate',
    'doExpressions',
    'explicitResourceManagement',
    'exportDefaultFrom',
    'functionBind',
    'functionSent',
    'jsx',
    'partialApplication',
    ['pipelineOperator', { proposal: 'hack', topicToken: '^^' }],
    'throwExpressions'
];
const TYPESCRIPT_PLUGINS = ['decoratorAutoAccessors', DECORATORS, 'explicitResourceManagement'];
/** Modifiers that turn a constructor parameter into a parameter property. */
const PARAMETER_PROPERTY_MODIFIERS = new Set(['public', 'private', 'protected', 'readonly', 'override']);
export function isTypeScriptFile(filename) {
    return TYPESCRIPT_FILE.test(filename);
}
/**
 * Turns a source file into JavaScript that JSDoc can parse, without moving any line.
 * @param source Content of the file
 * @param filename Path of the file, used to tell TypeScript from JavaScript and in error messages
 */
export function transformSource(source, filename) {
    if (!isTypeScriptFile(filename))
        return transformJavaScript(source, filename);
    if (DECLARATION_FILE.test(filename))
        return transformDeclarationFile(source, filename);
    return transformTypeScript(source, filename);
}
function transformJavaScript(source, filename) {
    // Only modules can contain export declarations
    if (!/\bexport\b/.test(source))
        return { code: source, warnings: [] };
    const analysis = analyze(source, JAVASCRIPT_PLUGINS);
    if (analysis instanceof Error) {
        return {
            code: source,
            warnings: [`${filename} could not be analyzed (${analysis.message}), its export declarations are left as is.`]
        };
    }
    const edits = new Edits();
    if (!hasModuleTag(analysis.ast))
        unwrapExports(analysis, edits, position => position);
    return { code: edits.apply(source), warnings: [] };
}
function transformTypeScript(source, filename) {
    const analysis = analyze(source, [
        ['typescript', {}],
        ...TYPESCRIPT_PLUGINS,
        ...TSX_FILE.test(filename) ? ['jsx'] : []
    ]);
    if (analysis instanceof Error) {
        return {
            code: stripTypes(source, filename),
            warnings: [`${filename} could not be analyzed (${analysis.message}), only its types have been stripped.`]
        };
    }
    // Edits made to the TypeScript source, so amaro can strip it
    const before = new Edits();
    prepareTypeScript(analysis, before);
    const stripped = stripTypes(before.apply(source), filename);
    // Edits made to the JavaScript code, at positions mapped through the previous edits
    const after = new Edits();
    addCommentBarriers(analysis.ast.program, stripped, before, after);
    if (!hasModuleTag(analysis.ast))
        unwrapExports(analysis, after, position => before.map(position));
    return { code: after.apply(stripped), warnings: [] };
}
/**
 * Declaration files only describe types, but they can hold virtual JSDoc comments (@typedef,
 * @external...): only the comments are kept.
 */
function transformDeclarationFile(source, filename) {
    const analysis = analyze(source, [['typescript', { dts: true }], ...TYPESCRIPT_PLUGINS]);
    if (analysis instanceof Error)
        return transformTypeScript(source, filename);
    const edits = new Edits();
    let position = 0;
    for (const comment of analysis.ast.comments ?? []) {
        edits.blank(analysis.source, position, comment.start);
        position = comment.end;
    }
    edits.blank(analysis.source, position, source.length);
    return { code: edits.apply(source), warnings: [] };
}
function stripTypes(source, filename) {
    try {
        return amaro.transformSync(source, { mode: 'strip-only', filename }).code;
    }
    catch (error) {
        throw new Error(`Unable to strip the types of ${filename}: ${error instanceof Error ? error.message : error}`, { cause: error });
    }
}
function analyze(source, plugins) {
    try {
        const ast = parse(source, { ...PARSER_OPTIONS, plugins });
        return { source, ast, tokens: (ast.tokens ?? []) };
    }
    catch (error) {
        return error instanceof Error ? error : new Error(String(error));
    }
}
/** A file documented as a @module is left alone: JSDoc handles its exports properly. */
function hasModuleTag(ast) {
    return (ast.comments ?? []).some(comment => comment.type === 'CommentBlock' && comment.value.startsWith('*') && /@module\b/.test(comment.value));
}
/**
 * Neutralizes, in place, the TypeScript constructs that amaro cannot strip or that would hide
 * documented members once stripped.
 */
function prepareTypeScript(analysis, edits) {
    const { source } = analysis;
    walk(analysis.ast.program, null, (node, parent) => {
        switch (node.type) {
            // Constructs that only exist at the type level once documented: they are removed, like amaro
            // removes interfaces. Their comments go with them, except the one in front, which is kept.
            case 'TSEnumDeclaration':
            case 'TSModuleDeclaration':
            case 'TSImportEqualsDeclaration': {
                if (!('declare' in node && node.declare)) {
                    const statement = parent?.type === 'ExportNamedDeclaration' ? parent : node;
                    edits.blank(source, statement.start, statement.end);
                }
                return false;
            }
            case 'TSExportAssignment': {
                const expression = node.expression;
                if ((expression.type === 'ClassExpression' || expression.type === 'FunctionExpression') && expression.id) {
                    // `export = class Foo {}` becomes a plain declaration of `Foo`
                    edits.blank(source, node.start, expression.start);
                }
                else {
                    edits.blank(source, node.start, node.end);
                }
                return false;
            }
            case 'JSXElement':
            case 'JSXFragment': {
                // amaro does not support JSX: elements are replaced by `0`, they are not documented anyway
                edits.replace(node.start, node.end, `0${blank(source.slice(node.start + 1, node.end))}`);
                return false;
            }
            case 'ClassBody': {
                prepareClassBody(analysis, node, edits);
                return true;
            }
            default: {
                const params = node.params;
                if (Array.isArray(params))
                    prepareParameters(analysis, params.filter(isNode), edits);
                return true;
            }
        }
    });
}
function prepareClassBody(analysis, body, edits) {
    const { source } = analysis;
    body.body.forEach((member, index) => {
        switch (member.type) {
            case 'ClassProperty':
            case 'ClassAccessorProperty':
            case 'ClassPrivateProperty': {
                // `declare foo: Foo;` and `abstract foo: Foo;` are documented like regular fields
                if ('declare' in member && member.declare)
                    blankModifiers(analysis, member, new Set(['declare']), edits);
                if ('abstract' in member && member.abstract)
                    blankModifiers(analysis, member, new Set(['abstract']), edits);
                break;
            }
            case 'TSDeclareMethod': {
                // An abstract method has no body, so amaro would remove it with its documentation: it is
                // turned into an empty method instead. Only the last signature of an overload gets one.
                const next = body.body[index + 1];
                const overloaded = next?.type === 'TSDeclareMethod' && keyOf(source, next) === keyOf(source, member);
                if (member.abstract && !overloaded) {
                    blankModifiers(analysis, member, new Set(['abstract']), edits);
                    addEmptyBody(analysis, member, edits);
                }
                break;
            }
        }
    });
}
/** Removes parameter decorators and the modifiers of parameter properties. */
function prepareParameters(analysis, params, edits) {
    for (const param of params) {
        if ('decorators' in param && param.decorators) {
            for (const decorator of param.decorators)
                edits.blank(analysis.source, decorator.start, decorator.end);
        }
        if (param.type === 'TSParameterProperty')
            blankModifiers(analysis, param, PARAMETER_PROPERTY_MODIFIERS, edits);
    }
}
/** Blanks the given modifiers of a class member or parameter (they come before its name). */
function blankModifiers(analysis, node, modifiers, edits) {
    const decorators = 'decorators' in node ? node.decorators ?? [] : [];
    const start = Math.max(node.start, ...decorators.map(decorator => decorator.end));
    const end = 'key' in node ? node.key.start : 'parameter' in node ? node.parameter.start : node.end;
    for (const token of tokensBetween(analysis.tokens, start, end)) {
        if (tokenLabel(token) === 'name' && modifiers.has(String(token.value)))
            edits.blank(analysis.source, token.start, token.end);
    }
}
function addEmptyBody(analysis, method, edits) {
    const { source } = analysis;
    // The body takes the place of the return type, or comes right after the parameter list
    let start = method.returnType?.start ?? undefined;
    if (start === undefined) {
        const closingParenthesis = tokensBetween(analysis.tokens, method.start, method.end).findLast(token => tokenLabel(token) === ')');
        if (!closingParenthesis)
            return;
        start = closingParenthesis.end;
    }
    const end = method.end;
    const replaced = source.slice(start, end);
    // Overwrites two characters when they are on the same line, inserts the body otherwise
    edits.replace(start, end, /^[^\n\r\p{Zl}\p{Zp}]{2}/u.test(replaced) ? `{}${blank(replaced.slice(2))}` : `{}${blank(replaced)}`);
}
function keyOf(source, member) {
    return source.slice(member.key.start, member.key.end);
}
/**
 * Once a declaration is stripped, the JSDoc comment written in front of it would describe the next
 * symbol of the file instead. An empty statement is put in its place to stop it: the comment is
 * then only used if it declares its own symbol (@typedef, @external...).
 * Overload signatures are not concerned: their documentation should describe the implementation.
 */
function addCommentBarriers(program, stripped, before, after) {
    for (const statement of program.body) {
        if (!isTypeOnly(statement))
            continue;
        const position = before.map(statement.start);
        if (stripped[position] === ' ')
            after.replace(position, position + 1, ';');
    }
}
function isTypeOnly(statement) {
    switch (statement.type) {
        case 'TSInterfaceDeclaration':
        case 'TSTypeAliasDeclaration':
        case 'TSEnumDeclaration':
        case 'TSModuleDeclaration':
        case 'TSImportEqualsDeclaration':
            return true;
        case 'TSExportAssignment':
            return !((statement.expression.type === 'ClassExpression' || statement.expression.type === 'FunctionExpression') && statement.expression.id);
        case 'TSDeclareFunction':
        case 'VariableDeclaration':
        case 'ClassDeclaration':
            return statement.declare === true;
        case 'ImportDeclaration':
            return statement.importKind === 'type';
        case 'ExportAllDeclaration':
            return statement.exportKind === 'type';
        case 'ExportNamedDeclaration':
            return statement.exportKind === 'type' || (!!statement.declaration && isTypeOnly(statement.declaration));
        case 'ExportDefaultDeclaration':
            // `export default interface Foo {}`, missing from the Babel types
            return statement.declaration.type === 'TSInterfaceDeclaration';
        default:
            return false;
    }
}
/**
 * Blanks the `export` (and `default`) keywords in front of the declarations of a module, so JSDoc
 * documents them as the plain declarations they are.
 */
function unwrapExports(analysis, edits, map) {
    for (const statement of analysis.ast.program.body) {
        let declaration;
        if (statement.type === 'ExportNamedDeclaration') {
            declaration = statement.declaration;
            const declared = declaration?.type === 'ClassDeclaration' || declaration?.type === 'FunctionDeclaration' || declaration?.type === 'VariableDeclaration';
            if (!declared || isTypeOnly(statement))
                continue;
        }
        else if (statement.type === 'ExportDefaultDeclaration') {
            declaration = statement.declaration;
            // Anonymous default exports cannot become declarations
            const named = (declaration.type === 'ClassDeclaration' || declaration.type === 'FunctionDeclaration') && !!declaration.id;
            if (!named)
                continue;
        }
        else {
            continue;
        }
        // Decorators can come before `export`, the declaration can start before the statement
        const start = Math.min(statement.start, declaration.start);
        const keywords = new Set(statement.type === 'ExportDefaultDeclaration' ? ['export', 'default'] : ['export']);
        for (const token of tokensBetween(analysis.tokens, start, statement.end)) {
            const label = tokenLabel(token);
            if (!keywords.has(label))
                continue;
            edits.replace(map(token.start), map(token.end), ' '.repeat(token.end - token.start));
            keywords.delete(label);
            if (keywords.size === 0)
                break;
        }
    }
}
function tokenLabel(token) {
    return typeof token.type === 'string' ? token.type : token.type.label;
}
/** Tokens contained in [start, end), found by binary search. */
function tokensBetween(tokens, start, end) {
    let low = 0;
    let high = tokens.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (tokens[middle].start < start)
            low = middle + 1;
        else
            high = middle;
    }
    const result = [];
    for (let index = low; index < tokens.length && tokens[index].end <= end; index++)
        result.push(tokens[index]);
    return result;
}
/** Keys of AST nodes that do not hold child nodes. */
const IGNORED_KEYS = new Set(['type', 'start', 'end', 'loc', 'range', 'extra', 'comments', 'tokens', 'errors', 'leadingComments', 'trailingComments', 'innerComments']);
/** Depth-first traversal: `enter` returns false to skip the children of a node. */
function walk(node, parent, enter) {
    if (!enter(node, parent))
        return;
    for (const [key, value] of Object.entries(node)) {
        if (IGNORED_KEYS.has(key))
            continue;
        if (Array.isArray(value)) {
            for (const child of value)
                if (isNode(child))
                    walk(child, node, enter);
        }
        else if (isNode(value)) {
            walk(value, node, enter);
        }
    }
}
function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.type === 'string';
}
/** Replaces every character but line breaks with a space. */
function blank(text) {
    return text.replace(/[^\n\r\p{Zl}\p{Zp}]/gu, ' ');
}
/** Replacements made to a source, expressed with positions of the original source. */
class Edits {
    #edits = [];
    replace(start, end, text) {
        this.#edits.push({ start, end, text });
    }
    blank(source, start, end) {
        if (start < end)
            this.replace(start, end, blank(source.slice(start, end)));
    }
    apply(source) {
        const edits = [...this.#edits].sort((a, b) => a.start - b.start);
        let result = '';
        let position = 0;
        for (const edit of edits) {
            // Overlapping edits come from nested constructs: the outermost one already covers the others
            if (edit.start < position)
                continue;
            result += source.slice(position, edit.start) + edit.text;
            position = edit.end;
        }
        return result + source.slice(position);
    }
    /** Position, once the edits are applied, of a position of the original source. */
    map(position) {
        let shift = 0;
        for (const edit of this.#edits) {
            if (edit.end <= position)
                shift += edit.text.length - (edit.end - edit.start);
        }
        return position + shift;
    }
}
