import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { loadCustomDocs } from '../dist/index.js';
import { fixture } from './helpers.ts';

describe('loadCustomDocs', () => {
	it('loads the files of each category, in order', async () => {
		const loaded: string[] = [];
		const { custom, fileCount, categoryCount } = await loadCustomDocs(fixture('legacy', 'docs', 'index.yml'), fixture('legacy'), id => loaded.push(id));
		assert.equal(fileCount, 3);
		assert.equal(categoryCount, 2);
		assert.deepEqual(Object.keys(custom), ['general', 'examples']);
		assert.deepEqual(Object.keys(custom.general!.files), ['Cool', 'Heya']);
		assert.deepEqual(custom.examples, {
			name: 'Examples',
			files: { blah: { name: 'Blah', type: 'js', content: 'console.log(42);\n', path: 'docs/examples/blah.js' } }
		});
		assert.deepEqual(loaded.sort(), ['examples/blah', 'general/Cool', 'general/Heya']);
	});

	it('uses the ids and paths of the definitions', async () => {
		const { custom } = await loadCustomDocs(fixture('typescript', 'docs', 'index.yml'), fixture('typescript'));
		assert.deepEqual(Object.keys(custom.general!.files), ['welcome']);
		assert.equal(custom.general!.files.welcome!.path, 'README.md');
		assert.equal(custom.guides!.files['getting-started']!.path, 'docs/guides/getting-started.md');
	});

	describe('invalid definitions', () => {
		let directory: string;
		before(async () => {
			directory = await mkdtemp(join(tmpdir(), 'jsdocgen-test-'));
		});
		after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		const cases: [string, string, RegExp][] = [
			['unknown.txt', '[]', /Unknown custom docs definition file type/],
			['not-a-list.json', '{"name": "General"}', /must contain a list of categories/],
			['no-name.yml', '- files: []', /category #1 needs a name or an id/],
			['no-files.yml', '- name: General', /category #1 needs a list of files/],
			['no-path.yml', '- name: General\n  files:\n    - name: Welcome', /file #1 of category #1 needs a path/],
			['missing-file.yml', '- name: General\n  files:\n    - path: missing.md', /Unable to read the custom docs file .*missing\.md/],
			['broken.json', '[', /Unable to parse the custom docs definition file/]
		];
		for (const [name, content, error] of cases) {
			it(`rejects ${name}`, async () => {
				const path = join(directory, name);
				await writeFile(path, content);
				await assert.rejects(loadCustomDocs(path, directory), error);
			});
		}
	});
});
