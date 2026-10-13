#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { generate } from './generate.js';
import { HELP, parseArguments, UsageError } from './options.js';
import { version } from './version.js';
async function run(options) {
    if (options.verbose)
        console.log('Running with config:', options);
    const docs = await generate({
        source: options.source,
        custom: options.custom,
        root: options.root,
        jsdoc: options.jsdoc,
        verbose: options.verbose
    });
    let output = JSON.stringify(docs, null, options.spaces);
    if (options.compress) {
        console.log('Compressing...');
        output = deflateSync(output);
    }
    if (options.output !== undefined) {
        console.log(`Writing to ${options.output}...`);
        const path = resolve(options.output);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, output);
    }
    console.log('Done!');
}
async function main(argv) {
    let command;
    try {
        command = await parseArguments(argv);
    }
    catch (error) {
        if (!(error instanceof UsageError))
            throw error;
        console.error(`${error.message}\nRun "docgen --help" to see the available options.`);
        return 1;
    }
    switch (command.command) {
        case 'help':
            process.stdout.write(HELP);
            return 0;
        case 'version':
            console.log(version);
            return 0;
        case 'generate':
            try {
                await run(command.options);
                return 0;
            }
            catch (error) {
                console.error(error instanceof Error ? (command.options.verbose ? error.stack : error.message) : error);
                return 1;
            }
    }
}
process.exitCode = await main(process.argv.slice(2));
