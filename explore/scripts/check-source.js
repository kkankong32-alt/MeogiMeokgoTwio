import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');let count=0;
function visit(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory())visit(file);else if(/\.(?:js|mjs)$/.test(file)){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);count++;}}}
for(const dir of['src','scripts','tests'])visit(path.join(root,dir));
const html=fs.readFileSync(path.join(root,'play-offline.html'),'utf8');if(/<script[^>]*\ssrc=|<link[^>]*href="style|<img[^>]*src="assets\//.test(html))throw Error('External dependency in offline HTML');
console.log(`Syntax valid: ${count} source/check/test files. Offline HTML has inline scripts, CSS and image assets.`);
