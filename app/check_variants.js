"use strict";
/* Сводная готовность: варианты 1..8 × буквы А, Б, Ч.
   Проверяем по коду приложения, без браузера. */
const fs=require('fs');
const app=fs.readFileSync('index.html','utf8');
const a3=fs.readFileSync('shemy_a3.js','utf8');

// --- какие схемы реально есть в shemy_a3.js
const ключи=[...a3.matchAll(/^\s*"(\d\d)"\s*:/gm)].map(m=>m[1]);
const имена=[...a3.matchAll(/^\s*"(\d\d)"\s*:\s*function\s*\(\)\s*\{/gm)].map(m=>m[1]);
console.log('схем в shemy_a3.js:',имена.length?имена.join(' '):'(ключи '+ключи.join(' ')+')');

// --- какие формы сигнала реализованы
const строкаS=app.split('\n').find(l=>l.indexOf('function s_аналог')>=0)||'';
const блокS=app.split('function s_аналог(t){')[1].split('function глЛепесток')[0];
const формы=[...блокS.matchAll(/N1===(\d)/g)].map(m=>+m[1]);
const заглушка=/return E;\}/.test(блокS);
console.log('формы сигнала N1 реализованы:',формы.join(' ')||'(НЕ НАЙДЕНО)','| заглушка "return E":',заглушка);

// --- буквы
console.log('полюсаФНЧ (Б/Ч):',/function полюсаФНЧ/.test(app)?'есть':'НЕТ');
console.log('решатель Б/Ч:',/function решитьЧ2БЧ/.test(app)?'есть':'НЕТ');
console.log('букваПоГруппе:',/function букваПоГруппе/.test(app)?'есть':'НЕТ');

// --- таблица шифров
const TAB={1:[11,11],2:[21,21],3:[31,31],4:[41,41],5:[51,51],6:[61,61],7:[71,12],8:[81,22]};
const букв=n=>[["Ч","А","Б"],["А","Б","Ч"],["Б","Ч","А"]][n%3];

console.log('\nвар | N1N2 | N3N4 | N2 | форма сигнала | схема А.3 | Б | Ч');
for(let n=1;n<=8;n++){
  const s1=String(TAB[n][0]), N1=+s1[0], N2=+s1[1], N34=String(TAB[n][1]);
  const форма=формы.includes(N1)?'да ('+N1+')':'НЕТ ('+N1+')'+(заглушка?' -> заглушка!':'');
  const схема=имена.includes(N34)?'есть':'НЕТ ('+N34+')';
  const б=букв(n);
  console.log(`${String(n).padStart(3)} | ${s1.padEnd(4)} | ${N34.padEnd(4)} | ${N2}   | ${форма.padEnd(24)} | ${схема.padEnd(10)} | г1=${б[0]} г2=${б[1]} г3=${б[2]}`);
}
