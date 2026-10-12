import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {SHADES,recommendation,describeColor,replyFor} from './core.mjs';
const state={occasion:'daily',style:'soft'};
assert.equal(recommendation('daily','soft'),'rose');
assert.equal(recommendation('date','soft'),'peach');
assert.equal(recommendation('date','bold'),'red');
assert.equal(recommendation('interview','bold'),'berry');
assert.match(replyFor('我怕别人觉得我很奇怪',state),/不打分/);
assert.match(replyFor('手不方便',state),/温暖同行/);
assert.match(replyFor('看不清颜色',state),/听听试色描述/);
assert.match(replyFor('皮肤过敏',state),/不作皮肤诊断/);
assert.match(replyFor('一个未覆盖的复杂问题',state),/预设情景演示/);
for(const shade of Object.keys(SHADES)){assert.match(describeColor(shade,45),/自然薄涂/);assert.match(describeColor(shade,90),/鲜明浓涂/);assert.match(describeColor(shade,45,false),/暂未生成试色效果/);}
const html=readFileSync('index.html','utf8'),js=readFileSync('app.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'IDs must be unique');
for(const [,id] of js.matchAll(/\$\('#([\w-]+)'\)/g)){assert.ok(ids.includes(id)||id==='tour-strip','Missing element '+id);}
for(const [,path] of html.matchAll(/(?:src|href)="((?:assets\/|style\.css|app\.js)[^"#]*)"/g)){assert.ok(existsSync(path),'Missing asset '+path);}
assert.ok(existsSync('assets/vision/face_landmarker.task'));assert.ok(existsSync('assets/vision/wasm/vision_wasm_internal.wasm'));
assert.ok(!/https?:\/\//.test(js),'App must not send photo or chat data to external endpoints');
console.log('PASS: recommendation, inclusive response branches, failure-state descriptions, DOM references, local assets and privacy checks.');
