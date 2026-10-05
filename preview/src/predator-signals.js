/** State labels share the real simulation state, never an independent danger timer. */
import {playerHidden,predatorVisible,distance,predatorWarningDuration} from './core.js';
export function predatorSignal(w){
 const s=w.predator,name=s?.role==='snake'?'뱀':'개구리';
 if(!s||s.disabled)return{kind:'quiet',label:'주위를 살펴봐요',detail:'먹이와 풀숲을 찾아봐요',active:false};
 if(s.state==='windup'&&s.warning)return{kind:'windup',label:name+' 공격 준비',detail:'공격 방향 옆으로 피하거나 도약',active:true,progress:Math.min(1,(s.warningVisibleTime??0)/predatorWarningDuration(w))};
 if(s.state==='attack'&&s.warning)return{kind:'attack',label:s.role==='snake'?'뱀 돌진 중!':'혀 공격 중!',detail:'돌진 경로에 닿으면 잡혀요',active:true,progress:1};
 if(s.state==='recover'&&predatorVisible(w))return{kind:'recover',label:'공격 뒤 빈틈',detail:s.fedNPC?'먹는 동안 지나갈까?':'지금 지나갈까, 풀숲으로 갈까?',active:true};
 if(playerHidden(w))return{kind:'hidden',label:'풀숲에 숨었어요',detail:'머리가 향하는 곳을 보고 나가요',active:false};
 if(s.state==='approach'&&predatorVisible(w)&&distance(s,w.player)<500)return{kind:'approach',label:name+' 접근 중',detail:'머리가 향하는 곳을 살펴봐요',active:true};
 return{kind:'quiet',label:'천적 위치 살피기',detail:'몸통은 길을 막아요 · 공격은 먼저 예고해요',active:false};
}
