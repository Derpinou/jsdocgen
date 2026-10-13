export interface Sources {
    /** Absolute paths of the source files */
    files: string[];
    /** Absolute paths of the source directories, which JSDoc searches recursively */
    directories: string[];
}
/**
 * Resolves the source files, directories and glob patterns given to the generator.
 * Glob matches are sorted, like a shell would, so the output does not depend on the file system.
 * @throws {Error} When a source does not exist or a pattern matches no file
 */
export declare function collectSources(patterns: readonly string[], cwd: string): Sources;
