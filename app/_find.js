"use strict";
/* Поиск нужных мест в извлечённом тексте методички.
   Запуск: node _find.js <текст.txt> <регулярное выражение> [макс. совпадений] */
const fs=require('fs');
const t=fs.readFileSync(process.argv[2],'utf8');
const re=new RegExp(process.argv[3],'gi');
const max=parseInt(process.argv[4]||'25',10);
const lines=t.split(/\r?\n/);
let page=0,n=0;
lines.forEach(function(l,i){
 const m=/^===== PAGE (\d+) =====$/.exec(l);
 if(m){page=parseInt(m[1],10);return;}
 re.lastIndex=0;
 if(!re.test(l))return;
 n++;
 if(n>max)return;
 console.log('стр.'+page+' ['+(i+1)+'] '+l.trim().slice(0,150));
});
console.log('всего совпадений: '+n);