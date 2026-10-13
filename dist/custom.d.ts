import type { CustomDocs } from './documentation/types.js';
/** A category of the custom docs definition file (docs/index.yml) */
export interface CustomDocsCategoryDefinition {
    /** Displayed name, the id defaults to it in lower case */
    name?: string;
    id?: string;
    /** Directory of the files, relative to the definition file; the id by default */
    path?: string;
    files: CustomDocsFileDefinition[];
}
export interface CustomDocsFileDefinition {
    name?: string;
    /** Identifier of the file, its name without extension by default */
    id?: string;
    /** Path of the file, relative to the directory of the category */
    path: string;
}
export interface LoadedCustomDocs {
    custom: CustomDocs;
    fileCount: number;
    categoryCount: number;
}
/**
 * Loads the custom docs (guides, examples...) listed by a JSON or YAML definition file.
 * @param definitionPath Path of the definition file
 * @param root Root directory of the project, file paths are written relative to it
 * @param onFileLoaded Called with `category/file` once a file is loaded
 */
export declare function loadCustomDocs(definitionPath: string, root: string, onFileLoaded?: (id: string) => void): Promise<LoadedCustomDocs>;
