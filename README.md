# jsdocgen

Generates the `docs.json` file of a JavaScript or TypeScript library from its JSDoc comments, in the format of [discord.js-docgen](https://github.com/discordjs/docgen): the format read by the [discord.js website](https://github.com/discordjs/website) and its forks.

discord.js-docgen has been archived since 2022 and no longer runs on current versions of Node.js: it relies on JSDoc 3, which crashes on Node.js 23 and later. jsdocgen is a maintained TypeScript rewrite of it:

- the `docgen` command and its options are the same, and so is the generated `docs.json` (format 20): existing websites keep working;
- it runs on Node.js 22.13 and later, with JSDoc 4;
- it reads TypeScript on its own, without any Babel setup, and the docs point at the right lines of the sources;
- it fixes a few bugs of discord.js-docgen, listed in the [changelog](CHANGELOG.md).

## Installation

jsdocgen is not published on npm: install it from GitHub, preferably pinned to a release.

```sh
npm install --save-dev github:Derpinou/jsdocgen#semver:^1.0.0
```

`#semver:^1.0.0` installs the latest 1.x release, and `npm update` moves to the newer ones. Use `#v1.0.0` for an exact version, or `#main` for the development version.

The repository contains the compiled code, so the package installs without a build step or install script. Each [release](https://github.com/Derpinou/jsdocgen/releases) also provides it as a tarball:

```sh
npm install --save-dev https://github.com/Derpinou/jsdocgen/releases/download/v1.0.0/jsdocgen-1.0.0.tgz
```

## Usage

```sh
docgen --source src --custom docs/index.yml --output docs/docs.json
```

| Option | Alias | Description |
| --- | --- | --- |
| `--source <path...>` | `-s`, `-i` | Source files, directories or glob patterns to parse JSDocs in (required). All the values that follow `--source` are sources; directories are searched recursively. |
| `--custom <file>` | `-c` | Custom docs definition file (JSON or YAML), see below. |
| `--root <dir>` | `-r` | Root directory of the project, the paths written in the docs are relative to it. Defaults to `.` |
| `--output <file>` | `-o` | Path to the output file. Without it, the docs are generated but not written, which checks them. |
| `--spaces <number>` | `-S` | Number of spaces to indent the JSON with. Defaults to `0` |
| `--jsdoc <file>` | `-j` | JSDoc configuration file, see below. |
| `--compress` | | Compresses the output with zlib (deflate). |
| `--verbose` | `-V` | Logs extra information. |
| `--config <file>` | `-C` | JSON or YAML file setting any of the options above, for example `source: [src]`. |
| `--help` | `-h` | Shows the help. |
| `--version` | `-v` | Shows the version. |

Relative paths are resolved from the current directory, including the ones of the `--config` file.

The docs contain their generation date (`meta.date`), unless the [`SOURCE_DATE_EPOCH`](https://reproducible-builds.org/specs/source-date-epoch/) environment variable sets one: the same sources then always give the same file.

### Custom docs

The `--custom` file lists the categories of pages (guides, examples...) added to the docs:

```yaml
- name: General
  files:
    - name: Welcome
      id: welcome # Optional, the name of the file without its extension by default
      path: ../../README.md
- name: Examples
  id: examples # Optional, the name in lower case by default
  path: examples # Optional, the directory of the files relative to this file; the id by default
  files:
    - name: Ping
      path: ping.js
```

### JSDoc configuration

`--jsdoc` takes a regular [JSDoc configuration file](https://jsdoc.app/about-configuring-jsdoc), JSON (comments allowed) or JavaScript. Its plugins and options are used, for example to turn the descriptions into HTML with the markdown plugin:

```json
{
	"plugins": ["plugins/markdown"]
}
```

jsdocgen adds its own plugin to it, and by default parses the `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, `.cts` and `.jsdoc` files (`source.includePattern`). Like JSDoc, it skips the files and directories whose name starts with an underscore (`source.excludePattern`): a warning lists the files given to `--source` that JSDoc skips.

## TypeScript

TypeScript files are documented with their JSDoc comments, like JavaScript files: their types are not read, document them with JSDoc tags (`@type {string}`, `@param {Client} client`, `@typedef`...).

Before JSDoc parses a TypeScript file, its types are blanked out with [amaro](https://github.com/nodejs/amaro), the type stripper of Node.js: nothing moves, so the docs point at the right lines of the sources. Then:

- class fields can be documented where they are declared, `declare` fields included;
- abstract methods and properties are documented, add `@abstract` to flag them;
- the comment of an overloaded function or method documents its implementation;
- interfaces, type aliases, enums and namespaces do not exist in JavaScript, so they are not documented: put a `@typedef` in front of them. Their comment never describes the next item of the file;
- parameter properties (`constructor(private readonly client: Client)`) are documented as parameters only;
- `export` is ignored, so an exported class is documented as `Client` and not as `exports.Client`. This applies to JavaScript modules too, except the files that have a `@module` tag;
- `.d.ts` files only contribute their comments, such as `@typedef` and `@external` blocks;
- the JSX elements of `.tsx` files are ignored.

## Migrating from discord.js-docgen

1. Replace the dependency, the `docgen` command keeps working:

   ```sh
   npm uninstall discord.js-docgen
   npm install --save-dev github:Derpinou/jsdocgen#semver:^1.0.0
   ```

2. If you used [jsdoc-babel](https://github.com/ankurp/jsdoc-babel) to read TypeScript, it is not needed anymore: jsdocgen skips it, with a warning, when it only reads TypeScript files. Remove it from the JSDoc configuration along with the `babel` and `source.includePattern` options, and uninstall it with the Babel packages it used.

The generated docs.json stays the same, except for `meta.generator` (the version of jsdocgen), the line numbers of the TypeScript sources, which are now exact, and the fixes listed in the [changelog](CHANGELOG.md).

## API

```js
import { generate } from 'jsdocgen';

const docs = await generate({ source: 'src', custom: 'docs/index.yml', jsdoc: 'jsdoc.json' });
```

`generate()` takes the options of the command line (`source`, `custom`, `root`, `jsdoc` and `verbose`) plus `cwd`, `date` and `logger`, and returns the content of the docs.json file, typed by the `Docs` interface.

## Development

```sh
npm ci
npm test # compiles src/ to dist/, then runs the tests
npm run typecheck
```

The tests need Node.js 22.18 or later, which runs TypeScript natively. They compare the docs generated for the projects of `test/fixtures` with their `expected.json` file; the one of `test/fixtures/legacy` is the output of discord.js-docgen 0.9.0. After a deliberate change of the output, update them with `UPDATE_EXPECTED=1 npm test` and review the difference.

`dist/` is committed, so that the package installs from GitHub without building it: commit it with your changes, the CI checks that it matches the sources. The scripts are not named `build` or `prepare` on purpose: npm installs all the dependencies of a GitHub package that has one of these scripts, to build it.

To release a version:

1. update the version in `package.json` and `CHANGELOG.md`, then run `npm test`;
2. commit, tag and push: `git tag v1.1.0 && git push origin main v1.1.0`.

The release workflow then checks the tag, runs the tests and creates the GitHub release.

## License

Apache-2.0, like discord.js-docgen by Amish Shah and Schuyler Cebulskie, which jsdocgen derives from: see [LICENSE](LICENSE) and [NOTICE](NOTICE).
