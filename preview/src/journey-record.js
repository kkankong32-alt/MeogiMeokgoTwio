/** Small device-local play records. These are game events, not ecological measurements. */
export const JOURNEY_RECORD_VERSION=1;
export const JOURNEY_RECORD_LIMIT=4;
export const JOURNEY_RECORD_CAUTION='플레이 기록이에요. 실제 개체 수 변화나 조건별 난이도의 원인을 입증하지 않아요.';
const FOODS=['grasshopper','caterpillar'];
const SHELTERS=new Set(['north-cover','south-cover','east-cover']);
const names={grasshopper:'메뚜기',caterpillar:'애벌레'};
const count=n=>Number.isSafeInteger(n)&&n>=0;
const duration=n=>Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER/10;
const rounded=n=>Math.round(n*10)/10;

/** Rebuild a fixed schema: stored text, coordinates, identities and unknown fields are discarded. */
function restoreRecord(value){
 if(!value||value.version!==JOURNEY_RECORD_VERSION||!['present','absent'].includes(value.condition)||!['success','failed'].includes(value.outcome)||!duration(value.durationSeconds))return null;
 if(!FOODS.every(food=>count(value.eaten?.[food]))||!['captures','attacks','shelters'].every(key=>count(value[key]))||value.shelters>SHELTERS.size)return null;
 if(value.outcome==='success'&&value.eaten.grasshopper+value.eaten.caterpillar<1)return null;
 return{version:JOURNEY_RECORD_VERSION,condition:value.condition,outcome:value.outcome,eaten:{grasshopper:value.eaten.grasshopper,caterpillar:value.eaten.caterpillar},captures:value.captures,attacks:value.attacks,shelters:value.shelters,durationSeconds:rounded(value.durationSeconds)};
}

/** No target highlight, tongue contact, score, quota or inferred food relation counts as eating. */
export function makeJourneyRecord(world){
 if(!world?.prototype||world.role!=='frog'||!['success','failed'].includes(world.status)||!Array.isArray(world.events)||!world.player?.id||!world.predator?.id||!duration(world.time))return null;
 const events=world.events,applied=events.findLast(event=>event?.type==='field-condition');
 if(!applied||applied.condition!==world.fieldCondition||!['present','absent'].includes(applied.condition))return null;
 const eaten={grasshopper:0,caterpillar:0};
 for(const event of events)if(event?.type==='ate'&&event.actor===world.player.id&&event.eater==='frog'&&FOODS.includes(event.food))eaten[event.food]++;
 return restoreRecord({version:JOURNEY_RECORD_VERSION,condition:applied.condition,outcome:world.status,eaten,
  // A capture is a game-model catch/heart loss. It never says the snake consumed the player.
  captures:events.filter(event=>event?.type==='capture'&&event.target===world.player.id).length,
  attacks:events.filter(event=>event?.type==='predator-attack'&&event.actor===world.predator.id).length,
  shelters:new Set(events.filter(event=>event?.type==='shelter-checkpoint'&&SHELTERS.has(event.shelter)).map(event=>event.shelter)).size,
  // The simulation clock pauses in the lab and menus. This is not real-world elapsed time.
  durationSeconds:world.time});
}

/** Keep the latest four valid runs; identical outcomes may be separate legitimate runs. */
export function restoreJourneyRecords(value){
 if(!Array.isArray(value))return[];
 const result=[];
 for(let i=value.length-1;i>=0&&result.length<JOURNEY_RECORD_LIMIT;i--){const record=restoreRecord(value[i]);if(record)result.unshift(record);}
 return result;
}

export function formatJourneyRecord(value){
 const record=restoreRecord(value);if(!record)return'';
 const food=FOODS.filter(key=>record.eaten[key]>0).map(key=>`${names[key]} ${record.eaten[key]}마리`).join(', ')||'없음';
 return`선택한 들판 ${record.condition==='present'?'A · 메뚜기 있음':'B · 메뚜기 없음'} · ${record.outcome==='success'?'귀환 완료':'귀환 미완료'}\n구간 전체에서 삼킨 먹이: ${food} · 붙잡힘 ${record.captures}회 · 천적 공격 ${record.attacks}회 · 발견한 쉼터 ${record.shelters}곳 · 게임 시간 ${record.durationSeconds.toFixed(1)}초`;
}

/** Describe both observations without a winner, causal verdict or population claim. */
export function formatJourneyComparison(previous,current){
 const before=formatJourneyRecord(previous),after=formatJourneyRecord(current);
 return before&&after?`앞선 기록: ${before}\n최근 기록: ${after}\n조건 선택 전 행동도 포함한 구간 전체 기록이에요. ${JOURNEY_RECORD_CAUTION}`:'';
}
