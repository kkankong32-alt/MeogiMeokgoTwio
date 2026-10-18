import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8'));
const errors=[],ids=new Set();
if(manifest.schemaVersion!==1)errors.push('Unsupported manifest');
for(const asset of [...manifest.runtimeAssets,...(manifest.developmentAssets??[])]){
  if(ids.has(asset.id))errors.push(`${asset.id}: duplicate id`);ids.add(asset.id);
  if(!['runtime-approved','pilot-review-candidate'].includes(asset.status))errors.push(`${asset.id}: missing approval/candidate scope`);
  if(asset.status==='pilot-review-candidate'&&!asset.approvalScope)errors.push(`${asset.id}: development use not disclosed`);
  const file=path.resolve(root,asset.path||'');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){errors.push(`${asset.id}: missing or out-of-project bytes`);continue;}
  const bytes=fs.readFileSync(file);
  if(!asset.provenance||!asset.usageConditions)errors.push(`${asset.id}: missing provenance or usage conditions`);
  if(asset.bytes!==bytes.length)errors.push(`${asset.id}: byte count mismatch`);
  if(asset.sha256&&asset.sha256!==crypto.createHash('sha256').update(bytes).digest('hex'))errors.push(`${asset.id}: hash mismatch`);
  if(path.extname(file)==='.png'){
    if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')errors.push(`${asset.id}: invalid PNG header`);
    else if(bytes.readUInt32BE(16)!==asset.width||bytes.readUInt32BE(20)!==asset.height)errors.push(`${asset.id}: dimensions mismatch`);
  }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Manifest valid. ${manifest.runtimeAssets.length} approved image assets and ${manifest.developmentAssets?.length??0} disclosed pilot candidates. Art gate: ${manifest.status}.`);
