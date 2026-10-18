/** Gameplay timing is independent of the preserved source animation clips. */
export const ARCADE=Object.freeze({moveSpeed:230,acceleration:2800,braking:4200,
  eatDuration:.28,eatContact:.075,eatCommit:.22,
  big:Object.freeze({duration:.46,distance:166.4,height:58,recovery:.12}),
  short:Object.freeze({duration:.23,distance:76,height:16,recovery:.09}),
  warning:.75,attackSeconds:.30,attackSpeed:600,chaseSpeed:135,patrolSpeed:95,
  sight:520,attackRange:205,recovery:1.05,turnRadius:85});
export function jumpProgress(u){return Math.max(0,Math.min(1,u));}
export function effectForEvent(event){
  return ({ate:['+1 먹었어요','#e8ff81'], 'eat-missed':['빗나감','#dce4df'],
    'near-miss':['아슬아슬!','#8de9ff'], 'predator-missed':['공격 빗나감','#ffcb77'],
    caught:['잡혔어요','#ff9385'], 'jump-blocked':['길이 막혔어요','#ffe19a']})[event.type];
}
