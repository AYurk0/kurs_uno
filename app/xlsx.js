"use strict";
/* ============================================================================
   ВЫГРУЗКА ГРАФИКОВ В EXCEL (.xlsx) — в браузере, без библиотек
   ----------------------------------------------------------------------------
   Лист «Вариант» — исходные данные и отсчёты x(n). Дальше по листу на каждый
   построенный график: столбцы x/y каждой серии и готовая диаграмма Excel
   (точечная с линиями; отсчёты — маркеры с «палочками» из планок погрешностей).
   Диаграммы берут оформление из СТИЛЬ_ГРАФИКОВ: цвета, пунктир, толщину,
   маркеры, сетку, легенду, шрифт и заголовок. Данные — живые: диаграмму
   можно перестроить в Excel как угодно.
   Файл .xlsx — ZIP с XML-частями OOXML; ZIP пишется без сжатия.
   ============================================================================ */
var ЛИСТЫ_EXCEL=[["cvS","Спектр"],["cvФ","Фаза спектра"],["cvX","Отсчёты"],["cvRest","Восстановление"],
 ["cvCmp","Спектр дискретный"],["cvDft","ДПФ модули"],["cvArg","ДПФ аргументы"],["cvОДПФ","Обратное ДПФ"],
 ["cvA","АЧХ"],["cvФ2","ФЧХ"],["cvG","ИХ ЦФ"],["cvY","Отклик ЦФ"],
 ["cvBC","АЧХ ФНЧ"],["cvBCф","ФЧХ ФНЧ"],["cvBCg","ИХ ФНЧ"],["cvBCy","Отклик ФНЧ"]];
var ЦВЕТА_EXCEL={c1:"1F5FBF",c2:"C62828",c3:"2E7D32",c4:"8E24AA"};

// ---------- ZIP без сжатия ----------
function zipБезСжатия(файлы){
 var T=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;T[n]=c>>>0;}
 function crc(b){var r=0xFFFFFFFF;for(var i=0;i<b.length;i++)r=T[(r^b[i])&255]^(r>>>8);return (r^0xFFFFFFFF)>>>0;}
 function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
 function u16(v){return [v&255,(v>>>8)&255];}
 var enc=new TextEncoder(),части=[],центр=[],смещ=0;
 файлы.forEach(function(f){var имя=enc.encode(f.имя),д=enc.encode(f.текст),к=crc(д);
  var лок=[].concat(u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0x21),u32(к),u32(д.length),u32(д.length),u16(имя.length),u16(0));
  части.push(new Uint8Array(лок),имя,д);
  центр.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0x21),u32(к),u32(д.length),u32(д.length),
   u16(имя.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(смещ))),имя);
  смещ+=лок.length+имя.length+д.length;});
 var размЦ=центр.reduce(function(s,b){return s+b.length;},0);
 var конец=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(файлы.length),u16(файлы.length),u32(размЦ),u32(смещ),u16(0)));
 return new Blob(части.concat(центр,[конец]),{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});}

// ---------- помощники ----------
function xe(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function колонка(i){var s="";i++;while(i>0){var r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26);}return s;}
function ячСтр(r,c,t,жирн){return '<c r="'+колонка(c)+(r+1)+'" t="inlineStr"'+(жирн?' s="1"':"")+'><is><t xml:space="preserve">'+xe(t)+'</t></is></c>';}
function ячЧис(r,c,v){return (typeof v==="number"&&isFinite(v))?'<c r="'+колонка(c)+(r+1)+'"><v>'+v+'</v></c>':"";}
function цветHex(c){if(!c)return "000000";var m=/var\(--(c\d)\)/.exec(c);if(m)return ЦВЕТА_EXCEL[m[1]]||"000000";
 return String(c).replace("#","").toUpperCase();}
function штрихExcel(d){if(!d)return "solid";var ч=String(d).split(/\s+/).map(Number);
 if(ч.length>=4)return "lgDashDot";if(ч[0]<=2)return "sysDot";if(ч[0]>=8)return "lgDash";return "dash";}
var МАРКЕР_EXCEL={круг:"circle",квадрат:"square",треугольник:"triangle",ромб:"diamond",нет:"none"};
// Лист с таблицей: строки — массивы значений (строки или числа)
function листXML(строки,сДиаграммой,ширины){
 var x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
 if(ширины)x+='<cols>'+ширины.map(function(w,i){return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>';}).join("")+'</cols>';
 x+='<sheetData>'+строки.map(function(r,i){return '<row r="'+(i+1)+'">'+r.map(function(v,j){
  return typeof v==="number"?ячЧис(i,j,v):(v==null||v===""?"":ячСтр(i,j,v,i===0));}).join("")+'</row>';}).join("")+'</sheetData>';
 if(сДиаграммой)x+='<drawing r:id="rId1"/>';
 return x+'</worksheet>';}
function текстRich(t,размер,жирн){return '<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="'+размер+'" b="'+(жирн?1:0)+'"/></a:pPr><a:r><a:rPr lang="ru-RU" sz="'+размер+'" b="'+(жирн?1:0)+'"/><a:t>'+xe(t)+'</a:t></a:r></a:p></c:rich></c:tx>';}

// ---------- диаграмма одного графика ----------
function диаграммаXML(лист,г,серииКолонки,С){
 var ref=function(c,r1,r2){return "'"+лист.replace(/'/g,"''")+"'!$"+колонка(c)+"$"+(r1+1)+":$"+колонка(c)+"$"+(r2+1);};
 var ш=Math.round(С.линия*0.75*12700),кегль=Math.round(10*С.кегль)*100;
 var x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
 x+='<c:date1904 val="0"/><c:lang val="ru-RU"/><c:roundedCorners val="0"/><c:style val="2"/><c:chart>';
 if(С.заголовок)x+='<c:title>'+текстRich(г.title,Math.round(кегль*1.2),true)+'<c:overlay val="0"/></c:title>';
 x+='<c:autoTitleDeleted val="'+(С.заголовок?0:1)+'"/><c:plotArea><c:layout/><c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>';
 серииКолонки.forEach(function(sk,j){var se=sk.серия,цв=sk.метка?"2E7D32":цветHex(С.цвета[j%С.цвета.length]);
  var пунктир=sk.метка?"dash":штрихExcel((С.штрихи&&С.штрихи[j%С.штрихи.length])||(se.dash?"6 4":""));
  // имя серии с кэшем — легенда видна сразу, даже до пересчёта книги
  x+='<c:ser><c:idx val="'+j+'"/><c:order val="'+j+'"/><c:tx><c:strRef><c:f>'+xe(ref(sk.y,0,0))+'</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>'+xe(sk.имя)+'</c:v></c:pt></c:strCache></c:strRef></c:tx>';
  var стем=se.type==="stem",симв=МАРКЕР_EXCEL[С.маркер]||"circle";
  if(стем){
   if(С.отсчёты==="ступеньки")x+='<c:spPr><a:ln w="'+ш+'"><a:solidFill><a:srgbClr val="'+цв+'"/></a:solidFill></a:ln></c:spPr><c:marker><c:symbol val="none"/></c:marker>';
   else x+='<c:spPr><a:ln><a:noFill/></a:ln></c:spPr><c:marker><c:symbol val="'+(симв==="none"?"circle":симв)+'"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="'+цв+'"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="'+цв+'"/></a:solidFill></a:ln></c:spPr></c:marker>';
   if(С.отсчёты==="палочки")x+='<c:errBars><c:errDir val="y"/><c:errBarType val="minus"/><c:errValType val="percentage"/><c:noEndCap val="1"/><c:val val="100"/><c:spPr><a:ln w="'+Math.round(ш*0.8)+'"><a:solidFill><a:srgbClr val="'+цв+'"/></a:solidFill></a:ln></c:spPr></c:errBars>';}
  else{x+='<c:spPr><a:ln w="'+(sk.метка?12700:ш)+'" cap="rnd"><a:solidFill><a:srgbClr val="'+цв+'"/></a:solidFill><a:prstDash val="'+пунктир+'"/><a:round/></a:ln></c:spPr>';
   if(se.dots&&симв!=="none")x+='<c:marker><c:symbol val="'+симв+'"/><c:size val="4"/><c:spPr><a:solidFill><a:srgbClr val="'+цв+'"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:marker>';
   else x+='<c:marker><c:symbol val="none"/></c:marker>';}
  x+='<c:xVal><c:numRef><c:f>'+xe(ref(sk.x,1,sk.n))+'</c:f></c:numRef></c:xVal><c:yVal><c:numRef><c:f>'+xe(ref(sk.y,1,sk.n))+'</c:f></c:numRef></c:yVal><c:smooth val="0"/></c:ser>';});
 x+='<c:axId val="101"/><c:axId val="102"/></c:scatterChart>';
 var сетка=С.сетка==="нет"?"":'<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill>'+(С.сетка==="пунктир"?'<a:prstDash val="sysDot"/>':"")+'</a:ln></c:spPr></c:majorGridlines>';
 function ось(id,поз,крест,подпись,мин,макс){
  return '<c:valAx><c:axId val="'+id+'"/><c:scaling><c:orientation val="minMax"/>'+(макс!=null?'<c:max val="'+макс+'"/>':"")+(мин!=null?'<c:min val="'+мин+'"/>':"")+'</c:scaling>'+
   '<c:delete val="0"/><c:axPos val="'+поз+'"/>'+сетка+(подпись?'<c:title>'+текстRich(подпись,кегль,false)+'<c:overlay val="0"/></c:title>':"")+
   '<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>'+
   '<c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="595959"/></a:solidFill></a:ln></c:spPr>'+
   '<c:crossAx val="'+крест+'"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/></c:valAx>';}
 var xs=[];г.series.forEach(function(se){xs=xs.concat(se.x);});
 x+=ось(101,"b",102,г.xlabel,Math.min.apply(null,xs),Math.max.apply(null,xs))+ось(102,"l",101,г.ylabel,null,null);
 x+='<c:spPr>'+(С.рамка?'<a:ln w="9525"><a:solidFill><a:srgbClr val="595959"/></a:solidFill></a:ln>':'<a:ln><a:noFill/></a:ln>')+'</c:spPr></c:plotArea>';
 // вспомогательные линии (ωв, уровни) на экране подписаны прямо у линии, в Excel их объясняет легенда
 if(С.легенда!=="нет")x+='<c:legend><c:legendPos val="'+(С.легенда==="справа"?"r":С.легенда==="внутри"?"tr":"b")+'"/><c:overlay val="'+(С.легенда==="внутри"?1:0)+'"/></c:legend>';
 x+='<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>';
 x+='<c:spPr>'+(С.фон?'<a:solidFill><a:srgbClr val="'+цветHex(С.фон)+'"/></a:solidFill>':'<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>')+'</c:spPr>';
 x+='<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="'+кегль+'">'+(С.шрифт?'<a:latin typeface="'+xe(С.шрифт)+'"/><a:cs typeface="'+xe(С.шрифт)+'"/>':"")+'</a:defRPr></a:pPr><a:endParaRPr lang="ru-RU"/></a:p></c:txPr>';
 return x+'</c:chartSpace>';}
function рисунокXML(колонкаС,строк){
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">'+
  '<xdr:twoCellAnchor><xdr:from><xdr:col>'+колонкаС+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'+
  '<xdr:to><xdr:col>'+(колонкаС+10)+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+(1+строк)+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'+
  '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Диаграмма 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>'+
  '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>';}

// ---------- сборка книги ----------
function собратьXlsx(){
 var С=стильГрафиков(),вар=+document.getElementById("vNom").value,гр=+document.getElementById("vGrp").value;
 var файлы=[],листы=[],CT=[];
 // лист «Вариант»
 var q=парамСиг(),стр=[["Параметр","Значение","Единицы"],
  ["Вариант",вар,""],["Группа",гр,""],["Шифр",String(P.N1)+P.N2+" "+P.N3N4+" "+P.тип,""],
  ["E",P.E,"В"],["t1",P.t1*1e6,"мкс"],["t2",q.t2*1e6,"мкс"],["Tc",q.Tc*1e6,"мкс"],
  ["max|S(ω)|",R1.M*1e6,"В·мкс"],["ωв",R1.wв/1e6,"Мрад/с"],["Tд",R1.Tд*1e6,"мкс"],["ωд",R1.wд/1e6,"Мрад/с"],["N",R1.x.length,""],
  ["",null,""],["n","t = nTд, мкс","x(n), В","|Ck|","arg Ck, °"]];
 R1.x.forEach(function(v,n){var ck=R1.Ck[n];стр.push([n,n*R1.Tд*1e6,v,ck?cAbs(ck):null,ck&&cAbs(ck)>1e-9?cArg(ck)*180/Math.PI:(ck?0:null)]);});
 листы.push({имя:"Вариант",xml:листXML(стр,false,[18,16,12,12,12])});
 // листы графиков
 ЛИСТЫ_EXCEL.forEach(function(пара){var г=ДАННЫЕ_ГРАФИКОВ[пара[0]];if(!г)return;
  var el=document.getElementById(пара[0]);if(!el||!el.querySelector("svg"))return;   // раздел другой буквы очищен
  var колонки=[],таблица=[],серии=[],кол=0,ymin=Infinity,ymax=-Infinity;
  г.series.forEach(function(se){se.y.forEach(function(v){if(isFinite(v)){ymin=Math.min(ymin,v);ymax=Math.max(ymax,v);}});});
  if(г.series.some(function(se){return se.type==="stem";}))ymin=Math.min(ymin,0);
  var все=г.series.map(function(se){return {серия:se,имя:se.label||г.title};});
  (г.marks||[]).forEach(function(k){все.push({серия:{label:k.label,x:[k.x,k.x],y:[ymin,ymax],type:"line"},имя:k.label||"метка",метка:true});});
  (г.hmarks||[]).forEach(function(k){var xs=[];г.series.forEach(function(se){xs=xs.concat(se.x);});
   все.push({серия:{label:k.label,x:[Math.min.apply(null,xs),Math.max.apply(null,xs)],y:[k.y,k.y],type:"line"},имя:k.label||"уровень",метка:true});});
  // отсчёты «ступеньками»: каждая точка тянется горизонтально до следующей
  if(С.отсчёты==="ступеньки")все.forEach(function(с){var se=с.серия;if(se.type!=="stem"||с.метка)return;
   var X=[],Y=[],шаг=se.x.length>1?se.x[1]-se.x[0]:1;
   for(var i=0;i<se.x.length;i++){X.push(se.x[i],i+1<se.x.length?se.x[i+1]:se.x[i]+шаг);Y.push(se.y[i],se.y[i]);}
   с.серия={label:se.label,x:X,y:Y,type:"stem"};});
  все.forEach(function(с){var se=с.серия;
   колонки.push({x:кол,y:кол+1,n:se.x.length,серия:se,метка:с.метка,имя:с.имя});
   for(var i=0;i<=se.x.length;i++){if(!таблица[i])таблица[i]=[];}
   таблица[0][кол]=г.xlabel||"x";таблица[0][кол+1]=с.имя;
   for(var i2=0;i2<se.x.length;i2++){таблица[i2+1][кол]=se.x[i2];таблица[i2+1][кол+1]=se.y[i2];}
   кол+=2;});
  var имя=пара[1];
  листы.push({имя:имя,xml:листXML(таблица,true,null),диаграмма:диаграммаXML(имя,г,колонки,С),рисунок:рисунокXML(кол+1,22)});});
 // части пакета
 var wbRels=[],wbSheets=[];
 листы.forEach(function(л,i){var n=i+1;
  файлы.push({имя:"xl/worksheets/sheet"+n+".xml",текст:л.xml});
  CT.push('<Override PartName="/xl/worksheets/sheet'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
  wbSheets.push('<sheet name="'+xe(л.имя)+'" sheetId="'+n+'" r:id="rId'+n+'"/>');
  wbRels.push('<Relationship Id="rId'+n+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+n+'.xml"/>');
  if(л.диаграмма){
   файлы.push({имя:"xl/worksheets/_rels/sheet"+n+".xml.rels",текст:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing'+n+'.xml"/></Relationships>'});
   файлы.push({имя:"xl/drawings/drawing"+n+".xml",текст:л.рисунок});
   файлы.push({имя:"xl/drawings/_rels/drawing"+n+".xml.rels",текст:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart'+n+'.xml"/></Relationships>'});
   файлы.push({имя:"xl/charts/chart"+n+".xml",текст:л.диаграмма});
   CT.push('<Override PartName="/xl/drawings/drawing'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>');
   CT.push('<Override PartName="/xl/charts/chart'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>');}});
 var nS=листы.length+1;
 wbRels.push('<Relationship Id="rId'+nS+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>');
 файлы.push({имя:"[Content_Types].xml",текст:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+CT.join("")+'</Types>'});
 файлы.push({имя:"_rels/.rels",текст:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});
 файлы.push({имя:"xl/workbook.xml",текст:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+wbSheets.join("")+'</sheets></workbook>'});
 файлы.push({имя:"xl/_rels/workbook.xml.rels",текст:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+wbRels.join("")+'</Relationships>'});
 файлы.push({имя:"xl/styles.xml",текст:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'});
 return {blob:zipБезСжатия(файлы),имя:"Графики_Вариант"+вар+"_группа"+гр+".xlsx",листов:листы.length,файлы:файлы};}
function экспортExcel(){
 try{решитьВсё();var к=собратьXlsx(),a=document.createElement("a");
  a.href=URL.createObjectURL(к.blob);a.download=к.имя;document.body.appendChild(a);a.click();a.remove();
  return {имя:к.имя,листов:к.листов};}
 catch(e){console.error(e);alert("Ошибка выгрузки в Excel: "+e.message);throw e;}}
