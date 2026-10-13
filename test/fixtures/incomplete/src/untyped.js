/**
 * A class
 */
class Foo {
	constructor() {
		/**
		 * Untyped member
		 */
		this.untyped = 1;
	}

	/**
	 * Untyped return and param
	 * @param bar The bar
	 * @returns The thing
	 */
	method(bar) {
		return bar;
	}
}
module.exports = Foo;
