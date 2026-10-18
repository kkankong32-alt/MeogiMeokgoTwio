export const NAMES={grass:'풀',grasshopper:'메뚜기',frog:'개구리',snake:'뱀',hawk:'매'};
export const EDGES=[['grass','grasshopper'],['grasshopper','frog'],['frog','snake'],['frog','hawk'],['snake','hawk']];
export const edgeKey=(a,b)=>a+':'+b;
export const edgeLabel=k=>k.split(':').map(x=>NAMES[x]).join(' → ');
const KEY='pond-portfolio-v015',BACKUP=KEY+'-before-reset';
const text=(s,n=240)=>typeof s==='string'?s.slice(0,n):'';
export function validatePortfolio(raw){
 if(!raw||raw.schema!==1||!Array.isArray(raw.rounds)||raw.rounds.length>200)throw Error('지원하지 않는 탐험 기록 파일이에요.');
 const valid=new Set(EDGES.map(e=>edgeKey(...e)));
 const rounds=raw.rounds.map(r=>{if(!r||!['grasshopper','frog','snake','hawk'].includes(r.role)||!Array.isArray(r.events)||r.events.length>300||!Number.isFinite(r.time)||r.time<0||!Number.isFinite(r.food)||r.food<0)throw Error('탐험 기록 형식이 올바르지 않아요.');return {role:r.role,condition:r.condition==='cut'?'cut':'meadow',status:r.status==='caught'?'caught':'survived',endCause:text(r.endCause,40),time:r.time,food:r.food,events:r.events.filter(e=>e&&['ate','caught'].includes(e.type)&&valid.has(edgeKey(e.food,e.eater))&&Number.isFinite(e.time)&&e.time>=0).map(e=>({type:e.type,food:e.food,eater:e.eater,time:e.time}))};});
 const answers={};for(const key of ['prediction','claim','evidence','reason','next','branch'])answers[key]=text(raw.answers?.[key]);
 let comparison=null;if(raw.comparison){const c=raw.comparison;if(!['grass','roles'].includes(c.mode)||!Array.isArray(c.rounds)||c.rounds.length>2)throw Error('비교 기록 형식 오류');const clean=validatePortfolio({schema:1,rounds:c.rounds}).rounds;comparison={mode:c.mode,stage:clean.length,prediction:text(c.prediction),rounds:clean.map((r,i)=>({...r,distance:Number.isFinite(c.rounds[i].distance)?Math.max(0,c.rounds[i].distance):0,firstFood:Number.isFinite(c.rounds[i].firstFood)?Math.max(0,c.rounds[i].firstFood):null}))};}
 return {schema:1,comparison,name:text(raw.name,24),rounds,links:[...new Set((Array.isArray(raw.links)?raw.links:[]).filter(k=>valid.has(k)))],answers,checks:{direction:raw.checks?.direction===true,branch:raw.checks?.branch===true},updated:text(raw.updated,40)};
}
export function createPortfolio(storage,legacy=[]){let data=validatePortfolio({schema:1,rounds:[]}),persistent=true;try{const raw=storage?.getItem(KEY);if(raw)data=validatePortfolio(JSON.parse(raw));else data=validatePortfolio({schema:1,rounds:legacy});}catch{persistent=false;}
 let backup=null;try{const raw=storage?.getItem(BACKUP);if(raw)backup=validatePortfolio(JSON.parse(raw));}catch{}
 function persist(){data.updated=new Date().toISOString();try{if(!storage)throw Error();storage.setItem(KEY,JSON.stringify(data));persistent=true;}catch{persistent=false;}}
 if(persistent)persist();
 return {get data(){return data;},get canUndoReset(){return !!backup;},reset(){backup=validatePortfolio(JSON.parse(JSON.stringify(data)));try{storage?.setItem(BACKUP,JSON.stringify(backup));}catch{}data=validatePortfolio({schema:1,rounds:[]});persist();},undoReset(){if(!backup)return false;data=validatePortfolio(backup);backup=null;try{storage?.removeItem(BACKUP);}catch{}persist();return true;},get persistent(){return persistent;},save:persist,record(w){if(w.status==='playing')return;data.rounds.push({role:w.role??'frog',condition:w.condition??'meadow',status:w.status,endCause:w.endCause??'',time:Math.round(w.time),food:w.player.eaten,events:w.learningEvents.filter(e=>['ate','caught'].includes(e.type)).map(e=>({type:e.type,food:e.food,eater:e.eater,time:e.time}))});data.rounds=data.rounds.slice(-200);persist();},answer(k,v){if(k==='name')data.name=text(v,24);else data.answers[k]=text(v);persist();},connect(a,b){const key=edgeKey(a,b);if(!EDGES.some(e=>edgeKey(...e)===key))return false;if(!data.links.includes(key))data.links.push(key);data.checks.direction=true;persist();return true;},import(raw){const next=validatePortfolio(raw);data=next;persist();},export(){return JSON.stringify(data,null,2);}};
}
export function evidenceFor(data,key){return data.rounds.flatMap((r,i)=>r.events.filter(e=>edgeKey(e.food,e.eater)===key).map(e=>({round:i+1,role:r.role,...e})));}
export function downloadFile(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
