/** Remaining edible units, not a science-understanding grade. */
export function remainingFood(w){
 if(w.role==='grasshopper')return w.plants.reduce((n,p)=>n+Math.max(0,p.leaves),0);
 if(w.role==='hawk')return [...w.frogs,...w.groundSnakes].filter(p=>p.alive).length;
 if(w.role==='snake')return w.frogs.filter(p=>p.alive).length;
 return w.prey.filter(p=>p.alive).length;
}
