import { globSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Sources {
	/** Absolute paths of the source files */
	files: string[];
	/** Absolute paths of the source directories, which JSDoc searches recursively */
	directories: string[];
}

const GLOB_CHARACTERS = /[*?[\]{}]/;

/**
 * Resolves the source files, directories and glob patterns given to the generator.
 * Glob matches are sorted, like a shell would, so the output does not depend on the file system.
 * @throws {Error} When a source does not exist or a pattern matches no file
 */
export function collectSources(patterns: readonly string[], cwd: string): Sources {
	const files = new Set<string>();
	const directories = new Set<string>();

	for (const pattern of patterns) {
		const path = resolve(cwd, pattern);
		const stats = statSync(path, { throwIfNoEntry: false });
		if (stats?.isDirectory()) {
			directories.add(path);
			continue;
		}
		if (stats) {
			files.add(path);
			continue;
		}
		if (!GLOB_CHARACTERS.test(pattern)) throw new Error(`Source "${pattern}" does not exist.`);

		const matches = globSync(pattern, { cwd })
			.map(match => resolve(cwd, match))
			.filter(match => statSync(match).isFile())
			.sort();
		if (matches.length === 0) throw new Error(`No source file matches "${pattern}".`);
		for (const match of matches) files.add(match);
	}

	if (files.size === 0 && directories.size === 0) throw new Error('No source to parse.');
	return { files: [...files], directories: [...directories] };
}
