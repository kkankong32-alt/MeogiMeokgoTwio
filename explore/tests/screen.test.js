import test from 'node:test';
import assert from 'node:assert/strict';
import {setupFullscreen} from '../src/screen.js';
function fixture(supported=true,reject=false){
 const handlers={};const button={setAttribute(k,v){this[k]=v},addEventListener(k,v){handlers[k]=v}};
 const doc={fullscreenElement:null,documentElement:{},addEventListener(){},async exitFullscreen(){this.fullscreenElement=null}};
 if(supported)doc.documentElement.requestFullscreen=async()=>{if(reject)throw Error('denied');doc.fullscreenElement=doc.documentElement};
 setupFullscreen(button,doc);return {button,doc,click:()=>handlers.click()};
}
test('fullscreen requires a click and can exit again',async()=>{const f=fixture();assert.equal(f.doc.fullscreenElement,null);await f.click();assert.equal(f.button['aria-label'],'전체화면 나가기');await f.click();assert.equal(f.doc.fullscreenElement,null)});
test('unsupported fullscreen hides the control',()=>{assert.equal(fixture(false).button.hidden,true)});
test('denied fullscreen leaves game intact and provides explanation',async()=>{const f=fixture(true,true);await f.click();assert.equal(f.doc.fullscreenElement,null);assert.match(f.button.title,/허용하지/)});
