export interface TransformResult {
    code: string;
    warnings: string[];
}
export declare function isTypeScriptFile(filename: string): boolean;
/**
 * Turns a source file into JavaScript that JSDoc can parse, without moving any line.
 * @param source Content of the file
 * @param filename Path of the file, used to tell TypeScript from JavaScript and in error messages
 */
export declare function transformSource(source: string, filename: string): TransformResult;
