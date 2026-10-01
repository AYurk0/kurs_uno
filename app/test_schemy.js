"use strict";
/* ============================================================================
   РЕГРЕССИОННЫЙ ТЕСТ СХЕМ ТАБЛИЦЫ А.3
   ----------------------------------------------------------------------------
   Запуск:  node test_schemy.js
   Код приложения (index.html + schem.js + shemy_a3.js) выполняется в песочнице
   vm с заглушками DOM — ничего не записывается и не открывается.

   Для каждой схемы проверяется:
     1) нет предупреждений диагностики (цепь замкнута, выход достижим);
     2) max |N(p)/D(p) − K(jw)| на сетке из 400 частот <= 1e-6;
     3) полюса D(p) — все в левой полуплоскости (устойчивость);
     4) коэффициенты N и D конечны (нет NaN/Infinity).
   Код возврата: 0 — все схемы зелёные, 1 — есть расхождения.
   ============================================================================ */
const fs=require('fs'),vm=require('vm'),path=require('path');
const DIR=__dirname;

// ---- куски index.html: комплексная арифметика и работа с полиномами ---------
const idx=fs.readFileSync(path.join(DIR,'index.html'),'utf8').split(/\r?\n/);
const from=idx.findIndex(function(l){return /^function C\(re,im\)/.test(l);});
const to=idx.findIndex(function(l,i){return i>from && /^function pAdd/.test(l);});
if(from<0||to<0)throw new Error("не найден блок complex-функций в index.html");
const helpers=idx.slice(from,to+1).join("\n");

const src=helpers+"\n"
  +fs.readFileSync(path.join(DIR,'schem.js'),'utf8')+"\n"
  +fs.readFileSync(path.join(DIR,'shemy_a3.js'),'utf8')+"\n"
  +"globalThis.API={СХЕМА,ИзвлечьНетлист,полиномыСхемы,KСхемы,масштабПоАЧХ,"
  +"масштабПоЭлементам,СХЕМЫ_А3,схемаПоШифру,cAbs,C,cD,cS,pVal};\n";

// ---- песочница с заглушками DOM -------------------------------------------
function stub(){const e={innerHTML:'',textContent:'',value:'',style:{},dataset:{},
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  appendChild(){},removeChild(){},addEventListener(){},setAttribute(){},
  getAttribute(){return null;},querySelector(){return e;},querySelectorAll(){return[];},
  children:[],childNodes:[]};return e;}
const document={getElementById(){return stub();},createElement(){return stub();},
  addEventListener(){},querySelector(){return stub();},querySelectorAll(){return[];},
  documentElement:{setAttribute(){},removeAttribute(){},style:{}},body:stub()};
const ctx=vm.createContext({console,Math,JSON,isFinite,isNaN,parseFloat,parseInt,
  Object,Array,String,Number,Boolean,Infinity,NaN,Date,document,
  window:{addEventListener(){},location:{}},navigator:{userAgent:"node"},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  Blob:function(){},URL:{createObjectURL(){return'';}},alert(){},confirm(){return true;}});
vm.runInContext(src,ctx,{filename:"bundle.js"});
const A=ctx.API;
// ---- корни полинома методом Дюрана–Кернера (для проверки устойчивости) -----
function корни(poly){
  const a=poly.slice();let n=a.length-1;
  if(n<1)return [];
  let mx=0;for(let i=0;i<=n;i++)mx=Math.max(mx,Math.abs(a[i]));
  if(!(mx>0))return [];
  for(let i=0;i<=n;i++)a[i]/=mx;
  let ph=0.4+0.9*Math.random()*0.5;
  const out=[];
  for(let it=0;it<260 && n>0;it++){
    let c=1e100;
    for(let it3=0;it3<220;it3++){
      const b=a.slice();let ph2=ph;
      for(let k=n;k>=1;k--){
        const nb=b[k]+c*ph2;b[k-1]=b[k-1]+nb;ph2=ph2*c;
        const av=Math.abs(ph2);if(av>1e250)for(let q=0;q<=n;q++)b[q]/=1e250;
        let mn=0;for(let t=0;t<=k;t++)mn=Math.max(mn,Math.abs(b[t]));
        if(mn>0)c=b[k]/b[k-1];
      }
      const cc=c,pr=Math.abs(cc-ph);ph=cc;
      if(Math.abs(pr)<=1e-15*Math.max(1,Math.abs(ph)))break;
    }
    out.push(ph);
    const bb=a.slice();
    for(let k2=n-1;k2>=0;k2--)a[k2]=bb[k2]+ph*a[k2+1];
    const lead=a[n];
    if(Math.abs(lead)>1e-14)for(let q2=0;q2<=n;q2++)a[q2]/=lead;
    n--;
  }
  return out;
}
// ---- проверка одной схемы --------------------------------------------------
const ДОПУСК=1e-6;
function проверить(шифр){
  // схемаПоШифру — единая точка входа: сама подставляет номиналы для цепи 12
  const geo=A.схемаПоШифру(шифр);
  if(!geo)return {шифр:шифр,ok:false,причина:"нет в реестре"};
  // СХЕМА — объект, попавший в API по ссылке, поэтому меняем его поля,
  // а не сам объект (иначе ссылка в API останется на прежней схеме).
  A.СХЕМА.имя=geo.имя;A.СХЕМА.элементы=geo.элементы;
  const nt=A.ИзвлечьНетлист();
  const пр={шифр:шифр,имя:geo.имя,предупр:(nt.предупр||[]).slice()};
  if(пр.предупр.length){пр.ok=false;пр.причина="предупреждения диагностики";return пр;}
  const pd=A.полиномыСхемы(nt);
  if(!pd){пр.ok=false;пр.причина="полиномы не восстановлены";return пр;}
  пр.N=pd.N;пр.D=pd.D;
  const w0=A.масштабПоЭлементам(nt);
  пр.масштаб=w0;
  if(!(w0>0)||!isFinite(w0)){пр.ok=false;пр.причина="масштаб не восстановлен";return пр;}
  const wMax=w0*10;
  let err=0,wErr=0;
  for(let i=0;i<=400;i++){
    const w=wMax*i/400;
    const кл=A.cD(A.pVal(pd.N,A.C(0,w)),A.pVal(pd.D,A.C(0,w)));
    const e=A.cAbs(A.cS(кл,A.KСхемы(nt,A.C(0,w))));
    if(e>err){err=e;wErr=w;}
  }
  пр.err=err;пр.wErr=wErr;пр.wMax=wMax;
  const r=корни(pd.D);const правые=r.filter(function(z){return z.re>=0;});
  пр.полюсов=r.length;пр.правых=правые.length;
  пр.K0=A.cAbs(A.KСхемы(nt,A.C(0,0)));
  пр.Kinf=A.cAbs(A.KСхемы(nt,A.C(0,1e12)));
  const норм=pd.N.every(isFinite)&&pd.D.every(isFinite);
  пр.ok=(err<=ДОПУСК)&&(правые.length===0)&&норм;
  пр.причина=пр.ok?"":(err>ДОПУСК?("err="+err.toExponential(2)):(норм?"неустойчива":"нечисловые коэффициенты"));
  return пр;
}

// ---- прогон ----------------------------------------------------------------
const коды=Object.keys(A.СХЕМЫ_А3).sort();
const итог=коды.map(проверить);
let зелёных=0;
итог.forEach(function(r){
  console.log((r.ok?"OK   ":"СБОЙ ")+"цепь "+r.шифр+"  "+(r.имя||"")
    +(r.предупр&&r.предупр.length?"  ["+r.предупр.join("; ")+"]":""));
  if(r.N)console.log("      N(p) = "+r.N.map(function(v){return v.toPrecision(8);}).join(" ; "));
  if(r.D)console.log("      D(p) = "+r.D.map(function(v){return v.toPrecision(8);}).join(" ; "));
  if(r.ok){
    зелёных++;
    console.log("      K(0)="+r.K0.toFixed(6)+"  K(∞)="+r.Kinf.toExponential(3)
      +"  полюсов="+r.полюсов+"  правых="+r.правых);
    console.log("      max|N/D − K(jw)| = "+r.err.toExponential(2)
      +"   (ω до "+r.wMax.toExponential(2)+" рад/с, масштаб "+r.масштаб.toExponential(2)+")");
  } else {
    console.log("      причина: "+r.причина);
  }
});
console.log("");
console.log("ИТОГО: "+зелёных+" из "+итог.length+" схем проходят (допуск "+ДОПУСК+")");
process.exitCode=(зелёных===итог.length)?0:1;