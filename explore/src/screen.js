export function setupFullscreen(button,doc){
 const supported=!!doc.documentElement?.requestFullscreen;
 button.hidden=!supported;
 const sync=()=>{button.textContent=doc.fullscreenElement?'↙':'⛶';button.setAttribute('aria-label',doc.fullscreenElement?'전체화면 나가기':'전체화면으로 보기');button.title=doc.fullscreenElement?'전체화면 나가기 (Esc)':'전체화면으로 보기';};
 button.addEventListener('click',async()=>{try{if(doc.fullscreenElement)await doc.exitFullscreen();else await doc.documentElement.requestFullscreen();sync();}catch{sync();button.title='브라우저에서 전체화면을 허용하지 않았어요';}});
 doc.addEventListener('fullscreenchange',sync);sync();
}
