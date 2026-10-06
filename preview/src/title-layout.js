/** Responsive approved wide art plus the new portrait adaptation; no distorted text. */
export const TITLE_ART=Object.freeze({
 landscape:{asset:'titleLandscape',path:'title/entry-v03.png',width:1664,height:936,safe:{left:460,top:34,right:1290,bottom:880},button:{x:530,y:719,width:594,height:137}},
 portrait:{asset:'titlePortrait',path:'title/entry-v03-portrait.png',width:941,height:1672,safe:{left:130,top:184,right:809,bottom:1521},button:{x:183,y:1360,width:577,height:148}}
});
export function titleLayout(width,height){
 width=Math.max(1,width);height=Math.max(1,height);
 const candidates=Object.entries(TITLE_ART).map(([variant,source])=>{
  const cx=source.width/2,cy=source.height/2,safeWidth=2*Math.max(cx-source.safe.left,source.safe.right-cx),safeHeight=2*Math.max(cy-source.safe.top,source.safe.bottom-cy),cover=Math.max(width/source.width,height/source.height);
  const scale=Math.min(cover,Math.max(1,width-16)/safeWidth,Math.max(1,height-16)/safeHeight);
  return {variant,source,cover,scale,coverage:scale/cover};
 });
 const best=candidates.sort((a,b)=>b.coverage-a.coverage||Math.abs(width/height-a.source.width/a.source.height)-Math.abs(width/height-b.source.width/b.source.height))[0],{source,scale,cover}=best;
 const art={x:(width-source.width*scale)/2,y:(height-source.height*scale)/2,width:source.width*scale,height:source.height*scale};
 const button={x:art.x+source.button.x*scale,y:art.y+source.button.y*scale,width:source.button.width*scale,height:source.button.height*scale};
 if(button.height<44){button.y-=(44-button.height)/2;button.height=44;}
 return {variant:best.variant,asset:source.asset,path:source.path,source,art,button,blendAxis:art.width<width-.1?'horizontal':'vertical',blended:scale<cover-.001};
}
