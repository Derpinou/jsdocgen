import { resolve } from 'node:path';
import jsdocParse from 'jsdoc-parse';
import { loadCustomDocs } from './custom.js';
import { Documentation, FORMAT_VERSION } from './documentation/documentation.js';
import { runJsdoc } from './jsdoc.js';
import { consoleLogger } from './logger.js';
import { collectSources } from './sources.js';
import { version } from './version.js';
/** Generates the content of a docs.json file. */
export async function generate(options) {
    const cwd = resolve(options.cwd ?? process.cwd());
    const root = resolve(cwd, options.root ?? '.');
    const logger = options.logger ?? consoleLogger;
    const sources = collectSources(typeof options.source === 'string' ? [options.source] : options.source, cwd);
    if (options.verbose) {
        logger.log(`Source files: ${sources.files.join(', ') || 'none'}`);
        if (sources.directories.length > 0)
            logger.log(`Source directories: ${sources.directories.join(', ')}`);
    }
    logger.log('Parsing JSDocs in source files...');
    const items = runJsdoc({
        files: sources.files,
        directories: sources.directories,
        configPath: options.jsdoc === undefined ? undefined : resolve(cwd, options.jsdoc),
        cwd,
        logger
    }).then(doclets => {
        const parsed = jsdocParse(doclets);
        logger.log(`${parsed.length} JSDoc items parsed.`);
        return parsed;
    });
    let custom = Promise.resolve(undefined);
    if (options.custom !== undefined) {
        logger.log('Loading custom docs files...');
        const onFileLoaded = options.verbose ? (id) => logger.log(`Loaded custom docs file ${id}`) : undefined;
        custom = loadCustomDocs(resolve(cwd, options.custom), root, onFileLoaded).then(loaded => {
            logger.log(`${loaded.fileCount} custom docs file${loaded.fileCount === 1 ? '' : 's'} in ` +
                `${loaded.categoryCount} categor${loaded.categoryCount === 1 ? 'y' : 'ies'} loaded.`);
            return loaded.custom;
        });
    }
    const [doclets, customDocs] = await Promise.all([items, custom]);
    logger.log(`Serializing documentation with format version ${FORMAT_VERSION}...`);
    return new Documentation(doclets, {
        root,
        generator: version,
        custom: customDocs,
        date: options.date ?? sourceDateEpoch(logger),
        logger
    }).serialize();
}
/** https://reproducible-builds.org/specs/source-date-epoch/ */
function sourceDateEpoch(logger) {
    const value = process.env.SOURCE_DATE_EPOCH;
    if (!value)
        return undefined;
    if (!/^\d+$/.test(value)) {
        logger.warn(`SOURCE_DATE_EPOCH is ignored, it is not a number of seconds: "${value}"`);
        return undefined;
    }
    return Number(value) * 1000;
}
