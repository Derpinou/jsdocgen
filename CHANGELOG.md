# Changelog

## 1.0.0 - 2026-10-13

First release, a TypeScript rewrite of discord.js-docgen 0.9.0 (`ts-patch` branch). The command line and the docs.json format (version 20) are the same, and so are the docs generated from the same sources, apart from the changes below.

### Compatibility

- Runs on Node.js 22.13 and later, with JSDoc 4. discord.js-docgen used JSDoc 3, which crashes on Node.js 23 and later.
- Installs from GitHub without a build step.
- `meta.generator` is the version of jsdocgen.

### TypeScript

- TypeScript files (`.ts`, `.tsx`, `.mts`, `.cts`, `.d.ts`) are read natively: jsdoc-babel and Babel are not needed anymore, and jsdoc-babel is skipped when it only reads TypeScript files.
- The line numbers of TypeScript items are exact: Babel used to move the code around.
- `export` no longer changes how a declaration is documented. An exported ES module class was named `exports.Client`, and its constructor was documented as a member, then inherited by the subclasses.
- Class fields, `declare` fields and abstract members can be documented, the comment of overload signatures documents the implementation, and the comment of an interface or another declaration that disappears with the types never describes the next item. See the README.

### Fixes

- The `@throws` tags fill the `throws` field of methods, which was always empty.
- Type names are no longer truncated: `function(string): number` lost `number`, `external:Client` lost `Client`, `{a: string}` lost `{`, and the dots of the names were removed (`Intl.DateTimeFormat` became `IntlDateTimeFormat`).
- The items of an unsupported kind (constants, enums, namespaces...) are reported with a warning instead of crashing the generation.
- A `@returns`, `@param`, `@property`, `@type` or `@typedef` tag without type no longer crashes the generation.
- An item documented as a member of a typedef or an external is reported instead of crashing the generation.
- The number of custom docs files is right: it counted two files per category.
- `--compress` is a documented option, and writes valid deflate data instead of data corrupted by a conversion to text.

### Changes

- `--source` accepts directories, searched recursively, and the files matched by glob patterns are sorted.
- The arguments that follow no option are sources too: `docgen src/*.js --output docs.json`.
- The output directory is created when it does not exist.
- `SOURCE_DATE_EPOCH` sets the generation date, for reproducible docs.
- Unknown options are rejected instead of being ignored, the `--config` file is checked, and the error messages explain the problem instead of showing a stack trace (unless `--verbose` is set).
- The JSDoc configuration can contain comments, like with JSDoc, or be a JavaScript module.
- The warnings of JSDoc are displayed, along with the source files JSDoc skips because of its `source` options.
- An error about an item documented twice gives the location of both items.
- YAML files are read as YAML 1.2, where `yes` and `no` are strings.
- The `completion` command, which printed a Bash completion script, is removed.
- New programmatic API: `generate()`, `Documentation`, `loadCustomDocs()`, `splitVarName()` and the types of the docs.json format.
