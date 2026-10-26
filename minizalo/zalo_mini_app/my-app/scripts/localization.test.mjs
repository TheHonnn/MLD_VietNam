import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transformSync} from '@babel/core';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import localizeJsx from './localize-jsx.mjs';

const source=`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server.browser';
import {getLocale,setLocale,translate} from './src/i18n';export {getLocale,setLocale,translate};
export function render(){return renderToStaticMarkup(<section><button title="Đặt lịch">Đặt lịch</button><input placeholder="Nhập họ và tên" value="Tên khách thật" readOnly/><p>{'Đã thưởng 25 điểm'}</p><p>{'Tên khóa học từ dữ liệu'}</p></section>);}
export function payload(){return {notes:'Đặt lịch',language:'en',recipient:'Tên khách thật'};}`;
const transformed=transformSync(source,{filename:'fixture.tsx',configFile:false,babelrc:false,plugins:[localizeJsx],parserOpts:{plugins:['jsx']}}).code;
const output=await build({stdin:{contents:transformed,loader:'jsx',resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,format:'esm',platform:'browser',plugins:[{name:'ui-alias',setup(builder){builder.onResolve({filter:/^@\/i18n$/},()=>({path:fileURLToPath(new URL('../src/i18n/index.ts',import.meta.url))}));}}]});
const ui=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
test('a pending English load cannot override a later account/language reset',async()=>{
  const pending=ui.setLocale('en');await ui.setLocale('vi');await pending;assert.equal(ui.getLocale(),'vi');
});
test('language changes rendered UI and templates, preserving form values and business payloads',async()=>{
  ui.setLocale('vi');assert.match(ui.render(),/>Đặt lịch</);
  await ui.setLocale('en');const html=ui.render();assert.match(html,/>Booking</);assert.match(html,/placeholder="Enter full name"/);assert.match(html,/Awarded 25 points/);
  assert.match(html,/value="Tên khách thật"/);assert.match(html,/Tên khóa học từ dữ liệu/);
  assert.deepEqual(ui.payload(),{notes:'Đặt lịch',language:'en',recipient:'Tên khách thật'});
  ui.setLocale('vi');assert.match(ui.render(),/>Đặt lịch</);
});
test('translation preserves unknown data, non-string nodes and interpolation values',async()=>{
  await ui.setLocale('en');const node={type:'fixture',props:{id:'Đặt lịch'}};
  assert.equal(ui.translate(node),node);assert.equal(ui.translate(50),50);assert.equal(ui.translate(''), '');
  assert.equal(ui.translate('Ảnh 2 của Trần Văn An'),'Photo 2 of Trần Văn An');
  assert.equal(ui.translate('0901234567'),'0901234567');
  assert.equal(ui.translate('constructor'),'constructor');
  assert.equal(ui.translate('Ảnh $& của $1'),'Photo $& of $1');
  assert.equal(ui.translate('Lịch hẹn'), 'Appointments');
  ui.setLocale('unsupported');assert.equal(ui.getLocale(),'vi');
});
