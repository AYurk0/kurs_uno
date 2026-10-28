"use strict";
/* ============================================================================
   НЕЗАВИСИМАЯ ПРОВЕРКА РЕШАТЕЛЯ: варианты 1–10, группа 1
   ----------------------------------------------------------------------------
   Запуск:  node test_varianty.js            (из каталога app)
   Код приложения (index.html + schem.js + shemy_a3.js) выполняется в песочнице
   vm с заглушками DOM. Каждый вариант решается так же, как кнопкой «Решить всё»,
   а результат сверяется с расчётом, написанным здесь ЗАНОВО по методичке:
     • сигналы — по рисунку табл. А.2 (с. 48), спектр — по точной формуле
       отрезка, сверенной с методом Симпсона;
     • ωв — последнее пересечение 0,1·max на окне до 400/t1, хвост проверен;
     • отсчёты — все nTд < Tc (В.1.2), ДПФ — от той же последовательности;
     • цепи 11, 41, 12, 42 — по рисунку табл. А.3 (с. 49), K(p) собрана из
       импедансов вручную, без узлового анализа приложения;
     • Б/Ч — порядок и проверки по В.5 (α на 2ωЦ1, β на 0…0,8ωЦ1 или 0…ωЦ1).
   Код возврата: 0 — всё сошлось, 1 — есть расхождения.
   ============================================================================ */
const fs=require('fs'),vm=require('vm'),path=require('path');
const DIR=__dirname,PI=Math.PI;

// ---------------- песочница с кодом приложения ----------------
function загрузить(){
 const html=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
 const main=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const умолч={vNom:"7",vGrp:"1",inE:"1",inT1:"1",inTd:"0",inN:"0",inR1:"1",inR2:"1",inL1:"1",inL2:"1",inX:"",inA:"",inB:"",inТип:"А"};
 const els={};
 function эл(id){return {id,value:умолч[id]!==undefined?умолч[id]:"",textContent:"",innerHTML:"",checked:false,style:{},
  appendChild(){},addEventListener(){},removeAttribute(){},setAttribute(){},querySelector(){return эл("_");},
  querySelectorAll(){return [];},getBoundingClientRect(){return {left:0,top:0,width:640,height:300};},
  classList:{add(){},remove(){},toggle(){}}};}
 const document={getElementById(id){return els[id]||(els[id]=эл(id));},createElement(){return эл("_");},
  createElementNS(){return эл("_");},documentElement:эл("_"),querySelectorAll(){return [];},querySelector(){return null;},
  addEventListener(){},body:эл("_")};
 const ctx={document,console,Math,alert(){},localStorage:{getItem(){return null;},setItem(){}},
  URL:{createObjectURL(){return "";}},Blob:function(){},TextEncoder,setTimeout,Image:function(){}};
 ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
 vm.runInContext(main,ctx,{filename:"index.html"});
 vm.runInContext(fs.readFileSync(path.join(DIR,'schem.js'),'utf8'),ctx,{filename:"schem.js"});
 vm.runInContext(fs.readFileSync(path.join(DIR,'shemy_a3.js'),'utf8'),ctx,{filename:"shemy_a3.js"});
 return ctx;}

// ---------------- свои комплексные числа ----------------
const c=(re,im=0)=>({re,im}),add=(a,b)=>c(a.re+b.re,a.im+b.im),sub=(a,b)=>c(a.re-b.re,a.im-b.im),
 mul=(a,b)=>c(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re),
 div=(a,b)=>{const d=b.re*b.re+b.im*b.im;return c((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d);},
 abs=a=>Math.hypot(a.re,a.im),inv=a=>div(c(1),a),par=(a,b)=>div(mul(a,b),add(a,b)),expj=t=>c(Math.cos(t),Math.sin(t));

// ---------------- сигналы табл. А.2 ----------------
const N2T={1:[2,3],2:[1.75,3.5],3:[1.5,3],4:[1.25,2.25],5:[2,4],6:[1.75,3],7:[1.5,2.5],8:[1.25,2.5],9:[2,4]};
function сигнал(N1,N2,E,t1){const t2=N2T[N2][0]*t1,Tc=N2T[N2][1]*t1,t12=t1+t2;
 const P={1:[[0,t1,E,E],[t1,t2,-E,-E]],2:[[0,t1,E,E],[t2,t12,E,E]],3:[[0,t1,E,E],[t2,t12,-E,-E]],
  4:[[0,t1,0,E],[t1,t2,E,E],[t2,t12,E,0]],5:[[0,t1,0,E],[t1,t2,-E,0]],6:[[0,t1,E,0],[t1,t2,E,0]],
  7:[[0,t1,0,E],[t1,t2,E,E]],8:[[0,t1,E,E],[t1,t2,-E,0]],9:[[0,t1,E,-E],[t1,t2,-E,-E]]}[N1]
  .map(([a,b,va,vb])=>[a,Math.min(b,Tc),va,vb]).filter(s=>s[1]>s[0]);
 const s=t=>{for(const [a,b,va,vb] of P)if(t>=a&&t<b)return va+(vb-va)*(t-a)/(b-a);return 0;};
 // ∫(A+Bt)e^{-jωt}dt = e^{-jωt}[(A+Bt)/(-jω) + B/ω²]
 const S=w=>{if(Math.abs(w)<1e-6){let a0=0;for(const [a,b,va,vb] of P)a0+=(b-a)*(va+vb)/2;return c(a0);}
  let r=c(0);for(const [a,b,va,vb] of P){const B=(vb-va)/(b-a),A=va-B*a;
   const F=t=>mul(expj(-w*t),add(div(c(A+B*t),c(0,-w)),c(B/(w*w))));r=add(r,sub(F(b),F(a)));}return r;};
 const Sсимп=w=>{let r=c(0);for(const [a,b,va,vb] of P){const M=2000,h=(b-a)/M;let acc=c(0);
  for(let k=0;k<=M;k++){const t=a+k*h,v=va+(vb-va)*k/M,q=(k===0||k===M)?1:(k%2?4:2);acc=add(acc,mul(c(v*q),expj(-w*t)));}
  r=add(r,c(acc.re*h/3,acc.im*h/3));}return r;};
 return {Tc,s,S,Sсимп};}
function верхняяЧастота(sig,t1){const W=400/t1,NG=200000,v=new Float64Array(NG+1);let M=0;
 for(let i=0;i<=NG;i++){v[i]=abs(sig.S(W*i/NG));if(v[i]>M)M=v[i];}
 const thr=0.1*M;let last=-1;for(let i=1;i<=NG;i++)if(v[i-1]>=thr&&v[i]<thr)last=i;
 let lo=W*(last-1)/NG,hi=W*last/NG;for(let k=0;k<60;k++){const m=(lo+hi)/2;abs(sig.S(m))>=thr?lo=m:hi=m;}
 let хвост=0;for(let i=last+1;i<=NG;i++)хвост=Math.max(хвост,v[i]);
 return {wv:(lo+hi)/2,M,хвостОк:хвост<thr};}
function лепесток(sig,t1){const dw=0.0005/t1,v=[];for(let i=0;i<=80000;i++)v.push(abs(sig.S(i*dw)));
 let im=0;for(let i=1;i<v.length;i++)if(v[i]>v[im])im=i;
 for(let i=Math.max(im,1);i<v.length-1;i++)if(v[i]<=v[i-1]&&v[i]<=v[i+1])return i*dw;return NaN;}

// ---------------- цепи табл. А.3 (R=1 кОм, L=1 мГн, C=1 нФ) ----------------
const Rv=1e3,Lv=1e-3,Cv=1e-9,ZR=()=>c(Rv),ZL=p=>mul(p,c(Lv)),ZC=p=>inv(mul(p,c(Cv)));
const ЦЕПИ={
 11:p=>{const z1=par(ZR(),ZC(p)),zc2=ZC(p);return div(zc2,add(add(z1,zc2),ZR()));}, // (R1‖C1) → C2 (выход), R2 в обратном проводе
 41:p=>{const zp=par(ZR(),ZL(p));return div(zp,add(add(ZL(p),zp),ZR()));},          // L1 → (R1‖L2) (выход), R2 в обратном проводе
 12:p=>{const zs=add(ZR(),par(ZR(),ZL(p)));return div(zs,add(ZL(p),zs));},           // L1; шунт R1 + (R2‖L2)
 42:p=>{const zs=add(ZL(p),par(ZR(),ZR()));return div(zs,add(ZL(p),zs));}};          // L1; шунт L2 + (R1‖R2)

// ---------------- прогон ----------------
const ctx=загрузить();let ошибок=0;
function проверка(усл,текст){if(!усл){ошибок++;console.log("   ✗ "+текст);}else console.log("   ✓ "+текст);}
const fx=(v,d=4)=>Math.abs(v)>=1e4||(Math.abs(v)<1e-3&&v!==0)?v.toExponential(3):v.toFixed(d);
for(let n=1;n<=10;n++){
 const doc=ctx.document;
 doc.getElementById("vNom").value=String(n);doc.getElementById("vGrp").value="1";
 for(const k of ["inR1","inR2","inL1","inL2"])doc.getElementById(k).value="1";
 ctx.СХЕМА_ПРИМЕНИТЬ=false;ctx.СХЕМА_РЕЗУЛЬТАТ=null;
 let err=null;try{ctx.применитьВариант();}catch(e){err=e.stack;}
 const R1=ctx.R1,P=ctx.P,t1=1e-6,шифр=String(ctx.TAB_A1[n][0]),N3N4=ctx.TAB_A1[n][1];
 console.log("Вариант "+n+": шифр "+шифр+" "+N3N4+" "+P.тип);
 проверка(!err,"расчёт без исключений"+(err?": "+err:""));if(err)continue;
 const sig=сигнал(+шифр[0],+шифр[1],1,t1),uf=верхняяЧастота(sig,t1);
 let eS=0;for(let w=1e5;w<2e7;w+=7e5)eS=Math.max(eS,abs(sub(sig.S(w),sig.Sсимп(w))));
 проверка(eS/uf.M<1e-6,"эталонный спектр: формула = Симпсон ("+fx(eS/uf.M)+")");
 проверка(uf.хвостОк&&Math.abs(R1.wв-uf.wv)/uf.wv<1e-3,"ωв = "+fx(R1.wв/1e6)+" Мрад/с (эталон "+fx(uf.wv/1e6)+")");
 const Td=PI/uf.wv,Nн=Math.ceil(sig.Tc/Td-1e-9),xs=[];for(let k=0;k<Nн;k++)xs.push(sig.s(k*Td+Td*1e-9));
 проверка(R1.x.length===Nн&&R1.x.every((v,i)=>Math.abs(v-xs[i])<2e-3),"отсчёты x(n): "+R1.x.length+" шт. (эталон "+Nн+")");
 проверка(R1.N===R1.x.length,"ДПФ от той же последовательности: N = "+R1.N);
 const xо=ctx.ОДПФ(R1.Ck);проверка(R1.x.every((v,i)=>Math.abs(v-xо[i])<1e-9),"ОДПФ возвращает x(n)");
 проверка(R1.x.every((v,i)=>Math.abs(ctx.рядФурье(R1.Ck,R1.N,R1.Tд,i*R1.Tд)-v)<1e-9),"тригонометрический ряд Фурье (В.1.5) проходит через отсчёты");
 if(P.тип==="А"){const a2=R1.ч2А,K=ЦЕПИ[N3N4];
  let eK=0;for(let i=1;i<=50;i++){const p=c(0,i/50*4*uf.wv);eK=Math.max(eK,abs(sub(div(ctx.pVal(a2.Np,p),ctx.pVal(a2.Dp,p)),K(p)))/abs(K(p)));}
  проверка(eK<1e-9,"K(p) цепи "+N3N4+" = рисунку А.3 (отн. ошибка "+fx(eK)+")");
  let eH=0;for(let th=0.05;th<PI;th+=0.05)eH=Math.max(eH,abs(sub(ctx.HизПолиномов(a2.a,a2.b,th),K(c(0,2/R1.Tд*Math.tan(th/2))))));
  проверка(eH<1e-9,"билинейный H(z) = K(j·2/Tд·tg(θ/2)) ("+fx(eH)+")");
  let eKc=0;for(let j=1;j<a2.KСx.length;j++){const th=j/200*PI;if(th>=PI-1e-9)continue;eKc=Math.max(eKc,Math.abs(a2.KСx[j]-abs(K(c(0,2/R1.Tд*Math.tan(th/2))))));}
  проверка(eKc<1e-9,"скорректированная АЧХ прототипа — той же цепи ("+fx(eKc)+")");
  // ИХ рекурсивного ЦФ по инвариантности = Tд·g(nTд) (+K(∞) при n=0)
  const g=ctx.импульснаяАналог(a2.Np,a2.Dp,24,R1.Tд);let eG=0;
  for(let k=0;k<24;k++)eG=Math.max(eG,Math.abs(a2.gnИИХ[k]-(g[k]*R1.Tд+(k===0?a2.Kбеск:0))));
  проверка(eG<1e-9,"БИХ по инвариантности: g(n) = Tд·g(nTд)"+(Math.abs(a2.Kбеск)>1e-12?" + K(∞)δ(n)":"")+" ("+fx(eG)+")");
  // K(∞) и δ-составляющая
  const Kinf=abs(K(c(1e13,0)));проверка(Math.abs(Math.abs(a2.Kбеск)-Kinf)<1e-6,"K(∞) = "+fx(Kinf,3)+" учтено");
  // интеграл g(t) + K(∞) = K(0): g на мелкой сетке
  const h=R1.Tд/200,gg=ctx.импульснаяАналог(a2.Np,a2.Dp,200*400,h);let I=0;for(let k=0;k<gg.length;k++)I+=(k===0?0.5:1)*gg[k]*h;
  const K0=abs(K(c(1e-3,0)));проверка(Math.abs(I+a2.Kбеск-K0)<2e-3,"∫g(t)dt + K(∞) = K(0) = "+fx(K0,3)+" ("+fx(I+a2.Kбеск,4)+")");
  проверка(a2.устойчивостьЦФ&&a2.устИнв,"оба рекурсивных ЦФ устойчивы");
  const M=a2.Mких,gm=Math.max(...a2.gnИИХ.map(Math.abs));
  проверка(Math.abs(a2.gnКИХ[M])>0.1*gm-1e-15,"порядок КИХ M="+M+" по порогу 0,1");
 }else{const b=R1.ч2БЧ,лп=лепесток(sig,t1);
  проверка(Math.abs(b.wЦ1-лп)/лп<2e-3,"ωЦ1 = ширина главного лепестка "+fx(b.wЦ1/1e6)+" Мрад/с (эталон "+fx(лп/1e6)+")");
  const Td2=R1.Tд,пр=w=>2/Td2*Math.tan(w*Td2/2),A1=пр(лп),A2=пр(2*лп),A3=пр(0.8*лп),eps=Math.sqrt(Math.pow(10,b.beta/10)-1);
  let nЭ=0;for(let k=1;k<=12&&!nЭ;k++){
   if(P.тип==="Б"){if(10*Math.log10(1+Math.pow(A2/A1,2*k))>=b.alfa&&10*Math.log10(1+Math.pow(A3/A1,2*k))<=b.beta)nЭ=k;}
   else if(10*Math.log10(1+eps*eps*Math.pow(Math.cosh(k*Math.acosh(A2/A1)),2))>=b.alfa)nЭ=k;}
  проверка(b.nB===nЭ,"порядок n = "+b.nB+" (эталон "+nЭ+")");
  const H=th=>abs(ctx.HизПолиномов(b.а,b.б,th));let Hmax=0,Hmin=9;const гр=(P.тип==="Б"?0.8:1)*b.wЦ1*Td2;
  for(let i=0;i<=2000;i++){const v=H(гр*i/2000);Hmax=Math.max(Hmax,v);Hmin=Math.min(Hmin,v);}
  const αф=20*Math.log10(Hmax/H(2*b.wЦ1*Td2)),βф=20*Math.log10(Hmax/Hmin);
  проверка(αф>=b.alfa,"затухание на 2ωЦ1: "+αф.toFixed(2)+" дБ ≥ "+b.alfa);
  проверка(βф<=b.beta+1e-4,"неравномерность в полосе: "+βф.toFixed(3)+" дБ ≤ "+b.beta);
  if(P.тип==="Ч"){проверка(Math.abs(βф-b.beta)<1e-3,"Чебышёв равноволновый: размах ровно β");
   проверка(Math.abs(Hmax-1)<1e-6,"max|H| = 1");}
  else проверка(Math.abs(H(b.wЦ1*Td2)-Math.SQRT1_2)<1e-6,"Баттерворт: на ωЦ1 уровень −3 дБ");
  проверка(b.устойчивостьЦФ,"ЦФ устойчив");}
}
console.log(ошибок?"\nРАСХОЖДЕНИЙ: "+ошибок:"\nВсе проверки пройдены.");
process.exit(ошибок?1:0);
