/** Each snake section owns its ground depth; the frog is not a global overlay. */
export function depthOrder(world,snakePieces){
  return [...snakePieces,...(world.plants??[]),...(world.hunters??[]),...(world.frogs??[]).filter(f=>f.alive),...world.prey.filter(p=>p.alive&&!p.captured),world.player]
    .sort((a,b)=>(a.depth??a.y)-(b.depth??b.y));
}
