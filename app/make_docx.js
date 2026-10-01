"use strict";
/* ============================================================================
   СБОРКА ПОЯСНИТЕЛЬНОЙ ЗАПИСКИ В .DOCX (вариант 7)
   ----------------------------------------------------------------------------
   Запуск:  node make_docx.js

   Формат .docx — это zip-архив с файлами OOXML. Пишем его напрямую (zlib из
   стандартной библиотеки node), без внешних зависимостей и без Word COM:
   PowerShell портит кириллицу в аргументах командной строки, а COM-автоматизация
   Word через него же работает нестабильно.

   Текст берётся из Отчет_вариант_7.md, графики — из каталога графики/
   (их выгружает _graphs.js из того же приложения). Все числа в записке уже
   проверены регрессионным тестом test_schemy.js.
   ============================================================================ */
const fs=require('fs'),path=require('path');
const DIR=__dirname;
const ГРАФ=path.join(DIR,'графики');

// ------------------------------------------------------------------ ZIP (store)
function crc32(buf){
 const t=[];let c;
 for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}
 let crc=0xFFFFFFFF;
 for(let i=0;i<buf.length;i++)crc=t[(crc^buf[i])&0xFF]^(crc>>>8);
 return (crc^0xFFFFFFFF)>>>0;
}
function zip(файлы){
 const лок=[],центр=[];let off=0;
 файлы.forEach(function(f){
  const nm=Buffer.from(f.имя,'utf8');
  const data=Buffer.isBuffer(f.данные)?f.данные:Buffer.from(f.данные,'utf8');
  const crc=crc32(data);
  const lh=Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0x0800,6);
  lh.writeUInt32LE(crc,14);lh.writeUInt32LE(data.length,18);lh.writeUInt32LE(data.length,22);
  lh.writeUInt16LE(nm.length,26);
  лок.push(lh,nm,data);
  const ch=Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);
  ch.writeUInt16LE(0x0800,8);
  ch.writeUInt32LE(crc,16);ch.writeUInt32LE(data.length,20);ch.writeUInt32LE(data.length,24);
  ch.writeUInt16LE(nm.length,28);ch.writeUInt32LE(off,42);
  центр.push(ch,nm);
  off+=30+nm.length+data.length;
 });
 const cd=Buffer.concat(центр);
 const end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);
 end.writeUInt16LE(файлы.length,8);end.writeUInt16LE(файлы.length,10);
 end.writeUInt32LE(cd.length,12);end.writeUInt32LE(off,16);
 return Buffer.concat([Buffer.concat(лок),cd,end]);
}

function esc(s){
 return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// ------------------------------------------------------------ разбор **жирного**
function runs(текст){
 const out=[];let i=0;const s=String(текст);
 while(i<s.length){
  if(s.startsWith('**',i)){
   const e=s.indexOf('**',i+2);
   if(e>0){out.push({b:true,t:s.slice(i+2,e)});i=e+2;continue;}
  }
  if(s[i]==='`'){
   const e=s.indexOf('`',i+1);
   if(e>0){out.push({code:true,t:s.slice(i+1,e)});i=e+1;continue;}
  }
  let j=i;
  while(j<s.length && s[j]!=='`' && !s.startsWith('**',j))j++;
  if(j===i)j=i+1;
  out.push({t:s.slice(i,j)});i=j;
 }
 return out.filter(function(r){return r.t.length;});
}
function runsXml(текст){
 return runs(текст).map(function(r){
  const t=esc(r.t);
  let pr='';
  if(r.code)pr='<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="22"/></w:rPr>';
  else if(r.b)pr='<w:rPr><w:b/></w:rPr>';
  return '<w:r>'+pr+'<w:t xml:space="preserve">'+t+'</w:t></w:r>';
 }).join('');
}

// ------------------------------------------------------------------ абзацы
const P=function(xml,св){return '<w:p>'+(св||'')+xml+'</w:p>';};
// основной текст: выключка по ширине, отступ 1,25 см, полуторный интервал
const ОСН='<w:pPr><w:ind w:firstLine="709"/><w:spacing w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>';
const НЕТ_ОТСТУПА='<w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>';
const ЦЕНТР='<w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr>';
function абзац(текст,св){return P(runsXml(текст),св===undefined?ОСН:св);}

function ячейка(текст,ширина,жирный){
 const b=жирный?'<w:b/>':'';
 const rr=runs(текст).map(function(r){
  return '<w:r><w:rPr>'+b+(r.b?'<w:b/>':'')+'</w:rPr><w:t xml:space="preserve">'+esc(r.t)+'</w:t></w:r>';
 }).join('');
 return '<w:tc><w:tcPr><w:tcW w:w="'+ширина+'" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>'
  +P(rr,'<w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>')+'</w:tc>';
}
function таблица(строки){
 const w=Math.floor(9300/строки[0].length);
 const head=строки[0].map(function(c){return ячейка(c,w,true);}).join('');
 const rest=строки.slice(1).map(function(r){
  return '<w:tr>'+r.map(function(c){return ячейка(c,w,false);}).join('')+'</w:tr>';
 }).join('');
 const bd='<w:tblBorders>'
 +'<w:top w:val="single" w:sz="6" w:color="000000"/>'
 +'<w:left w:val="single" w:sz="6" w:color="000000"/>'
 +'<w:bottom w:val="single" w:sz="6" w:color="000000"/>'
 +'<w:right w:val="single" w:sz="6" w:color="000000"/>'
 +'<w:insideH w:val="single" w:sz="6" w:color="000000"/>'
 +'<w:insideV w:val="single" w:sz="6" w:color="000000"/>'
 +'</w:tblBorders>';
return '<w:tbl><w:tblPr><w:tblW w:w="9300" w:type="dxa"/>'+bd+'</w:tblPr>'
 +'<w:tr><w:trPr><w:tblHeader/></w:trPr>'+head+'</w:tr>'+rest+'</w:tbl>';
}
// --------------------------------------------------------------------- рисунки
const рисунки=[];
const ШИРИНА=5486400;   // 15,24 см — по ширине абзацного поля A4
const ОГР_ВЫС=4500000;  // 12,5 см — иначе высокий график уходит на следующую страницу
const ЕД_В_СМ=360000;   // EMU в сантиметре
// Пропорции берём из самого PNG (заголовок IHDR, байты 16..23). Раньше ширина и
// высота задавались одинаковыми, и любой график растягивался в квадрат.
function размерПоПропорциям(файл){
 const d=fs.readFileSync(файл);
 const px_ш=d.readUInt32BE(16), px_в=d.readUInt32BE(20);
 let cx=ШИРИНА, cy=Math.round(ШИРИНА*px_в/px_ш);
 if(cy>ОГР_ВЫС){cy=ОГР_ВЫС;cx=Math.round(ОГР_ВЫС*px_ш/px_в);}
 return {cx:cx,cy:cy};
}
let relId=10;           // rId1 и rId2 заняты стилем и настройками
function добавитьРисунок(файл,подпись){
 if(!fs.existsSync(файл)){console.log('  ! нет файла графика: '+файл);return '';}
 const имя='image'+(рисунки.length+1)+'.png';
 const id=++relId;
 const rid='rId'+id;
 рисунки.push({имя:имя,данные:fs.readFileSync(файл),rid:rid});
 const n=рисунки.length;
 const размер=размерПоПропорциям(файл);
 let xml=P('<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
  +'<wp:extent cx="'+размер.cx+'" cy="'+размер.cy+'"/>'
  +'<wp:docPr id="'+n+'" name="Рисунок '+n+'"/>'
  +'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
  +'<pic:pic><pic:nvPicPr><pic:cNvPr id="'+n+'" name="'+имя+'"/><pic:cNvPicPr/></pic:nvPicPr>'
  +'<pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
  +'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+размер.cx+'" cy="'+размер.cy+'"/></a:xfrm>'
+'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
  +'</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>',ЦЕНТР);
 xml+=P(runsXml('Рисунок '+n+' — '+подпись),ЦЕНТР);
 return xml;
}
// ---------------------------------------------------------------- разбор markdown
function разобрать(md){
 const строки=md.split(/\r?\n/);
 const блоки=[];let i=0;
 while(i<строки.length){
  const l=строки[i];
  if(/^```/.test(l)){
   const буфер=[];i++;
   while(i<строки.length&&!/^```/.test(строки[i])){буфер.push(строки[i]);i++;}
   i++;
   блоки.push({тип:'pre',строки:буфер});continue;
  }
  if(/^\s*$/.test(l)){i++;continue;}
  if(/^---+$/.test(l.trim())){i++;continue;}
  if(/^#{1,6}\s+/.test(l)){
   const m=l.match(/^(#{1,6})\s+(.*)$/);
   блоки.push({тип:'h',уровень:m[1].length,текст:m[2]});i++;continue;
  }
  // Явная вставка иллюстрации: ![имя_файла](подпись). Нужна, чтобы держать
  // рисунок рядом с текстом, который его описывает, и не зависеть от названий
  // разделов (в отличие от привязки ПОСЛЕ_ЗАГЛОВКА).
  if(/^!\[[^\]]+\]\(.*\)\s*$/.test(l)){
   const im=l.match(/^!\[([^\]]+)\]\((.*)\)\s*$/);
   блоки.push({тип:'img',файл:im[1],подпись:im[2]});i++;continue;
  }
  if(/^\s*\|.*\|\s*$/.test(l)){
   const ст=[];
   while(i<строки.length&&/^\s*\|.*\|\s*$/.test(строки[i])){
    const cs=строки[i].trim().replace(/^\||\|$/g,'').split('|').map(function(c){return c.trim();});
    if(!cs.every(function(c){return /^:?-{2,}:?$/.test(c);}))ст.push(cs);
    i++;
   }
   if(ст.length)блоки.push({тип:'tbl',строки:ст});
   continue;
  }
  if(/^\s*[-*]\s+/.test(l)){
   const буфер=[];
   while(i<строки.length&&/^\s*[-*]\s+/.test(строки[i])){буфер.push(строки[i].replace(/^\s*[-*]\s+/,''));i++;}
   блоки.push({тип:'ul',пункты:буфер});continue;
  }
  if(/^\s*\d+\.\s+/.test(l)){
   const буфер=[];
   while(i<строки.length&&/^\s*\d+\.\s+/.test(строки[i])){буфер.push(строки[i].replace(/^\s*\d+\.\s+/,''));i++;}
   блоки.push({тип:'ol',пункты:буфер});continue;
  }
  блоки.push({тип:'p',текст:l});i++;
 }
 return блоки;
}
// ---------------------------------------------------------------- титульный лист
function титульный(){
 function ц(т,крупно){
  const sz=крупно?32:28;
  // rPr должен находиться ВНУТРИ прогона (w:r), а не на уровне абзаца —
  // иначе Word показывает служебные символы и ломает строку.
  const r='<w:r><w:rPr><w:b/><w:sz w:val="'+sz+'"/></w:rPr>'
   +'<w:t xml:space="preserve">'+esc(т)+'</w:t></w:r>';
  return P(r,'<w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr>');
 }
 const L=[];
 L.push(ц('МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ'));
 L.push(ц('_______________________________________________'));
 L.push(ц(''));
 L.push(ц(''));
 L.push(ц('КУРСОВАЯ РАБОТА'));
 L.push(ц('по дисциплине «Дискретная обработка сигналов и цифровая фильтрация»'));
 L.push(ц(''));
 L.push(ц('Тема: «Обработка сигнала и синтез цифрового фильтра»'));
 L.push(ц(''));
 L.push(ц('Вариант 7'));
 L.push(ц(''));
 L.push(ц(''));
 L.push(ц('Выполнил: студент группы ___________'));
 L.push(ц('_______________________________'));
 L.push(ц(''));
 L.push(ц(''));
 L.push(ц('Проверил: ___________________'));
 L.push(ц(''));
 L.push(ц(''));
 L.push(ц('_______________________________'));
 L.push(ц('___________________________'));
 L.push(P('<w:r><w:br w:type="page"/></w:r>',''));
 return L.join('');
}

// ------------------------------------- привязка рисунков к подзаголовкам записки
const ПОСЛЕ_ЗАГЛОВКА={
 '2.1. Спектр сигнала и его верхняя граница':[
  ['ч1_спектр_S','Амплитудный спектр сигнала s(t) и уровень 0,1·max']],
 '2.3. Дискретные отсчёты x(n) = s(nTд)':[
  ['ч1_отсчеты_x','Дискретные отсчёты x(n) = s(n·Тд)']],
 '2.4. Спектр дискретизированного сигнала':[
  ['ч1_фаза_S','Фазовая характеристика сигнала S(ω)'],
  ['ч1_дпф','Спектр дискретизированного сигнала, ДПФ при N = 12'],
  ['ч1_восстановление','Восстановление сигнала по отсчётам']],
 '2.6. Обратное Z-преобразование (п. 2.1.6)':[
  ['ч1_сравнение','Сравнение исходного сигнала и восстановленного']],
 '3.1. Коэффициент передачи аналогового прототипа':[
  ['схема_12','Схема цепи-прототипа (шифр 12)'],
  ['ч2а_ачх_аналог','АЧХ аналогового прототипа |K(jω)|']],
 '3.3. Переходная характеристика аналогового прототипа':[
  ['ч2а_переходная','Переходная характеристика аналогового прототипа'],
  ['ч2а_фаза_аналог','Фазовая характеристика аналогового прототипа']],
 '3.6. Отклик на последовательность x(n) из части 1':[
  ['ч2а_отклик','Отклик ЦФ на последовательность x(n)']],
 '3.7. Сравнительные выводы (п. 2.2.6)':[
  ['ч2а_ачх_цифр','АЧХ цифрового фильтра'],
  ['ч2а_фаза_цифр','Фазовая характеристика цифрового фильтра'],
  ['ч2а_сравнение_ачх','Сравнение АЧХ аналогового прототипа и ЦФ']]
};
// ---------------------------------------------------------------- запись .docx
const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
 +'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
 +'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
 +'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
 +'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

const CONTENT_TYPES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 +'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
 +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
 +'<Default Extension="xml" ContentType="application/xml"/>'
 +'<Default Extension="png" ContentType="image/png"/>'
 +'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
 +'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
 +'<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
 +'<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
 +'</Types>';

const ROOT_RELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
 +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
 +'</Relationships>';

const STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 +'<w:styles '+NS+'>'
 +'<w:docDefaults><w:rPrDefault><w:rPr>'
 +'<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
 +'<w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="ru-RU"/>'
 +'</w:rPr></w:rPrDefault>'
 +'<w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault>'
 +'</w:docDefaults>'
 +'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>'
 +'<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="28"/></w:rPr></w:style>'
 +'</w:styles>';

const SETTINGS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 +'<w:settings '+NS+'><w:compat/></w:settings>';

// A4; поля: левое 30 мм, правое 15 мм, верхнее 20 мм, нижнее 20 мм
const SECTPR='<w:sectPr><w:footerReference w:type="default" r:id="rId3"/>'
 +'<w:pgSz w:w="11906" w:h="16838"/>'
 +'<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" '
 +'w:header="708" w:footer="708" w:gutter="0"/>'
 +'<w:cols w:space="708"/><w:docGrid w:linePitch="360"/>'
 +'</w:sectPr>';

// Колонтитул: номер страницы по центру (поле PAGE — Word пересчитывает сам).
const NS_W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const КОЛОНТИТУЛ='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 +'<w:ftr '+NS+'><w:p><w:pPr><w:jc w:val="center"/>'
 +'<w:rPr><w:sz w:val="24"/></w:rPr></w:pPr>'
 +'<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
 +'<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
 +'<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
 +'<w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>2</w:t></w:r>'
 +'<w:r><w:fldChar w:fldCharType="end"/></w:r>'
 +'</w:p></w:ftr>';

function записать(){
 const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  +'<w:document '+NS+'><w:body>'+титульный()+собрать()+SECTPR+'</w:body></w:document>';

 let rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
  +'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
 +'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>';
 рисунки.forEach(function(p){
  rels+='<Relationship Id="'+p.rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+p.имя+'"/>';
 });
 rels+='</Relationships>';

 const файлы=[
  {имя:'[Content_Types].xml',данные:CONTENT_TYPES},
  {имя:'_rels/.rels',данные:ROOT_RELS},
  {имя:'word/document.xml',данные:doc},
  {имя:'word/_rels/document.xml.rels',данные:rels},
  {имя:'word/styles.xml',данные:STYLES},
  {имя:'word/settings.xml',данные:SETTINGS},
   {имя:'word/footer1.xml',данные:КОЛОНТИТУЛ}
 ];
 рисунки.forEach(function(p){файлы.push({имя:'word/media/'+p.имя,данные:p.данные});});

 const out=path.join(DIR,'Курсовая_вариант_7.docx');
 fs.writeFileSync(out,zip(файлы));
 console.log('готово: '+out);
 console.log('размер: '+(fs.statSync(out).size/1024).toFixed(1)+' КБ');
 console.log('рисунков вставлено: '+рисунки.length);
}

function собрать(){
 const f=fs.readdirSync(DIR).filter(function(x){return x.endsWith('.md');})  .filter(function(x){return /^Отчет_вариант_7\.md$/.test(x);})[0];
 if(!f)throw new Error('не найден .md с запиской');
 // Содержимое между маркерами $$ … $$ (в т.ч. многострочных $$…$$) — это формула.
// В Word она выводится отдельным абзацем по центру, без отступа первой строки.
// Смысл: в документ попадает читаемая формула, а не исходник в LaTeX.
const text=fs.readFileSync(path.join(DIR,f),'utf8').split(/\r?\n/);
const блоки=[];let i=0;
while(i<text.length){
 const строка=text[i];
 if(строка.trim()==='$$'){
  const буфер=[];i++;
  while(i<text.length&&text[i].trim()!=='$$'){буфер.push(text[i]);i++;}
  i++;                       // закрывающий $$
  блоки.push({тип:'formula',текст:буфер.join('\n').trim()});
  continue;
 }
 i++;
 блоки.push.apply(блоки,разобрать(строка+'\n'));
}
 // Шапка исходного .md («ПОЯСНИТЕЛЬНАЯ ЗАПИСКА», дисциплина, вариант) уже
 // перенесена на титульный лист — её в теле документа повторять не нужно.
 const начало=блоки.findIndex(function(b){return b.тип==='h'&&/^СОДЕРЖАНИЕ/i.test(b.текст.trim());});
 const тело=начало>=0?блоки.slice(начало):блоки;
 const out=[];
 let вОглавлении=false;
 тело.forEach(function(b){
  if(b.тип==='h'){
   const t=b.текст.trim();
   if(/^СОДЕРЖАНИЕ/i.test(t)){
    out.push(P('<w:r><w:br w:type="page"/></w:r>',''));
    out.push(P(runsXml('СОДЕРЖАНИЕ'),
     '<w:pPr><w:pageBreakBefore/><w:jc w:val="center"/><w:spacing w:after="180"/></w:pPr>'));
    вОглавлении=true;return;
   }
   if(вОглавлении){
    // оглавление заканчивается первым заголовком верхнего уровня
    if(b.уровень<=2){вОглавлении=false;}
    else{out.push(абзац(t,'<w:pPr><w:spacing w:after="60"/><w:ind w:left="425"/></w:pPr>'));return;}
   }
   if(b.уровень<=2){
    out.push(P(runsXml(t),
     '<w:pPr><w:pageBreakBefore/><w:jc w:val="center"/><w:spacing w:before="240" w:after="180"/></w:pPr>'));
   } else {
    out.push(P(runsXml(t),
     '<w:pPr><w:jc w:val="left"/><w:spacing w:before="180" w:after="120"/></w:pPr>'));
   }
   // Рисунки вставляются по явным маркерам ![файл](подпись) в тексте записки,
   // поэтому привязка к названиям заголовков здесь отключена.
   return;
   return;
  }
  if(вОглавлении)return;
  if(b.тип==='img'){
   out.push(добавитьРисунок(path.join(ГРАФ,b.файл+'.png'),b.подпись));
   return;
  }
  if(b.тип==='formula'){
   // Формула: по центру, без отступа первой строки, полужирный не используется.
   b.текст.split('\n').forEach(function(строкаФормулы){
    out.push(P(esc(строкаФормулы),
     '<w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/>'
     +'<w:ind w:firstLine="0"/></w:pPr>'));
   });
   return;
  }
  if(b.тип==='tbl'){
   out.push(таблица(b.строки));
   out.push(абзац('',НЕТ_ОТСТУПА));return;
  }
  if(b.тип==='pre'){
   b.строки.forEach(function(l){
    out.push(P(runsXml(l||' '),
     '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="284"/></w:pPr>'));
   });
   out.push(абзац('',НЕТ_ОТСТУПА));return;
  }
  if(b.тип==='ul'||b.тип==='ol'){
   b.пункты.forEach(function(p,k){
    const префикс=b.тип==='ol'?(k+1)+'. ':'— ';
    out.push(P(runsXml(префикс+p),
     '<w:pPr><w:spacing w:after="60"/><w:ind w:left="709" w:hanging="284"/><w:jc w:val="both"/></w:pPr>'));
   });return;
  }
  out.push(абзац(b.текст));
 });
 return out.join('');
}

записать();