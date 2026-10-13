import { EventEmitter } from 'node:events';

/**
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html#class-eventemitter}
 */

/**
 * Options of a manager
 * @typedef {Object} ManagerOptions
 * @property {string} name The name of the manager
 * @property {number} [retries=3] How many times to retry
 */
export interface ManagerOptions {
	/** Not documented: the comments of an interface are removed with it */
	name: string;
	retries?: number;
}

/** Describes a type alias only, the next function must stay undocumented */
export type Callback = (value: string) => void;

export function helper(): void {}

/**
 * Base of the managers
 * @extends {EventEmitter}
 * @abstract
 */
export abstract class BaseManager extends EventEmitter {
	/**
	 * The options of the manager
	 * @type {ManagerOptions}
	 * @readonly
	 */
	declare readonly options: ManagerOptions;

	/**
	 * The name of the manager
	 * @type {string}
	 */
	name: string;

	/**
	 * @param {ManagerOptions} options The options of the manager
	 */
	constructor(options: ManagerOptions) {
		super();
		this.name = options.name;
	}

	/**
	 * Starts the manager
	 * @returns {Promise<void>}
	 * @abstract
	 */
	abstract start(): Promise<void>;

	/**
	 * Stops the manager
	 * @returns {Promise<boolean>} Whether the manager was running
	 */
	async stop(): Promise<boolean> {
		return true;
	}
}
