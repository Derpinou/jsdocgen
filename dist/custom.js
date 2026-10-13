import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { toPosixPath } from './documentation/item.js';
/**
 * Loads the custom docs (guides, examples...) listed by a JSON or YAML definition file.
 * @param definitionPath Path of the definition file
 * @param root Root directory of the project, file paths are written relative to it
 * @param onFileLoaded Called with `category/file` once a file is loaded
 */
export async function loadCustomDocs(definitionPath, root, onFileLoaded) {
    const extension = extname(definitionPath).toLowerCase();
    if (extension !== '.json' && extension !== '.yml' && extension !== '.yaml') {
        throw new TypeError(`Unknown custom docs definition file type: ${definitionPath} (expected .json, .yml or .yaml).`);
    }
    const content = await readFile(definitionPath, 'utf8');
    let definitions;
    try {
        definitions = extension === '.json' ? JSON.parse(content) : parseYaml(content);
    }
    catch (error) {
        throw new Error(`Unable to parse the custom docs definition file ${definitionPath}: ${messageOf(error)}`, { cause: error });
    }
    const directory = dirname(definitionPath);
    const categories = await Promise.all(validateDefinitions(definitions, definitionPath).map(async (definition) => {
        const id = definition.id || definition.name.toLowerCase();
        return [id, await loadCategory(id, definition, join(directory, definition.path || id), root, onFileLoaded)];
    }));
    // Categories and files keep the order of the definition file, a duplicated id replaces the previous one
    const custom = {};
    for (const [id, category] of categories)
        custom[id] = category;
    const fileCount = Object.values(custom).reduce((count, category) => count + Object.keys(category.files).length, 0);
    return { custom, fileCount, categoryCount: Object.keys(custom).length };
}
async function loadCategory(categoryId, definition, directory, root, onFileLoaded) {
    const files = await Promise.all(definition.files.map(async (file) => {
        const path = join(directory, file.path);
        const extension = extname(file.path);
        const id = file.id || basename(file.path, extension);
        let content;
        try {
            content = await readFile(path, 'utf8');
        }
        catch (error) {
            throw new Error(`Unable to read the custom docs file ${path}: ${messageOf(error)}`, { cause: error });
        }
        onFileLoaded?.(`${categoryId}/${id}`);
        const loaded = {
            name: file.name,
            type: extension.toLowerCase().replace(/^\./, ''),
            content,
            path: toPosixPath(relative(root, path))
        };
        return [id, loaded];
    }));
    return { name: definition.name || definition.id, files: Object.fromEntries(files) };
}
function validateDefinitions(definitions, definitionPath) {
    const fail = (message) => {
        throw new Error(`Invalid custom docs definition file ${definitionPath}: ${message}`);
    };
    const isOptionalString = (value) => value === undefined || typeof value === 'string';
    if (!Array.isArray(definitions))
        return fail('it must contain a list of categories.');
    definitions.forEach((category, index) => {
        const label = `category #${index + 1}`;
        if (typeof category !== 'object' || category === null)
            fail(`${label} must be an object.`);
        const { name, id, path, files } = category;
        if (!isOptionalString(name) || !isOptionalString(id) || !isOptionalString(path))
            fail(`the name, id and path of ${label} must be strings.`);
        if (!name && !id)
            fail(`${label} needs a name or an id.`);
        if (!Array.isArray(files))
            fail(`${label} needs a list of files.`);
        files.forEach((file, fileIndex) => {
            const fileLabel = `file #${fileIndex + 1} of ${label}`;
            if (typeof file !== 'object' || file === null)
                fail(`${fileLabel} must be an object.`);
            const { name: fileName, id: fileId, path: filePath } = file;
            if (typeof filePath !== 'string' || !filePath)
                fail(`${fileLabel} needs a path.`);
            if (!isOptionalString(fileName) || !isOptionalString(fileId))
                fail(`the name and id of ${fileLabel} must be strings.`);
        });
    });
    return definitions;
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
