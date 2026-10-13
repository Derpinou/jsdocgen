import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Docs, Logger } from '../dist/index.js';

export const CLI = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

/** Absolute path of a file or directory of test/fixtures */
export function fixture(...segments: string[]): string {
	return fileURLToPath(new URL(`./fixtures/${segments.join('/')}`, import.meta.url));
}

export interface CliResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

export function runCli(args: string[], cwd: string, env: Record<string, string> = {}): CliResult {
	const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
	return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

export interface RecordingLogger extends Logger {
	logs: string[];
	warnings: string[];
}

export function recordingLogger(): RecordingLogger {
	const logs: string[] = [];
	const warnings: string[] = [];
	return { logs, warnings, log: message => logs.push(message), warn: message => warnings.push(message) };
}

/**
 * Compares docs with the expected.json file of a fixture, key order included.
 * Run the tests with UPDATE_EXPECTED=1 to rewrite the file after a deliberate change.
 */
export function assertMatchesExpected(docs: Docs, expectedFile: string): void {
	const actual = `${JSON.stringify({ ...docs, meta: { ...docs.meta, generator: 'VERSION' } }, null, '\t')}\n`;
	if (process.env.UPDATE_EXPECTED) {
		writeFileSync(expectedFile, actual);
		return;
	}
	const expected = readFileSync(expectedFile, 'utf8');
	assert.deepEqual(JSON.parse(actual), JSON.parse(expected));
	assert.equal(actual, expected, 'The content is the same but the keys are not in the same order');
}
