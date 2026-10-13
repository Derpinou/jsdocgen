/**
 * JSDoc plugin that jsdocgen adds to the JSDoc configuration: it turns each TypeScript (or ES
 * module) source into JavaScript that JSDoc documents properly, see ./transform.ts.
 * JSDoc loads plugins with `require()`, which supports ES modules since Node.js 22.12.
 */
import { transformSource } from './transform.js';

interface BeforeParseEvent {
	filename: string;
	source: string;
}

export const handlers = {
	beforeParse(event: BeforeParseEvent): void {
		const { code, warnings } = transformSource(event.source, event.filename);
		for (const warning of warnings) console.warn(`jsdocgen: ${warning}`);
		event.source = code;
	}
};
