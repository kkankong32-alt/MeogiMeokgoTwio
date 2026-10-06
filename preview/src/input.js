import {normalize,distance} from './core.js';
import {GROUND_Y} from './viewport.js';
export const GAME_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyZ','KeyK','KeyX','Space']);
const EAT_KEYS=new Set(['KeyJ','KeyZ']);
const JUMP_KEYS=new Set(['KeyK','KeyX','Space']);
export const PAD_DEADZONE=6;
/** Each finger owns exactly one control. Held eating and edge-triggered jumping are separate. */
export function createInput({tapEating=false}={}) {
  const keys=new Set(),actions=new Map(),pending={eat:new Set(),jump:new Set()};
  let enabled=false,padId=null,padMove={x:0,y:0},stick={x:0,y:0},mouse=null,cancelEat=false;
  const eatingHeld=()=>[...keys].some(k=>EAT_KEYS.has(k))||[...actions.values()].includes('eat');
  function clear(){
    cancelEat=cancelEat||eatingHeld()||pending.eat.size>0;
    keys.clear();actions.clear();pending.eat.clear();pending.jump.clear();
    padId=null;padMove={x:0,y:0};stick={x:0,y:0};mouse=null;
  }
  function queue(action,source='activation'){
    if(!enabled||!['eat','jump'].includes(action))return false;
    pending[action].add(source);if(action==='eat')cancelEat=false;return true;
  }
  function updatePad(id,x,y,radius=34){
    if(!enabled||id!==padId)return false;
    x=Number.isFinite(x)?x:0;y=Number.isFinite(y)?y:0;
    const length=Math.hypot(x,y),direction=normalize({x,y}),travel=Math.min(1,length/Math.max(1,radius));
    const ground=normalize({x,y:y/GROUND_Y});
    padMove=length<=PAD_DEADZONE?{x:0,y:0}:{x:ground.x*travel,y:ground.y*travel};
    stick=length<=PAD_DEADZONE?{x:0,y:0}:{x:direction.x*travel,y:direction.y*travel};
    return true;
  }
  return {
    clear,queue,
    setEnabled(value){enabled=!!value;if(!enabled)clear();},
    keyDown(code,repeat=false){
      if(!enabled||!GAME_KEYS.has(code))return false;
      const alreadyHeld=keys.has(code);keys.add(code);
      if(!repeat&&!alreadyHeld){if(EAT_KEYS.has(code))queue('eat',code);if(JUMP_KEYS.has(code))queue('jump',code);}
      return true;
    },
    keyUp(code){
      const wasHeld=keys.delete(code);
      if(EAT_KEYS.has(code)){
        if(!tapEating)pending.eat.delete(code);
        if(wasHeld&&!eatingHeld()){if(!tapEating)pending.eat.clear();cancelEat=true;}
      }
    },
    startPad(id,x,y,radius){if(!enabled||padId!==null||actions.has(id))return false;padId=id;return updatePad(id,x,y,radius);},
    updatePad,
    endPointer(id,cancel=false){
      const action=actions.get(id);actions.delete(id);
      if(action==='eat'){
        if(cancel||!tapEating)pending.eat.delete(id);
        if(!eatingHeld()){if(!tapEating)pending.eat.clear();cancelEat=true;}
      }else if(cancel&&action)pending[action].delete(id);
      if(padId===id){padId=null;padMove={x:0,y:0};stick={x:0,y:0};}
    },
    startAction(id,action){
      if(!enabled||id===padId||actions.has(id)||!['eat','jump'].includes(action))return false;
      actions.set(id,action);return queue(action,id);
    },
    setMouse(point){mouse=enabled?point:null;},
    movement(player){
      if(!enabled)return{x:0,y:0};
      const x=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
      const y=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
      if(x||y)return normalize({x,y});
      if(padMove.x||padMove.y)return{...padMove};
      if(mouse&&distance(mouse,player)>32)return normalize({x:mouse.x-player.x,y:mouse.y-player.y});
      return{x:0,y:0};
    },
    consume(player){
      const result={move:this.movement(player),eat:enabled&&pending.eat.size>0,eatHeld:enabled&&eatingHeld(),cancelEat,jump:enabled&&pending.jump.size>0};
      pending.eat.clear();pending.jump.clear();cancelEat=false;return result;
    },
    get stick(){return{...stick};},get padId(){return padId;},get activePointers(){return[...(padId===null?[]:[padId]),...actions.keys()];}
  };
}
