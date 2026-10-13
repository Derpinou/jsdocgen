declare module 'jsdoc-parse' {
	/** Reshapes the output of `jsdoc --explain` (documented items only, constructors split from their class...). */
	function jsdocParse(jsdocData: unknown[]): import('../documentation/types.js').Doclet[];
	export = jsdocParse;
}
