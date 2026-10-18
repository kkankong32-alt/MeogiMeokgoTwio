/** Round-local learning evidence, independent of the rolling diagnostic log.
 * The current game has ten non-respawning prey, one capture and one round end.
 * Repeated background feeding is summarized, never stored as player evidence.
 */
export function recordLearningEvent(w,event) {
  if(['ate','caught','round-end'].includes(event.type))w.learningEvents.push({...event});
  if(event.type==='feeding-observed') {
    if(!w.backgroundFeeding)w.backgroundFeeding={firstTime:event.time,lastTime:event.time,count:0};
    w.backgroundFeeding.lastTime=event.time;w.backgroundFeeding.count++;
  }
}
export function relationshipLines(w) {
  const names={grass:'풀',grasshopper:'메뚜기',frog:'개구리',snake:'뱀',hawk:'매'};
  const lines=w.learningEvents.filter(e=>e.type==='ate'||e.type==='caught').map(e=>
    `${e.time.toFixed(1)}초 · ${names[e.food]??e.food} → ${names[e.eater]??e.eater} · ${e.type==='caught'?'실제로 잡혔어요':'직접 먹었어요'}`);
  if(!lines.length)lines.push('아직 직접 먹거나 잡힌 사건은 없어요.');
  if(w.backgroundFeeding)lines.push('배경 생물의 행동: 풀 → 메뚜기 · 메뚜기가 풀을 먹었어요. 직접 먹은 기록과 구분해요.');
  lines.push('화살표는 먹히는 생물에서 먹는 생물로 향해요.');
  return lines;
}
