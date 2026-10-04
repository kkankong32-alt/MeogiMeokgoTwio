/** Dependency-free packer for this project's named-export-only acyclic module graph. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'play-offline.html'),modules=new Map(),visiting=new Set(),records=[];
function bundle(file){file=path.resolve(file);if(modules.has(file))return;if(visiting.has(file))throw Error('Module cycle: '+file);visiting.add(file);let source=fs.readFileSync(file,'utf8'),deps=[];
 source=source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm,(_,names,relative)=>{const target=path.resolve(path.dirname(file),relative);deps.push(target);const binding=names.split(',').map(x=>x.trim().replace(/\s+as\s+/,':')).join(',');return `const {${binding}}=__modules[${JSON.stringify(path.relative(root,target))}];`;});
 for(const dep of deps)bundle(dep);
 const exports=new Set([...source.matchAll(/\bexport\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));
 source=source.replace(/export\s*\{([^}]+)\};?/g,(_,names)=>{for(const n of names.split(','))exports.add(n.trim());return'';}).replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/g,'');
 if(path.basename(file)==='tongue-v10.mjs'){exports.add('RATE');exports.add('COUNT');}
 source=source.replaceAll('import.meta.url','document.baseURI');
 if(/^\s*(?:import|export)\s/m.test(source))throw Error('Unsupported module syntax: '+file);
 const id=path.relative(root,file),wrapped=`__modules[${JSON.stringify(id)}]=(()=>{\n${source}\nreturn {${[...exports].join(',')}};\n})();`;
 new vm.Script(wrapped);modules.set(file,wrapped);visiting.delete(file);records.push({path:id,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
}
bundle(path.join(root,'src/main.js'));
const assets={};for(const [id,file]of Object.entries({atlas:'frog/frog-atlas-runtime-crop-draft.lossless.webp',tongue:'frog/tongue-ribbon.png',cavity:'frog/mouth-interior.png',ground:'environment/zone01-ground-v01.png',prey:'prey/grasshopper-v01.png',snake:'predator/snake-v01.png',snakeHead:'predator/snake-head-dorsal-v01.png'})){const bytes=fs.readFileSync(path.join(root,'assets',file));assets[id]=`data:image/${file.endsWith('webp')?'webp':'png'};base64,${bytes.toString('base64')}`;}
const code=`(()=>{'use strict';\nglobalThis.__ECOLOGY_EMBEDDED_ASSETS__=${JSON.stringify(assets)};\nconst __modules={};\n${[...modules.values()].join('\n')}\n})();`;
new vm.Script(code);let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<link rel="stylesheet" href="style.css">',`<style>${fs.readFileSync(path.join(root,'style.css'),'utf8')}</style>`).replace('src="assets/title/entry-v03.png"',`src="data:image/png;base64,${fs.readFileSync(path.join(root,'assets/title/entry-v03.png')).toString('base64')}"`).replace('<script type="module" src="src/main.js"></script>',`<script id="game-code">${code.replaceAll('</script','<\\/script')}</script>`);
fs.writeFileSync(out,html);fs.writeFileSync(path.join(root,'qa/standalone-build.json'),JSON.stringify({type:'single-HTML classic-script build; all same source art embedded unchanged',bytes:Buffer.byteLength(html),modules:records,sha256:crypto.createHash('sha256').update(html).digest('hex'),networkRequestsRequired:false},null,2)+'\n');console.log(`Built ${out}: ${Buffer.byteLength(html)} bytes, ${modules.size} modules`);
