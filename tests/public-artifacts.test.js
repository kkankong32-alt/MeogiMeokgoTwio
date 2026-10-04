import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?files(p):[p];});}
test('public runtime ships no external file URLs, source-file identifiers or account secrets',()=>{
 const names=[...files(path.join(root,'src')),...files(path.join(root,'data')),path.join(root,'index.html'),path.join(root,'play-offline.html')];
 for(const p of names){const text=fs.readFileSync(p,'utf8');assert.doesNotMatch(text,/https?:\/\//,path.relative(root,p));assert.doesNotMatch(text,/libfile_[0-9a-f]+|Sentinel_[0-9a-f]+|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z]{20,}/,path.relative(root,p));}
});
test('public curriculum retains publisher, material title and printed-page scope',()=>{
 const code=fs.readFileSync(path.join(root,'src/learning.js'),'utf8');assert.match(code,/아이스크림미디어/);assert.match(code,/과학 4학년 2학기 · 생물과 환경/);assert.match(code,/pages: \[38, 61\]/);assert.match(code,/pages: \[20, 35\]/);assert.doesNotMatch(code,/link\.href|reference\.url/);
});
