"use strict";
/* Проверка собранного .docx: остатки LaTeX, примеры формул, поле PAGE. */
const fs=require('fs');
// пропускаем служебный файл блокировки Word, он начинается с "~$"
const имя=fs.readdirSync('.').filter(function(x){
 return x.endsWith('.docx')&&x.slice(0,2)!=='~$';
})[0];
const b=fs.readFileSync(имя);

let doc=null,o=0;
while(o<b.length-4){
 if(b.readUInt32LE(o)!==0x04034b50)break;
 const nl=b.readUInt16LE(o+26), el=b.readUInt32LE(o+18);
 const nm=b.toString('utf8',o+30,o+30+nl);
 const d=b.slice(o+30+nl,o+30+nl+el);
 if(nm==='word/document.xml')doc=d.toString('utf8');
 if(nm==='word/footer1.xml')console.log('footer1.xml есть, PAGE:',/PAGE/.test(d.toString('utf8')));
 o+=30+nl+el;
}
if(!doc){console.log('document.xml не найден');process.exit(1);}

const latex=(doc.match(/\\(frac|text|begin|cdot|le |ge |boxed)/g)||[]);
console.log('символов в document.xml:',doc.length);
console.log('остатки LaTeX-команд:',latex.length,latex.slice(0,5));
console.log('дollar-символов $:',(doc.match(/\$/g)||[]).length);
// где именно остались символы $ — выводим окружающий текст
const all=doc.match(/<w:t[^>]*>([^<]*)<\/w:t>/g).map(function(x){return x.replace(/<[^>]+>/g,'');});
all.forEach(function(x,i){ if(x.indexOf('$')>=0) console.log('  $ в ['+i+']: '+x.slice(0,120)); });

// примеры формул: абзацы по центру с math-содержимым
const абз=doc.split('</w:p>');
const формулы=абз.filter(function(p){
 return /w:jc w:val="center"/.test(p)&&!/drawing/.test(p)&&/w:t/.test(p);
}).map(function(p){
 return (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)||[]).map(function(t){
  return t.replace(/<[^>]+>/g,'');}).join('');
}).filter(function(t){return t.length>3;});
console.log('абзацев по центру с текстом:',формулы.length);
формулы.slice(0,14).forEach(function(f){console.log('  | '+f.slice(0,90));});

// все текстовые фрагменты: ищем формулы по математическим признакам
const t=doc.match(/<w:t[^>]*>([^<]*)<\/w:t>/g).map(function(x){
 return x.replace(/<[^>]+>/g,'');
});
const мат=t.filter(function(x){
 return /H\(z\)|ωв|K\(p\)|Cₖ|θ =|y\(n\)|Тд =|gₙ|b₀|X\(z\)|N\(p\)/.test(x);
});
console.log('математических строк:',мат.length);
мат.slice(0,12).forEach(function(x){console.log('  Ф| '+x.slice(0,88));});
