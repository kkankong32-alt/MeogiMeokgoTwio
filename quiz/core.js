(function(root){
 const normalize=s=>String(s??'').normalize('NFKC').replace(/[\s.,!?。！？]/g,'').toLowerCase();
 function essayGrade(a){
  const t=normalize(a);
  // Explicit classroom rubric, not an AI semantic judgment.
  const alternative=/(다른|여러가지|여러|다양한|대체)먹이|다른생물|다른동물|다른것/;
  const negative=/(먹을|이용할|구할|찾을|살아갈|살아남을)수가?없|못먹|먹지못|먹지않|먹을수없|이용할수없|먹을수있지않|먹을수있.*(아니|없)|다른먹이.{0,8}(없|아니)|모든생물.{0,10}(반드시|무조건)|무조건.{0,10}(살|생존)|항상.{0,10}(살아남|살아가)/;
  if(!alternative.test(t)||negative.test(t))return false;
  const tail=t.slice(t.search(alternative));
  return /먹이.{0,18}(먹을수있|먹어요|먹어도|먹어서|먹으면|먹기때문|먹고|먹으며|먹는|먹습니다|이용할수있|이용해|이용하|구할수있|찾을수있)|다른(생물|동물|것).{0,14}(먹을수있|먹고|먹어서|먹어요|먹기때문)/.test(tail);
 }
 function grade(q,a){
  if(q.type==='essay')return essayGrade(a);
  if(q.type==='order')return Array.isArray(a)&&a.length===q.answer.length&&a.every((v,i)=>v===q.answer[i]);
  if(q.accepted)return q.accepted.some(v=>normalize(v)===normalize(a));
  return a===q.answer;
 }
 function tally(questions,records){
  let correct=0,pending=0,answered=0;
  questions.forEach((q,i)=>{const r=records[i];if(!r?.submitted)return;answered++;const g=grade(q,r.value);if(g===true)correct++;else if(g!==false)pending++;});
  return {correct,pending,answered,passed:answered===questions.length&&correct>=7};
 }
 const api={normalize,essayGrade,grade,tally};root.QuizCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
