/** Local-only, versioned saves. No identity fields or network transmission. */
export const SAVE_PREFIX='eat-and-escape-v1:';
export function createStorage(storage=globalThis.localStorage,onError=()=>{}){
 let available=Boolean(storage);
 return {
  read(key,fallback){if(!available)return structuredClone(fallback);try{const value=storage.getItem(SAVE_PREFIX+key);return value===null?structuredClone(fallback):JSON.parse(value);}catch(error){onError(error);return structuredClone(fallback);}},
  write(key,value){if(!available)return false;try{storage.setItem(SAVE_PREFIX+key,JSON.stringify(value));return true;}catch(error){onError(error);return false;}},
  clear(){if(!available)return false;try{for(const key of ['progress','settings','activities','runs','checkpoint'])storage.removeItem(SAVE_PREFIX+key);return true;}catch(error){onError(error);return false;}},
  get available(){return available;}
 };
}
export function runRecord(world,id){return{id,stage:world.stage,stageId:world.stage,segment:world.segment,role:world.role,status:world.status,time:world.time,condition:{...world.settings},route:structuredClone(world.route??[]),events:structuredClone(world.events)};}
export function upsertRun(runs,record){const index=runs.findIndex(r=>r.id===record.id);if(index<0)return[...runs,record];const copy=[...runs];copy[index]=record;return copy;}
