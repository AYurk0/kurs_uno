"use strict";
/* ============================================================================
   ИЗВЛЕЧЕНИЕ ТЕКСТА ИЗ PDF С РАСШИФРОВКОЙ
   ----------------------------------------------------------------------------
   Методичка Каратаевой 2002 защищена RC4 (Standard, R 2, V 1, 40 бит) с пустым
   паролем пользователя. Расшифровка идёт по стандартному алгоритму:
     ключ документа = MD5(пароль + O + P + ID[0]), обрезанный до 5 байт;
     ключ объекта   = MD5(ключ + номер + поколение), обрезанный до 10 байт;
     поток          = RC4(ключ объекта, данные), затем inflate.

   Запуск: node _pdftext.js <файл.pdf> <выходной.txt>
   ============================================================================ */
const fs=require('fs'),zlib=require('zlib'),crypto=require('crypto');

// прокладка пароля из спецификации PDF 32000-1 (7.6.3)
const PAD=Buffer.from([
 0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,
 0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);

function md5(){
 const h=crypto.createHash('md5');
 for(let i=0;i<arguments.length;i++)h.update(arguments[i]);
 return h.digest();
}
function rc4(key,data){
 const s=Buffer.alloc(256);
 for(let i=0;i<256;i++)s[i]=i;
 let j=0;
 for(let i=0;i<256;i++){j=(j+s[i]+key[i%key.length])&255;const t=s[i];s[i]=s[j];s[j]=t;}
 const out=Buffer.alloc(data.length);
 let a=0,c=0;
 for(let i=0;i<data.length;i++){
  a=(a+1)&255;c=(c+s[a])&255;const t=s[a];s[a]=s[c];s[c]=t;
  out[i]=data[i]^s[(s[a]+s[c])&255];
 }
 return out;
}
function pdfString(b,i){
 // строка в скобках ( ... ) с escape-последовательностями
 let j=i+1;const out=[];
 while(j<b.length){
  const c=b[j];
  if(c===0x29){j++;break;}                       // ')' — конец строки
  if(c===0x5C){                                  // обратный слеш
   const n=b[j+1];
   if(n>=0x30&&n<=0x37){                         // \ddd, до трёх цифр
    let s='';let k=j+1;
    while(k<b.length&&b[k]>=0x30&&b[k]<=0x37&&s.length<3){s+=String.fromCharCode(b[k]);k++;}
    out.push(parseInt(s,8)&255);j=k;continue;
   }
const map={0x6E:10,0x72:13,0x74:9,0x62:8,0x66:12};
   out.push(map[n]!==undefined?map[n]:(n&255));j+=2;continue;
  }
  out.push(c);j++;
 }
 return Buffer.from(out);
}
const file=process.argv[2];
const buf=fs.readFileSync(file);
const lat=buf.toString('latin1');

// --- параметры шифрования ---------------------------------------------------
const encRef=/\/Encrypt (\d+) \d+ R/.exec(lat);
const encNum=encRef?parseInt(encRef[1],10):0;
const зашифрован=!!encRef;
let O,U,P,id0,id1,полный,key;
if(зашифрован){
 const encIdx=lat.indexOf(encNum+' 0 obj');
 const encEnd=lat.indexOf('endobj',encIdx);
 const encBody=buf.slice(encIdx,encEnd);
 O=pdfString(encBody,encBody.indexOf('/O')+2).slice(0,32);
 U=pdfString(encBody,encBody.indexOf('/U')+2).slice(0,32);
 P=parseInt(/\/P (-?\d+)/.exec(encBody)[1],10);
 const idM=/\/ID\[\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(lat);
 id0=Buffer.from(idM[1],'hex');
 id1=Buffer.from(idM[2],'hex');
 console.log('шифрование: O='+O.length+' U='+U.length+' P='+P+' id0='+id0.length+' id1='+id1.length);
 const pBuf=Buffer.alloc(4);pBuf.writeInt32LE(P,0);
 полный=md5(PAD.slice(0,32),O,pBuf,id0);
 key=полный.slice(0,5);
}else{
 console.log('шифрования нет');
 O=Buffer.alloc(32);U=Buffer.alloc(32);P=0;
 const idM=/\/ID\[\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(lat);
 id0=idM?Buffer.from(idM[1],'hex'):Buffer.alloc(16);
 id1=idM?Buffer.from(idM[2],'hex'):Buffer.alloc(16);
 полный=Buffer.alloc(0);key=полный;
}

function объектныйКлюч(k,num,gen){
const extra=Buffer.from([num&255,(num>>8)&255,(num>>16)&255,gen&255,(gen>>8)&255]);
 return md5(k,extra).slice(0,Math.min(k.length+5,16));
}
 // --- карты ToUnicode -------------------------------------------------------
// Сырые байты потока: для незапароленного PDF это и есть данные, для
// запароленного — зашифрованные RC4.
function raw_потока(s){
 return зашифрован?rc4(объектныйКлюч(ключРабочий,s.num,s.gen),s.raw):s.raw;
}
// В PDF с /Encoding /Identity и /Type0 шрифтовая кодировка не совпадает с
// Unicode: символы приходят как двухбайтовые индексы в глифы. Чтобы получить
// читаемый кириллический текст, нужна таблица соответствия из потока
// ToUnicode: «beginbfchar ... endbfchar» и «beginbfrange ... endbfrange».
function разобратьCMap(потоки){
 const карты=new Map();   // номер объекта -> {код: символ}
 for(const s of потоки){
  // карта может быть как сжатой, так и обычным потоком без /Filter
  let d=null;
  try{d=zlib.inflateSync(raw_потока(s));}catch(e){d=raw_потока(s);}
  const t=d.toString('latin1');
  if(t.indexOf('beginbfchar')<0&&t.indexOf('beginbfrange')<0)continue;
  const m={};
  const bc=/beginbfchar([\s\S]*?)endbfchar/g;
  let b;
  while((b=bc.exec(t))){
   const re=/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;let x;
   while((x=re.exec(b[1])))m[parseInt(x[1],16)]=кодВСимволы(x[2]);
  }
  const br=/beginbfrange([\s\S]*?)endbfrange/g;
  while((b=br.exec(t))){
   const re=/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;let x;
   while((x=re.exec(b[1]))){
    const lo=parseInt(x[1],16),hi=parseInt(x[2],16),dst=parseInt(x[3],16);
    for(let c=lo;c<=hi&&c-lo<65536;c++)m[c]=String.fromCharCode(dst+(c-lo));
   }
  }
  карты.set(s.num,m);
 }
 return карты;
}
function кодВСимволы(hex){
 // <00440041> -> «DA»
 let out='';
 for(let i=0;i+3<hex.length;i+=4)out+=String.fromCharCode(parseInt(hex.substr(i,4),16));
 return out;
}

// --- перебор вариантов ключа и извлечение страниц ---------------------------
function собратьПотоки(){
 const список=[];
 const objRe=/(\d+) (\d+) obj/g;let m;
 while((m=objRe.exec(lat))){
  const num=parseInt(m[1],10),gen=parseInt(m[2],10);
  const sIdx=lat.indexOf('stream',m.index+m[0].length);
  if(sIdx<0)continue;
  let ds=sIdx+6;
  if(lat[ds]==='\r')ds++;
  if(lat[ds]==='\n')ds++;
  const eIdx=lat.indexOf('endstream',ds);
  if(eIdx<0)continue;
  let raw=buf.slice(ds,eIdx);
  while(raw.length&&(raw[raw.length-1]===0x0a||raw[raw.length-1]===0x0d))raw=raw.slice(0,-1);
  if(raw.length)список.push({num:num,gen:gen,raw:raw});
 }
 return список;
}
const потоки=собратьПотоки();
console.log('потоков найдено: '+потоки.length);

function распаковать(ключ,s){
 // для незапароленного PDF ключ пустой — RC4 не применяется
 try{return зашифрован?zlib.inflateSync(rc4(объектныйКлюч(ключ,s.num,s.gen),s.raw))
                      :zlib.inflateSync(s.raw);}catch(e){return null;}
}
function проверить(k){
 let n=0;
 for(let i=0;i<Math.min(потоки.length,10);i++){
  if(распаковать(k,потоки[i]))n++;
 }
 return n;
}
let ключРабочий=зашифрован?null:Buffer.alloc(0);   // без шифрования RC4 не применяется
if(зашифрован){
 const кандидаты=[
  ['R2 5 байт',key],
  ['16 байт без обрезки',полный]
 ];
 let k3=полный;
 for(let i=0;i<50;i++)k3=md5(k3.slice(0,5));
 кандидаты.push(['+50 итераций',k3.slice(0,5)]);
 кандидаты.push(['со вторым ID',md5(PAD.slice(0,32),O,Buffer.from([P&255,(P>>8)&255,(P>>16)&255,(P>>24)&255]),id1).slice(0,5)]);
 for(const c of кандидаты){
  const n=проверить(c[1]);
  console.log('  '+c[0]+': распаковано '+n+'/10');
  if(n>0&&!ключРабочий){ключРабочий=c[1];break;}
 }
}
if(зашифрован&&!ключРабочий){
 console.log('ни один вариант ключа не подошёл — вероятно, пароль непустой');
 process.exit(0);
}

const карты=разобратьCMap(потоки);
console.log('карт ToUnicode найдено: '+карты.size);
// для диагностики: размеры карт и несколько ключей
for(const [n,m] of карты){
 const ks=Object.keys(m).slice(0,6).map(Number);
 console.log('  карта объекта '+n+': '+Object.keys(m).length+' кодов, примеры '+ks.join(',')
  +' -> '+ks.map(function(k){return JSON.stringify(m[k]);}).join(' '));
 if(карты.size>2)break;
}

// (отладочный блок перенесён ниже — здесь он не может обращаться к потокСтраницы)

// Объединённая карта: в документе обычно один шрифт с кириллицей, поэтому
// при конфликте кодов берём первую непустую расшифровку.
const общая={};
for(const m of карты.values()){
 for(const code of Object.keys(m)){if(общая[code]===undefined)общая[code]=m[code];}
}
function расшифровать(hex,карта){
 // В содержимом страницы шрифты переключаются оператором «/F1 12 Tf».
 // Для шрифта Identity-H коды двухбайтовые, для WinAnsi — однобайтовые,
 // поэтому карту выбирает вызывающий код по текущему шрифту.
 let out='';
 if(двухбайтный){
  for(let i=0;i+3<hex.length;i+=4){
   const code=parseInt(hex.substr(i,4),16);
   out+=(карта[code]!==undefined)?карта[code]:'';
  }
 } else {
  for(let i=0;i+1<hex.length;i+=2){
   const b=parseInt(hex.substr(i,2),16);
   out+=(карта[b]!==undefined)?карта[b]:String.fromCharCode(b);
  }
 }
 return out;
}
let двухбайтный=false;

function телоОбъекта(num){
 // содержимое объекта (без потока) — нужно, чтобы найти ссылку /Font
 const i=lat.indexOf(num+' 0 obj');
 if(i<0)return '';
 const e=lat.indexOf('endobj',i);
 return lat.slice(i,e);
}
// Шрифты живут в /Resources. Они бывают (а) прямо в объекте страницы,
// (б) в отдельном объекте, (в) в общем объекте, на который ссылается /Parent.
// Шрифты разных страниц различаются, поэтому ищем по цепочке.
function шрифтыСтраницы(numСтраницы){
 let out={};
 let num=numСтраницы;
 for(let шаг=0;шаг<4&&num;шаг++){
  const тело=телоОбъекта(num);
  if(!тело)break;
  const res=/\/Resources\s+(\d+) \d+ R/.exec(тело);
  let телоРес=тело;
  if(res)телоРес=телоОбъекта(parseInt(res[1],10));
  // В PDF между /Font и << может стоять пробел: «/Font<<» и «/Font <<»
  const rf=/\/Font\s*<<([^>]*?)>>/g;
  let fb;
  while((fb=rf.exec(телоРес))){
   const re=/\/([A-Za-z0-9#_.+-]+)\s+(\d+) \d+ R/g;let f;
   while((f=re.exec(fb[1]))){
    const numШ=parseInt(f[2],10);
    const т=телоОбъекта(numШ);
    const tu=/\/ToUnicode (\d+) \d+ R/.exec(т);
    const id=/\/Encoding\s*\/([\w-]+)/.exec(т);
    const карта=tu?карты.get(parseInt(tu[1],10)):null;
    if(!карта)continue;
    out[f[1]]={карта:карта,двухбайтный:!!(id&&/Identity/.test(id[1]))};
   }
  }
  if(Object.keys(out).length)break;
  // поднимаемся к /Parent (дерево страниц с общими ресурсами)
  const par=/\/Parent\s+(\d+) \d+ R/.exec(тело);
  if(par)num=parseInt(par[1],10);
  else if(телоРес!==тело)num=null;
  else num=null;
 }
 return out;
}

// Соответствие «номер потока содержимого -> объект страницы». Строим один раз:
const потокСтраницы=new Map();
(function найтиСтраницы(){
 const re=/(\d+) \d+ obj/g;let m;
 while((m=re.exec(lat))){
  const i=m.index+m[0].length;
  const e=lat.indexOf('endobj',i);
  if(e<0)continue;
  const cm=/\/Contents (\d+) \d+ R/.exec(lat.slice(i,e));
  if(cm&&!потокСтраницы.has(parseInt(cm[1],10)))
   потокСтраницы.set(parseInt(cm[1],10),parseInt(m[1],10));
 }
})();

let страниц=0;
const тексты=[];
for(const s of потоки){
 const d=распаковать(ключРабочий,s);
 if(!d)continue;
 const t=d.toString('latin1');
 if(t.indexOf('Tj')<0&&t.indexOf('TJ')<0)continue;
 const номерСтраницы=потокСтраницы.get(s.num);
 const шрифты=номерСтраницы?шрифтыСтраницы(номерСтраницы):{};
 страниц++;
 let карта=общая;
 // Шрифты Identity-H используют двухбайтовые коды. Признак такой карты —
 // номера кодов больше 255. Если шрифт страницы не найден, определяем режим
 // по самой карте: это надёжнее, чем молча читать пары байт по одному.
 двухбайтный=Object.keys(шрифты).length>0;
 if(Object.keys(шрифты).length){
  const первая=шрифты[Object.keys(шрифты)[0]];
  карта=первая.карта&&Object.keys(первая.карта).length?первая.карта:общая;
  двухбайтный=первая.двухбайтный;
 } else {
  двухбайтный=Object.keys(общая).some(function(k){return parseInt(k,10)>255;});
 }
 const buf2=[];
 // Строки в содержимом страницы бывают двух видов:
 //   литеральные  (4)
 //   шестнадцатеричные <023C023F>   ← именно так записан основной текст
 // поэтому учитываем оба вида.
 const rr=/\/([A-Za-z0-9#_.+-]+)\s+[\d.]+\s+Tf|(\[[^\]]*\])\s*TJ|(\((?:[^()\\]|\\.)*\))\s*Tj/g;
 let k;
 while((k=rr.exec(t))){
  if(k[1]!==undefined){                       // смена шрифта
   const ш=шрифты[k[1]];
   if(ш){карта=ш.карта&&Object.keys(ш.карта).length?ш.карта:общая;двухбайтный=ш.двухбайтный;}
   continue;
  }
  if(k[2]!==undefined){                        // массив [ ... ] TJ
   const parts=k[2].match(/<([0-9A-Fa-f]*)>|\(((?:[^()\\]|\\.)*)\)/g)||[];
   buf2.push(parts.map(function(p){
    if(p[0]==='<')return расшифровать(p.slice(1,-1),карта);
    return расшифровать(p.slice(1,-1),карта);
   }).join(''));
  } else buf2.push(расшифровать(k[3].slice(1,-1),карта));
 }
 тексты.push(buf2.join(' '));
}
console.log('страниц с текстом: '+страниц);
fs.writeFileSync(process.argv[3]||'C:/Users/anyur/AppData/Local/Temp/pdftext.txt',
 тексты.map(function(p,i){return '\n===== PAGE '+(i+1)+' =====\n'+p;}).join('\n'),'utf8');
console.log('сохранено');
