import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
test('premium homepage uses same-origin modules',async()=>{const h=await read('index.html');assert.match(h,/premium-home-runtime\.mjs/);assert.doesNotMatch(h,/googletagmanager|gtag\(/)});
test('motion honours reduced preference',async()=>assert.match(await read('assets/css/premium-motion.css'),/prefers-reduced-motion:reduce/));
test('hero artwork is accessible',async()=>{const s=await read('assets/art/murugan-mayil-hero.svg');assert.match(s,/aria-labelledby/);assert.match(s,/<desc/)});
