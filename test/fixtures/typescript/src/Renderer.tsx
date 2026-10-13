declare function decorate(...args: unknown[]): any;

/**
 * Renders the client
 */
@decorate
export class Renderer {
	/**
	 * Renders a greeting
	 * @param {string} name Who to greet
	 * @returns {Object}
	 */
	@decorate
	render(@decorate name: string) {
		return <div className="greeting">
			Hello {name}
		</div>;
	}
}
