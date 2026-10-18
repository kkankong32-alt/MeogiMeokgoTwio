/** Keep each self-crossing patch in tail-to-head order rather than interleaving
 * tiny strips by Y. Uncrossed sections retain their ordinary ground depth. */
export function groupSnakeCrossings(parts){
 const body=parts.filter(p=>p.ground&&Number.isFinite(p.behind)),parent=body.map((_,i)=>i),linked=new Set(),cells=new Map(),cellSize=90;
 function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
 function join(a,b){parent[root(a)]=root(b);linked.add(a);linked.add(b);}
 body.forEach((p,i)=>{const x=Math.floor(p.ground.x/cellSize),y=Math.floor(p.ground.y*.62/cellSize);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of cells.get((x+dx)+','+(y+dy))??[]){const q=body[j];if(Math.abs(p.behind-q.behind)>130&&Math.hypot(p.ground.x-q.ground.x,(p.ground.y-q.ground.y)*.62)<65)join(i,j);}const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);});
 // Adjacent members of a crossing must not split into alternating ribbons.
 for(let i=1;i<body.length;i++)if(linked.has(i)&&linked.has(i-1))join(i,i-1);
 const groups=new Map();for(const i of linked){const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(body[i]);}
 const grouped=new Set([...groups.values()].flat()),result=parts.filter(p=>!grouped.has(p));
 for(const patches of groups.values()){patches.sort((a,b)=>b.behind-a.behind);result.push({kind:'crossing',depth:Math.max(...patches.map(p=>p.depth)),patches,draw(ctx){for(const p of patches)p.draw(ctx);}});}
 return result;
}
