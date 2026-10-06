import {storyMission} from './story.js';
/** Player-facing rules. Guidance never changes the completion or collision rules. */
export function journeyMission(w){if(w.story)return storyMission(w);
 if(w.role==='grasshopper'){
  const patch=[...(w.grass??[])].filter(g=>g.remaining>0).sort((a,b)=>Math.hypot(a.x-w.player.x,a.y-w.player.y)-Math.hypot(b.x-w.player.x,b.y-w.player.y))[0];
  return {title:'미션 1 · 먹고 살아서 건너기',progress:`① 풀 1번 먹기 ${w.fed?'✓':'0/1'}  →  ② 관찰소 도착`,next:w.fed?'개구리를 피해서 노란 깃발의 관찰소로 가세요':'노란 테두리 풀에서 먹기를 한 번 누르세요',beacon:w.fed?w.destination:patch?{...patch,label:'먼저 풀 먹기'}:w.destination};
 }
 if(['find-lab','at-lab'].includes(w.phase))return {title:'미션 2 · 먹이 찾아 돌아오기',progress:'① 관찰소에서 A·B 비교  →  ② 먹이 1마리  →  ③ 귀환',next:w.labDismissed?'발견 버튼에서 A·B 관찰을 이어갈 수 있어요':'노란 깃발의 관찰소로 가서 먹이 두 조건을 비교하세요',beacon:{...w.lab,label:'먼저 관찰소로'}};
 if(w.phase==='frog-forage')return {title:'미션 2 · 먹이 찾아 돌아오기',progress:'① 비교 ✓  →  ② 먹이 0/1  →  ③ 관찰소 귀환',next:w.fieldCondition==='absent'?'동쪽 먹이터에서 애벌레 1마리를 잡으세요 · 뱀을 조심해요':'동쪽 먹이터에서 메뚜기 또는 애벌레 1마리를 잡으세요',beacon:{...w.destination,label:'동쪽 먹이터'}};
 return {title:'미션 2 · 먹이 찾아 돌아오기',progress:'① 비교 ✓  →  ② 먹이 1/1 ✓  →  ③ 관찰소 귀환',next:'먹이를 잡았어요! 뱀을 피해서 노란 깃발 관찰소로 돌아가세요',beacon:{...w.destination,label:'관찰소로 돌아가기'}};
}
