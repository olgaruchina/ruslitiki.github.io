import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startEditor} from '../studio/startup.js';

function fixture(){
  const elements=new Map([
    ['#error',{textContent:'',hidden:true}],
    ['#canvas-status',{textContent:'Opening the visual editor…'}],
    ['#save-state',{textContent:'Loading…'}],
  ]);
  return {elements,root:{querySelector:selector=>elements.get(selector)}};
}

test('a failed module import replaces the endless loading screen with a visible diagnostic',async()=>{
  const {root,elements}=fixture();
  const result=await startEditor({root,load:async()=>{throw new TypeError('Failed to load /opening.mjs');}});
  assert.equal(result,false);
  assert.equal(elements.get('#error').hidden,false);
  assert.match(elements.get('#error').textContent,/Failed to load \/opening.mjs/);
  assert.match(elements.get('#canvas-status').textContent,/Restart it from the current project folder/);
  assert.equal(elements.get('#save-state').textContent,'Editor did not start');
});

test('successful startup leaves the editor in control of its own status',async()=>{
  const {root,elements}=fixture();
  const result=await startEditor({root,load:async()=>{elements.get('#save-state').textContent='Draft saved';}});
  assert.equal(result,true);
  assert.equal(elements.get('#error').hidden,true);
  assert.equal(elements.get('#save-state').textContent,'Draft saved');
});
