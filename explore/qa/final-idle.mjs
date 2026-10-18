import {createWorld,stepWorld} from '../src/core.js';
import {createHopperWorld,stepHopper} from '../src/hopper.js';
import {createSnakeWorld,stepSnake} from '../src/snake-player.js';
import {createHawkWorld,stepHawkWorld} from '../src/hawk-player.js';
const result=[];
for(const [role,create,step] of [['frog',createWorld,stepWorld],['grasshopper',createHopperWorld,stepHopper],['snake',createSnakeWorld,stepSnake],['hawk',createHawkWorld,stepHawkWorld]]){
 const rows=[];for(const seed of [1,7,17,49,101,2026]){const w=create({seed});for(let n=0;n<5402&&w.status==='playing';n++)step(w);rows.push({seed,status:w.status,time:+w.time.toFixed(2),food:w.player.eaten});}result.push({role,rows});
}
console.log(JSON.stringify(result,null,2));
