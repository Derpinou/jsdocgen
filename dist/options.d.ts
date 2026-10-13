/** Options of the command line, also accepted by the --config file */
export interface CliOptions {
    /** Source files, directories or glob patterns */
    source: string[];
    custom?: string;
    root: string;
    output?: string;
    spaces: number;
    jsdoc?: string;
    verbose: boolean;
    compress: boolean;
}
export type CliCommand = {
    command: 'help';
} | {
    command: 'version';
} | {
    command: 'generate';
    options: CliOptions;
};
/** A mistake in the arguments or the --config file */
export declare class UsageError extends Error {
    name: string;
}
export declare const HELP = "Usage: docgen --source <path...> [options]\n\nGenerates a docs.json file from the JSDoc comments of JavaScript and TypeScript sources.\n\nOptions:\n  -s, -i, --source <path...>  Source files, directories or glob patterns to parse JSDocs in  [required]\n  -c, --custom <file>         Custom docs definition file (JSON or YAML)\n  -r, --root <dir>            Root directory of the project                       [default: \".\"]\n  -o, --output <file>         Path to the output file\n  -S, --spaces <number>       Number of spaces to indent the output JSON with     [default: 0]\n  -j, --jsdoc <file>          Path to a JSDoc configuration file\n      --compress              Compresses the output with zlib (deflate)\n  -V, --verbose               Logs extra information\n  -C, --config <file>         JSON/YAML file setting any of the options above\n  -h, --help                  Shows this help\n  -v, --version               Shows the version number\n\nExamples:\n  docgen --source src --custom docs/index.yml --output docs/docs.json\n  docgen --source \"src/**/*.ts\" --jsdoc jsdoc.json --output stable.json\n  docgen --config docgen.yml\n";
/**
 * Parses the command line. Like before, the values following --source are all sources:
 * `--source a.js b.js` is the same as `--source a.js --source b.js`.
 * @throws {UsageError} When an argument or the --config file is invalid
 */
export declare function parseArguments(argv: readonly string[]): Promise<CliCommand>;
