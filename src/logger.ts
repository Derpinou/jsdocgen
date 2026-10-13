/** Receives the progress messages and the warnings of the generation. */
export interface Logger {
	log(message: string): void;
	warn(message: string): void;
}

export const consoleLogger: Logger = {
	log: message => console.log(message),
	warn: message => console.warn(message)
};

export const silentLogger: Logger = {
	log: () => {},
	warn: () => {}
};
