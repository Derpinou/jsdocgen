import { BaseManager, type ManagerOptions } from './Manager.js';

/**
 * How the client connects
 * @typedef {string} ConnectionMode
 */
export enum ConnectionMode {
	/** Not documented: the comments of an enum are removed with it */
	WebSocket = 'ws',
	Http = 'http'
}

export namespace Internals {
	export const secret = 1;
}

/**
 * A client
 * @extends {BaseManager}
 */
export default class Client extends BaseManager {
	/**
	 * When the client was created
	 * @type {Date}
	 */
	createdAt: Date;

	/**
	 * @param {ManagerOptions} options The options of the client
	 * @param {string} token The token of the client
	 * @param {ConnectionMode} [mode='ws'] How the client connects
	 */
	constructor(options: ManagerOptions, private readonly token: string, public mode = ConnectionMode.WebSocket) {
		super(options);
		this.createdAt = new Date();
	}

	/**
	 * Fetches a value
	 * @param {string} id The id of the value
	 * @param {boolean} [force=false] Whether to skip the cache
	 * @returns {Promise<?string>} The value
	 * @throws {TypeError} When the id is empty
	 * @emits Client#fetched
	 */
	fetch(id: string): Promise<string | null>;
	fetch(id: string, force: boolean): Promise<string | null>;
	async fetch(id: string, force = false): Promise<string | null> {
		if (!id) throw new TypeError('The id is empty');
		/**
		 * Emitted when a value is fetched
		 * @event Client#fetched
		 * @param {string} id The id of the value
		 */
		this.emit('fetched', id);
		return force ? id : this.token;
	}

	async start(): Promise<void> {
		await this.fetch(this.name);
	}

	/**
	 * Creates a client
	 * @param {string} token The token of the client
	 * @returns {Client}
	 */
	static create(token: string): Client {
		return new Client({ name: 'client' }, token);
	}
}

export import Mode = ConnectionMode;
