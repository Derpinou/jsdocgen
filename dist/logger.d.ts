/** Receives the progress messages and the warnings of the generation. */
export interface Logger {
    log(message: string): void;
    warn(message: string): void;
}
export declare const consoleLogger: Logger;
export declare const silentLogger: Logger;
