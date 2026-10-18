import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PHASES,TASKS} from '../site/catalog.js';
test('every original research instruction survives in the same phase and order', () => {
 const text=fs.readFileSync(new URL('../reference/original.html',import.meta.url),'utf8');
 const original=JSON.parse(text.match(/var P=(\[[\s\S]*?\]);/)[1]);
 assert.equal(PHASES.length,9);
 assert.deepEqual(PHASES.map(p=>[p.title,TASKS.filter(t=>t.phaseId===p.id).map(t=>t.title)]),original);
 assert.equal(new Set(TASKS.map(t=>t.id)).size,TASKS.length);
});
