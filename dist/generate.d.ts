import type { Docs } from './documentation/types.js';
import { type Logger } from './logger.js';
export interface GenerateOptions {
    /** Source files, directories or glob patterns to parse JSDocs in */
    source: string | readonly string[];
    /** Custom docs definition file (JSON or YAML) */
    custom?: string;
    /** Root directory of the project, paths in the docs are relative to it; `.` by default */
    root?: string;
    /** JSDoc configuration file */
    jsdoc?: string;
    /** Directory relative paths are resolved from, the current directory by default */
    cwd?: string;
    /** Logs extra information */
    verbose?: boolean;
    /**
     * Date written in `meta.date`, in milliseconds since the Unix epoch.
     * Defaults to the SOURCE_DATE_EPOCH environment variable (in seconds) when set, to now otherwise.
     */
    date?: number;
    /** Receives the progress messages and warnings, the console by default */
    logger?: Logger;
}
/** Generates the content of a docs.json file. */
export declare function generate(options: GenerateOptions): Promise<Docs>;
