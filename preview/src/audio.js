/** Original synthesized sound cues. No recordings, fonts, network, or third-party samples. */
export const SOUND_CUES=Object.freeze({
 eat:[[.0,420,.06,'sine'],[.065,660,.08,'sine'],[.12,880,.1,'sine']],
 jump:[[0,210,.09,'triangle'],[.08,310,.08,'triangle'],[.15,460,.11,'sine']],
 warning:[[0,220,.08,'triangle'],[.14,220,.08,'triangle']],
 escape:[[0,330,.1,'triangle'],[.12,250,.1,'triangle'],[.23,390,.15,'sine']],
 success:[[0,523.25,.14,'sine'],[.14,659.25,.14,'sine'],[.28,783.99,.14,'sine'],[.42,1046.5,.28,'sine']],
 failed:[[0,330,.13,'sine'],[.16,261.63,.13,'sine'],[.32,220,.22,'sine']],
 goal:[[0,660,.1,'sine'],[.13,990,.16,'sine']]
});
export function createAudio({AudioContext=globalThis.AudioContext??globalThis.webkitAudioContext,muted=false,volume=.45}={}){
 let ctx=null,master=null,enabled=!muted,level=Math.max(0,Math.min(1,volume));const active=new Set(),last=new Map();
 function setup(){if(!AudioContext)return false;try{if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=enabled?level*.16:0;master.connect(ctx.destination);}if(ctx.state==='suspended')ctx.resume().catch(()=>{});return true;}catch{return false;}}
 function stop(){for(const node of active)try{node.stop();}catch{}active.clear();}
 return {
  unlock(){return setup();},
  setMuted(value){enabled=!value;if(master)master.gain.value=enabled?level*.16:0;if(!enabled)stop();},
  setVolume(value){level=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.value=enabled?level*.16:0;},
  stop,
  play(cue){if(!ctx||ctx.state!=='running'||!enabled||!SOUND_CUES[cue])return false;const t=ctx.currentTime;if(t-(last.get(cue)??-100)<(cue==='warning'?.5:.08))return false;last.set(cue,t);for(const [delay,frequency,duration,type] of SOUND_CUES[cue]){const o=ctx.createOscillator(),g=ctx.createGain(),start=t+delay;o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.65,start+.008);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g);g.connect(master);o.start(start);o.stop(start+duration+.02);active.add(o);o.onended=()=>{active.delete(o);o.disconnect();g.disconnect();};}return true;},
  get available(){return Boolean(AudioContext);},get unlocked(){return Boolean(ctx);}
 };
}
