import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitVarName } from '../dist/index.js';
import { DocumentedVarType } from '../dist/documentation/var-type.js';

describe('splitVarName', () => {
	it('splits types like discord.js-docgen did', () => {
		assert.deepEqual(splitVarName('string'), [['string']]);
		assert.deepEqual(splitVarName('Array.<string>'), [['Array', '<'], ['string', '>']]);
		assert.deepEqual(splitVarName('Collection<string, TicketData>'), [['Collection', '<'], ['string', ', '], ['TicketData', '>']]);
		assert.deepEqual(splitVarName('Object.<string, *>'), [['Object', '<'], ['string', ', '], ['*', '>']]);
		assert.deepEqual(splitVarName('Promise<Array<Guild>>'), [['Promise', '<'], ['Array', '<'], ['Guild', '>>']]);
		assert.deepEqual(splitVarName('*'), ['*']);
	});

	it('keeps the parts that discord.js-docgen dropped', () => {
		assert.deepEqual(splitVarName('function(string): number'), [['function', '('], ['string', '): '], ['number']]);
		assert.deepEqual(splitVarName('external:Client'), [['external', ':'], ['Client']]);
		assert.deepEqual(splitVarName('{a: string}'), [['{'], ['a', ': '], ['string', '}']]);
		assert.deepEqual(splitVarName('\'open\''), [['\''], ['open', '\'']]);
		assert.deepEqual(splitVarName('Intl.DateTimeFormat'), [['Intl', '.'], ['DateTimeFormat']]);
	});
});

describe('DocumentedVarType', () => {
	it('serializes plain types as a list', () => {
		assert.deepEqual(new DocumentedVarType({ names: ['string', 'null'] }).serialize(), [[['string']], [['null']]]);
		assert.deepEqual(new DocumentedVarType().serialize(), []);
	});

	it('serializes described or nullable types as an object', () => {
		assert.deepEqual(new DocumentedVarType({ names: ['Guild'], description: 'The guild', nullable: true }).serialize(), {
			types: [[['Guild']]],
			description: 'The guild',
			nullable: true
		});
	});
});
