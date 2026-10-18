import {normalize,distance} from './core.js';
import {GROUND_Y} from './viewport.js';
export const GAME_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','Space']);
/** Pointer ownership does not rely on isPrimary: the second finger is an action. */
export function createInput() {
  const keys=new Set(), actions=new Map(), pending={eat:new Set(),jump:new Set(),hop:new Set()};
  let tapMove=null;
  let enabled=false,padId=null,padMove={x:0,y:0},stick={x:0,y:0},mouse=null;
  function clear() { tapMove=null; keys.clear(); actions.clear(); padId=null; padMove={x:0,y:0}; stick={x:0,y:0}; mouse=null; pending.eat.clear(); pending.jump.clear();pending.hop.clear(); }
  function queue(action,source='activation') { if(!enabled||!pending[action])return false; pending[action].add(source); return true; }
  function updatePad(id,x,y,radius=34) {
    if(!enabled||id!==padId)return false;
    const length=Math.hypot(x,y), direction=normalize({x,y}), travel=Math.min(1,length/Math.max(1,radius));
    const ground=normalize({x,y:y/GROUND_Y});padMove=length<6?{x:0,y:0}:{x:ground.x*travel,y:ground.y*travel};
    stick={x:direction.x*travel,y:direction.y*travel}; return true;
  }
  return {
    clear, queue,
    setEnabled(value) { enabled=!!value; if(!enabled)clear(); },
    keyDown(code,repeat=false) { if(!enabled||!GAME_KEYS.has(code))return false; keys.add(code);if(!repeat&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(code))tapMove=this.movement({x:0,y:0}); if(!repeat&&code==='KeyJ')queue('eat'); if(!repeat&&code==='Space')queue('jump'); if(!repeat&&code==='KeyK')queue('hop'); return true; },
    keyUp(code) { keys.delete(code); },
    startPad(id,x,y,radius) { if(!enabled||padId!==null||actions.has(id))return false; padId=id; return updatePad(id,x,y,radius); },
    updatePad,
    endPointer(id,cancel=false) { const action=actions.get(id); if(cancel&&action)pending[action].delete(id); actions.delete(id); if(padId===id){padId=null;padMove={x:0,y:0};stick={x:0,y:0};} },
    startAction(id,action) { if(!enabled||id===padId||actions.has(id)||!['eat','jump','hop'].includes(action))return false; actions.set(id,action); return queue(action,id); },
    setMouse(point) { mouse=enabled?point:null; },
    movement(player) {
      if(!enabled)return{x:0,y:0};
      const x=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
      const y=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
      if(x||y)return normalize({x,y});
      if(padMove.x||padMove.y)return{...padMove};
      if(mouse&&distance(mouse,player)>32)return normalize({x:mouse.x-player.x,y:mouse.y-player.y});
      return{x:0,y:0};
    },
    consume(player) {const result={move:this.movement(player),eat:enabled&&pending.eat.size>0,jump:enabled&&pending.jump.size>0,hop:enabled&&pending.hop.size>0};if(enabled&&tapMove&&result.move.x===0&&result.move.y===0)result.move=tapMove;tapMove=null;pending.eat.clear();pending.jump.clear();pending.hop.clear();return result;},
    get stick(){return{...stick};}, get padId(){return padId;}, get activePointers(){return[...(padId===null?[]:[padId]),...actions.keys()];}
  };
}
