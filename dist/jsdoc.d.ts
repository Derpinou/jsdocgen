import type { Logger } from './logger.js';
/** JSDoc's default pattern, extended to the extensions of TypeScript and ES modules */
export declare const DEFAULT_INCLUDE_PATTERN = ".+\\.(?:[cm]?[jt]sx?|jsdoc)$";
export interface JsdocConfig {
    plugins?: string[];
    source?: {
        include?: string[];
        exclude?: string[];
        includePattern?: string;
        excludePattern?: string;
        [key: string]: unknown;
    };
    babel?: {
        extensions?: unknown;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
export interface RunJsdocOptions {
    /** Absolute paths of the files to parse */
    files: readonly string[];
    /** Absolute paths of the directories to parse recursively */
    directories: readonly string[];
    /** JSDoc configuration file of the project */
    configPath?: string;
    /** Directory JSDoc runs in, relative paths of its configuration are resolved from it */
    cwd: string;
    logger: Logger;
}
/**
 * Runs JSDoc in explain mode (`jsdoc -X`) and returns the doclets it finds.
 * The project configuration is used with jsdocgen's plugin added in front of its plugins.
 */
export declare function runJsdoc(options: RunJsdocOptions): Promise<unknown[]>;
export interface ConfigLocation {
    /** Directory JSDoc runs in */
    cwd: string;
    /** Directory of the JSDoc configuration file of the project */
    configDirectory?: string;
}
/**
 * Adds the jsdocgen plugin and TypeScript files to a JSDoc configuration.
 * jsdoc-babel, only used to read TypeScript, is dropped: the plugin replaces it.
 */
export declare function buildJsdocConfig(userConfig: JsdocConfig, logger: Logger, location?: ConfigLocation): JsdocConfig;
/** Reads a JSDoc configuration file: JSON (comments allowed, like JSDoc does) or a JavaScript module. */
export declare function readJsdocConfig(path: string): Promise<JsdocConfig>;
/** Removes the comments of a JSON document, keeping its line breaks. */
export declare function stripJsonComments(json: string): string;
