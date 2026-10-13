import { readFileSync } from 'node:fs';

/** Version of jsdocgen, written in the `meta.generator` field of the docs */
export const version: string = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version;
