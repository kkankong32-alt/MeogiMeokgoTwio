import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnakeWorld,stepSnake,SNAKE_PLAY} from '../src/snake-player.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('all eight directions move on the first tick at equal speed, including reversal',()=>{
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
 const w=createSnakeWorld(),p=w.player,start={x:p.x,y:p.y},n=Math.hypot(x,y);
 stepSnake(w,{move:{x,y}});near(p.x-start.x,x/n*SNAKE_PLAY.speed/60);near(p.y-start.y,y/n*SNAKE_PLAY.speed/60);
 }
});
test('changing direction has no old-direction drift and release stops immediately',()=>{
 const w=createSnakeWorld(),p=w.player;
 for(let i=0;i<12;i++)stepSnake(w,{move:{x:-1,y:0}});
 const start={x:p.x,y:p.y};stepSnake(w,{move:{x:0,y:-1}});near(p.x,start.x);near(p.y,start.y-SNAKE_PLAY.speed/60);
 const y=p.y;stepSnake(w,{});near(p.y,y);near(p.x,start.x);
 stepSnake(w,{move:{x:0,y:1}});near(p.y,start.y);
});
test('dash can immediately change direction without waiting for head animation',()=>{
 const w=createSnakeWorld(),p=w.player;stepSnake(w,{jump:true,move:{x:-1,y:0}});
 const start={x:p.x,y:p.y};stepSnake(w,{move:{x:0,y:-1}});near(p.x,start.x);near(p.y,start.y-SNAKE_PLAY.dashSpeed/60);
});
test('new direction plus bite targets that direction',()=>{
 const w=createSnakeWorld();stepSnake(w,{move:{x:0,y:-1},eat:true});assert.deepEqual(w.player.locked,{x:0,y:-1});
});
