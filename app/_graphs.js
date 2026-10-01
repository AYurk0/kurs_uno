"use strict";
/* ============================================================================
   ВЫГРУЗКА ГРАФИКОВ В PNG
   ----------------------------------------------------------------------------
   Собирает временную копию index.html с автоприменением варианта и запускает
   headless Chrome. Встраиваемый скрипт страницы обходит canvas и отдаёт их
   содержимое в data:URL; внешний скрипт (--dump-dom) разбирает ответ и
   записывает PNG-файлы в каталог app/графики.

   Запуск:  node _graphs.js <номер_варианта> <группа>
   Временный файл _t.html удаляется в конце.
   ============================================================================ */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const DIR=__dirname;
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT=path.join(DIR,'графики');
const V=String(process.argv[2]||7),G=String(process.argv[3]||1);

// Русские идентификаторы задаём escape-последовательностями: PowerShell
// портит кириллицу в аргументах командной строки, а файл JS пишется как UTF-8.
const APPLY='применитьВариант';          // применитьВариант()
const SOLVE='решитьВсё';                 // решитьВсё()
const SCHEME='СХЕМА_РЕЗУЛЬТАТ';          // результат расчёта схемы

// --- что выгружаем: [id canvas, подпись файла] ------------------------------
const ГРАФИКИ=[
 ['cvS','ч1_спектр_S'],['cvФ','ч1_фаза_S'],['cvX','ч1_отсчеты_x'],
 ['cvDft','ч1_дпф'],['cvRest','ч1_восстановление'],['cvCmp','ч1_сравнение'],
 ['cvA','ч2а_ачх_аналог'],['cvФ2','ч2а_фаза_аналог'],['cvG','ч2а_переходная'],
 ['cvY','ч2а_отклик'],['cvBC','ч2а_ачх_цифр'],['cvBCф','ч2а_фаза_цифр'],
 ['cvBCg','ч2а_сравнение_ачх']];

function собрать(){
 const h=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
 const list=JSON.stringify(ГРАФИКИ);
 // Графики строятся как SVG с CSS-переменными (var(--grid) и т.п.). Чтобы
 // отрисовать SVG в canvas, переменные надо заменить на конкретные цвета,
 // иначе внедрённый документ их не увидит.
 const inj='<script>window.addEventListener("load",function(){'
  +'try{'
  +'document.getElementById("vNom").value="'+V+'";'
  +'document.getElementById("vGrp").value="'+G+'";'
  +'window["'+APPLY+'"]();'
  +'}catch(e){document.title="ERR:"+e.message;}'
  +'setTimeout(function(){'
  +'var cs=getComputedStyle(document.documentElement);'
  +'function svgToData(el,scale){'
  +'var svg=el.querySelector("svg");if(!svg)return null;'
  +'var clone=svg.cloneNode(true);'
  +'var raw=clone.outerHTML;'
  +'raw=raw.replace(/var\\((--[a-zA-Z0-9_-]+)\\)/g,function(mm,nm){'
  +'var v=cs.getPropertyValue(nm);return (v&&v.trim())?v.trim():"#000";});'
  +'if(!/xmlns=/.test(raw))raw=raw.replace("<svg","<svg xmlns=\'http://www.w3.org/2000/svg\'");'
  +'var W=640,H=parseInt((svg.getAttribute("viewBox")||"0 0 640 270").split(/[\\s,]+/)[3],10)||270;'
  +'var cv=document.createElement("canvas");'
  +'cv.width=W*scale;cv.height=H*scale;'
  +'var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);'
  +'cx.setTransform(scale,0,0,scale,0,0);'
  +'return new Promise(function(res){var im=new Image();'
  +'im.onload=function(){cx.drawImage(im,0,0,W,H);res(cv.toDataURL("image/png"));};'
  +'im.onerror=function(){res(null);};'
  +'im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(raw);});}'
  +'var list='+list+',res={},jobs=[];'
  +'list.forEach(function(g){var el=document.getElementById(g[0]);'
  +'if(!el){res[g[1]]=null;return;}'
  +'jobs.push(svgToData(el,2).then(function(u){res[g[1]]=u;}));});'
  +'var sv=document.querySelector("#холстСхемы");'
  +'if(sv){var raw2=sv.outerHTML;'
  +'raw2=raw2.replace(/var\\((--[a-zA-Z0-9_-]+)\\)/g,function(mm,nm){'
  +'var v=cs.getPropertyValue(nm);return (v&&v.trim())?v.trim():"#000";});'
  +'res["схема"]=raw2;}'
  +'Promise.all(jobs).then(function(){'
  +'var pre=document.createElement("script");'
  +'pre.type="application/json";pre.id="__dump";'
  +'pre.textContent=JSON.stringify(res);document.body.appendChild(pre);});'
  +'},2000);});</script></body>';
 fs.writeFileSync(path.join(DIR,'_t.html'),h.replace('</body>',inj));
}

function chrome(args){
 return cp.execSync('"'+CHROME+'" '+args,{cwd:DIR,maxBuffer:1<<28,stdio:['ignore','pipe','ignore']}).toString();
}

собрать();
if(!fs.existsSync(CHROME)){console.error('Chrome не найден: '+CHROME);process.exit(2);}

const dom=chrome('--headless --disable-gpu --no-sandbox --virtual-time-budget=15000 '
 +'--window-size=1400,1200 --dump-dom "file:///'+path.join(DIR,'_t.html').replace(/\\/g,'/')+'"');
const m=dom.match(/<script type="application\/json" id="__dump">([\s\S]*?)<\/script>/);
if(!m){console.error('данные графиков не получены (нет блока __dump)');process.exit(3);}
const res=JSON.parse(m[1]);

if(!fs.existsSync(OUT))fs.mkdirSync(OUT,{recursive:true});
let ok=0,пусто=[];
Object.keys(res).forEach(function(k){
 const d=res[k];
 if(!d){пусто.push(k);return;}
 const b=Buffer.from(String(d).split(',')[1]||'','base64');
 if(b.length<1000){пусто.push(k);return;}
 fs.writeFileSync(path.join(OUT,k+'.png'),b);ok++;
});
// SVG схемы сохраняем отдельно — она не canvas. Затем конвертируем в PNG
// тем же приёмом (SVG → canvas), потому что в docx нужен растр.
if(res['схема']){
 fs.writeFileSync(path.join(OUT,'схема_12.svg'),String(res['схема']),'utf8');
}
try{fs.unlinkSync(path.join(DIR,'_t.html'));}catch(e){}

function cssПриложения(){
 const h=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
 const out=[];const re=/<style[^>]*>([\s\S]*?)<\/style>/g;let m;
 while((m=re.exec(h)))out.push(m[1]);
 return out.join('\n');
}
function svgСхемуВPng(){
 if(!res['схема'])return;
 // Провода и символы схемы раскрашены классами из CSS приложения, поэтому
 // вместе с SVG обязательно вставляем исходные стили — иначе остаются точки.
 const raw=String(res['схема']).replace(/var\((--[a-zA-Z0-9_-]+)\)/g,'"#"');
 const svg=raw.replace(/^<svg/,'<svg xmlns="http://www.w3.org/2000/svg"');
 const wrap='<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
  +cssПриложения()+'</style></head><body style="margin:0;background:#fff">'
  +svg+'</body></html>';
 const tmp=path.join(OUT,'_svgtmp.html');
 fs.writeFileSync(tmp,wrap,'utf8');
 try{
  chrome('--headless --disable-gpu --no-sandbox --virtual-time-budget=4000 '
   +'--window-size=1000,620 --screenshot="'+path.join(OUT,'схема_12.png')+'" '
   +'"file:///'+tmp.replace(/\\/g,'/')+'"');
 }catch(e){console.log('схема в PNG не сконвертирована: '+e.message);}
 try{fs.unlinkSync(tmp);}catch(e){}
}

svgСхемуВPng();
console.log('выгружено PNG: '+ok+' из '+ГРАФИКИ.length);
if(пусто.length)console.log('пусто/пропущено: '+пусто.join(', '));
console.log('каталог: '+OUT);