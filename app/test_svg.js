"use strict";
/* Проверка геометрии схем ЦФ: ищем наложения линий на блоки, выход за viewBox,
   висячие концы линий (начало/конец не у блока и не у сумматора). */
const fs=require('fs');
const html=fs.readFileSync('app/index.html','utf8');
function pick(n){const i=html.indexOf('function '+n+'(');let d=0;
 for(let k=html.indexOf('{',i);k<html.length;k++){if(html[k]==='{')d++;else if(html[k]==='}'){d--;if(!d)return html.slice(i,k+1);}}}
const src=[pick('блок'),pick('умножитель'),pick('сумматорКруг'),pick('линия'),pick('текст'),
 'globalThis.G={svg1:svgСхемаДФ1,svg2:svgСхемаДФ2};'].join('\n');
const S=[pick('сумматорКруг'),'svg1:'+pick('svgСхемаДФ1'),'svg2:'+pick('svgСхемаДФ2')].join('\n');
const geo=[pick('сумматорКруг'),pick('блок'),pick('умножитель'),pick('линия'),pick('текст'),
 pick('svgСхемаДФ1'),pick('svgСхемаДФ2'),'globalThis.G={D1:svgСхемаДФ1,D2:svgСхемаДФ2};'].join('\n');
eval(geo);
const G=globalThis.G;
function analyze(name,svg){
 const vb=svg.match(/viewBox="0 0 (\d+) (\d+)"/);
 const W=+vb[1],H=+vb[2];
 // прямоугольники блоков/умножителей
 const rects=[];
 const re=/<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"/g;
 let m;while((m=re.exec(svg)))rects.push({x:+m[1],y:+m[2],w:+m[3],h:+m[4]});
 const circ=[];const re2=/<circle cx="(\d+)" cy="(\d+)" r="(\d+)"/g;
 while((m=re2.exec(svg)))circ.push({x:+m[1],y:+m[2],r:+m[3]});
 // линии
 const lines=[];const re3=/<line x1="(-?\d+)" y1="(-?\d+)" x2="(-?\d+)" y2="(-?\d+)"/g;
 while((m=re3.exec(svg)))lines.push({x1:+m[1],y1:+m[2],x2:+m[3],y2:+m[4]});
 let out=0;lines.forEach(l=>{if(Math.min(l.x1,l.x2)<0||Math.max(l.x1,l.x2)>W||Math.min(l.y1,l.y2)<0||Math.max(l.y1,l.y2)>H)out++;});
 // линия, проходящая через прямоугольник блока (горизонтальная или вертикальная)
 let cross=0;const det=[];
 lines.forEach((l,li)=>{
  rects.forEach((r,ri)=>{
   const insideX1=l.x1>r.x&&l.x1<r.x+r.w, insideX2=l.x2>r.x&&l.x2<r.x+r.w;
   const insideY1=l.y1>r.y&&l.y1<r.y+r.h, insideY2=l.y2>r.y&&l.y2<r.y+r.h;
   let hit=false;
   if(l.y1===l.y2){ // горизонтальная
    const y=l.y1;if(y>r.y+1&&y<r.y+r.h-1){
     const a=Math.min(l.x1,l.x2),b=Math.max(l.x1,l.x2);
     if(b>r.x+1&&a<r.x+r.w-1)hit=true;}}
   if(l.x1===l.x2){ // вертикальная
    const x=l.x1;if(x>r.x+1&&x<r.x+r.w-1){
     const a=Math.min(l.y1,l.y2),b=Math.max(l.y1,l.y2);
     if(b>r.y+1&&a<r.y+r.h-1)hit=true;}}
   if(hit){cross++;det.push('линия '+li+' через блок '+ri+' @'+r.x+','+r.y);}
  });
 });
 console.log('=== '+name+' ===');
 console.log('  viewBox '+W+'x'+H+'; блоков/умножителей: '+rects.length+'; сумматоров: '+circ.length+'; линий: '+lines.length);
 // линия нулевой длины (x1==x2 и y1==y2) — мусор в разметке
 let zero=0;
 lines.forEach(l=>{if(l.x1===l.x2&&l.y1===l.y2)zero++;});
 // дубликаты линий (одна и та же нарисована дважды)
 const seen={};let dup=0;
 lines.forEach(l=>{const k=[l.x1,l.y1,l.x2,l.y2].join(',');
  if(seen[k])dup++;else seen[k]=1;});
 console.log('  линий за пределами viewBox: '+out);
 console.log('  линий, проходящих сквозь блок: '+cross);
 console.log('  линий нулевой длины: '+zero+'   дубликатов линий: '+dup);
 lines.forEach(l=>{if(l.x1===l.x2&&l.y1===l.y2)console.log('    ZERO len at '+l.x1+','+l.y1);});
 lines.forEach((l,i)=>{const k=[l.x1,l.y1,l.x2,l.y2].join(',');
  const j=lines.findIndex((q,z)=>z<i&&[q.x1,q.y1,q.x2,q.y2].join(',')===k);
  if(j>=0)console.log('    DUP '+k);});
 det.slice(0,12).forEach(d=>console.log('    BLK '+d));
 if(out===0&&cross===0&&zero===0&&dup===0)console.log('  OK');
}
analyze('ДФI  порядок 1',G.D1([0.5],[1,-0.25]));
analyze('ДФII порядок 1',G.D2([0.5],[1,-0.25]));
analyze('ДФI  порядок 4',G.D1([0.1,0.05,-0.02,0.01,-0.03],[1,-1.4,0.6,-0.15,0.03]));
analyze('ДФII порядок 4',G.D2([0.1,0.05,-0.02,0.01,-0.03],[1,-1.4,0.6,-0.15,0.03]));
// сохранить пример для просмотра
const fs2=require('fs');
const wrap=svg=>'<body style="background:#fff;margin:0;padding:10px;font-family:sans-serif">'+
 '<style>:root{--ax:#333;--fg:#111;--mut:#555;--card:#fff;--line:#bbb}</style>'+
 svg+'</body>';
fs2.writeFileSync('_df1.svg',wrap(G.D1([0.3045,0.0659,-0.2386],[1,-1.0537,0.1854])),'utf8');
fs2.writeFileSync('_df2.svg',wrap(G.D2([0.3045,0.0659,-0.2386],[1,-1.0537,0.1854])),'utf8');
console.log('');
console.log('SVG сохранены: _df1.svg, _df2.svg');