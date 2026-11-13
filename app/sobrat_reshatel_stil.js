"use strict";
/* Собирает reshatel_stil.html из index.html: тот же решатель плюс панель
   «Оформление графиков» (stil.js) и выгрузка графиков в Excel (xlsx.js).
   После любых правок index.html файл нужно пересобрать:
     node app/sobrat_reshatel_stil.js                                         */
const fs=require('fs'),path=require('path');
const DIR=__dirname;
let s=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
function вставить(якорь,что,после){const i=s.indexOf(якорь);
 if(i<0||s.indexOf(якорь,i+1)>=0)throw new Error('якорь не найден или не единственный: '+якорь.slice(0,60));
 s=после?s.slice(0,i+якорь.length)+что+s.slice(i+якорь.length):s.slice(0,i)+что+s.slice(i);}
s=s.replace(/<title>[^<]*<\/title>/,'<title>Решатель курсовой — ДОС и ЦФ, с настройкой графиков</title>');
вставить('</style>','.стиль-сетка{display:flex;flex-wrap:wrap;gap:6px 14px}.стиль-сетка label{font-size:13px}\n',false);
вставить('📄 Полный отчёт в Word (.doc)</button>',
 '\n<button onclick="экспортExcel()" style="background:#e2efda;color:#375623;border:1px solid #c6e0b4;">📊 Графики в Excel (.xlsx)</button>',true);
вставить('<div class="card"><h2>1. Редактор схем',
 '<div class="card"><h2>Оформление графиков</h2>\n<div class="small">Настройки действуют на графики на странице, на рисунки в отчётах Word и на диаграммы в Excel.</div>\n<div id="панельСтиля" style="margin-top:6px"></div></div>\n',false);
вставить('<script src="otchet_doc.js"></script>','\n<script src="stil.js"></script>\n<script src="xlsx.js"></script>',true);
fs.writeFileSync(path.join(DIR,'reshatel_stil.html'),s);
console.log('reshatel_stil.html собран');
