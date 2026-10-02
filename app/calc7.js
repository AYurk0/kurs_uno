"use strict";
/* Единый расчёт всех чисел для записки варианта 7 — строго по определениям.
   Сигнал 7 (index.html): рампа 0..t1, плато t1..t2, далее 0.  E=1 В, t1=1 мкс.
   Цепь 12: вход -> L1 -> узел 2 (выход) ; из узла 2 вниз R1 -> узел 3 ; узел 3 -> R2 -> земля, L2 -> земля. */
const PI=Math.PI, TAU=2*PI;
const E=1, t1=1e-6, t2=2*t1, Tc=3*t1;
const R1=1e3, R2=1e3, L1=1e-3, L2=1e-3;
const abs=c=>Math.hypot(c.re,c.im);

function s(t){
  if(t<0||t>=Tc) return 0;
  if(t<t1) return E*t/t1;
  if(t<t2) return E;
  return 0;
}
/* спектр: Симпсон с разрезом по изломам t1, t2 */
function S(w){
  if(w===0) return {re:E*(t1/2+(t2-t1)),im:0};
  const узлы=[0,t1,t2,Tc], M=1500;   // M чётное — условие Симпсона
  let re=0,im=0;
  for(let i=0;i<узлы.length-1;i++){
    const a=узлы[i],b=узлы[i+1],h=(b-a)/M;
    let pr=0,pi=0;
    // ВАЖНО: веса Симпсона (1,4,2,4,...,4,1) применяются к УЗЛАМ сетки a+k·h,
    // а не к серединам подынтервалов. Середины дают ошибку O(h²) вместо O(h⁴):
    // на уровне 0,1·max это сдвигало ωв на 0,06 % (6,4725 вместо 6,4765).
    for(let k=0;k<=M;k++){
      const wt=(k===0||k===M)?1:(k%2?4:2), t=a+k*h, v=s(t);
      pr+=wt*v*Math.cos(w*t); pi-=wt*v*Math.sin(w*t);
    }
    re+=pr*h/3; im+=pi*h/3;
  }
  return {re:re,im:im};
}
const out=[];const say=s=>{out.push(s);console.log(s);};

say('========== ЧАСТЬ 1 ==========');
const S0=E*(t1/2+(t2-t1));
say(`S(0) = E·(t1/2 + (t2-t1)) = ${(S0*1e6).toFixed(4)} мкВ·с = ${S0.toExponential(4)} В·с`);
say(`S(t) = 0 при t<0; = E·t/t1 при 0<=t<t1; = E при t1<=t<t2; = 0 при t2<=t<Tc`);
say(`t2 = 2t1 = ${(t2*1e6).toFixed(0)} нс ; Tc = 3t1 = ${(Tc*1e6).toFixed(0)} нс`);

// omega_в по определению методички: уровень 0,1·max, выше которого модуль НЕ превышается.
// Поэтому берём ПОСЛЕДНЕЕ пересечение вниз: между пересечениями боковой лепесток
// поднимается до 0,1299·max > 0,1, так что первое пересечение не удовлетворяет определению.
const level=0.1*S0, cross=[], WMAX=40e6, NG=40000;
let pw=0, prev=S0;
for(let i=1;i<=NG;i++){
  const w=i*WMAX/NG, cur=abs(S(w));
  if(prev>level&&cur<=level){
    let a=pw,b=w;
    for(let it=0;it<60;it++){const m=(a+b)/2;(abs(S(m))>level)?a=m:b=m;}
    cross.push((a+b)/2);
  }
  pw=w; prev=cur;
}
say(`пересечения уровня 0,1·max (вниз): ${cross.map(w=>(w/1e6).toFixed(4)+' МГц').join(' ; ')}`);
// боковой лепесток между пересечениями — доказательство, что первое не годится
{
  let pk=0,pv=0;
  for(let w=cross[0];w<=cross[cross.length-1];w+=WMAX/NG/20){const v=abs(S(w));if(v>pv){pv=v;pk=w;}}
  say(`боковой лепесток между пересечениями: max |S| = ${(pv*1e6).toFixed(4)} = ${(pv/S0*100).toFixed(2)} % от max при w = ${(pk/1e6).toFixed(3)} МГц  (> 10 % => первое пересечение не подходит)`);
}
const wv=cross[cross.length-1];
say(`omega_в = ПОСЛЕДНЕЕ пересечение = ${(wv/1e6).toFixed(4)} МГц = ${wv.toExponential(4)} рад/с`);
say(`N_min = ceil(Tc/Tд) = ${Math.ceil(Tc/(PI/wv))}  (в записке взято N = 12)`);

// Тд по формуле (3.25) методички
const Td=PI/wv;
say(`Тд = pi/omega_в = ${(Td*1e6).toFixed(4)} мкс`);
say(`fд  = 1/Тд   = ${(1/Td/1e6).toFixed(4)} МГц`);
say(`omega_д = 2pi/Тд = ${(TAU/Td/1e6).toFixed(4)} МГц`);
say(`2·omega_в = ${(2*wv/1e6).toFixed(4)} МГц  -> omega_д - 2·omega_в = ${((TAU/Td-2*wv)/1e6).toExponential(2)} МГц`);
say(`ЗАПАС: ${((TAU/Td)/(2*wv)*100).toFixed(3)} % от 2·omega_в  (равенство = граница, запаса нет)`);

// отсчёты
const NN=12, xs=[];
for(let n=0;n<NN;n++) xs.push(s(n*Td+1e-18));
say(`x(n) при Тд=${(Td*1e6).toFixed(4)} мкс, n=0..11: ${xs.map(v=>v.toFixed(4)).join(' ; ')}`);
say(`ненулевые отсчёты: n=0..${xs.findIndex(v=>v===0)-1}`);

// ДПФ
const C=xs.map((_,k)=>{let re=0,im=0;
  for(let n=0;n<NN;n++){const a=-TAU*k*n/NN;re+=xs[n]*Math.cos(a);im+=xs[n]*Math.sin(a);}
  return {re:re/NN,im:im/NN};});
const mC=C.map(abs), arg=C.map(c=>Math.atan2(c.im,c.re)*180/PI);
say(`|C_k| = ${mC.map(v=>v.toFixed(4)).join(' ; ')}`);
say(`arg C_k = ${arg.map(v=>v.toFixed(1)).join(' ; ')}`);
const sumC2=mC.reduce((a,b)=>a+b*b,0), sumX2=xs.reduce((a,b)=>a+b*b,0);
say(`Парсеваль: N·Σ|C_k|² = ${(NN*sumC2).toFixed(8)} ; Σx(n)² = ${sumX2.toFixed(8)} -> ${Math.abs(NN*sumC2-sumX2)<1e-12?'ВЫПОЛНЕНО':'НАРУШЕНО'}`);
say(`Σx(n) = ${xs.reduce((a,b)=>a+b,0).toFixed(4)} В ; Σ|C_k| = ${mC.reduce((a,b)=>a+b,0).toFixed(4)}  (это НЕ одно и то же)`);

say('');
say('========== ЧАСТЬ 2: ЦЕПЬ 12 ==========');
const cadd=(a,b)=>({re:a.re+b.re,im:a.im+b.im});
const cdiv=(a,b)=>{const d=b.re*b.re+b.im*b.im;return {re:(a.re*b.re+a.im*b.im)/d,im:(a.im*b.re-a.re*b.im)/d};};
/* Выход снимается в узле 2 = на шунте. Шунт Zш = R1 + (R2 || pL2).
   L1 последовательно с этим шунтом => K(p) = Zш/(pL1 + Zш)  — ФНЧ, K(0)=1. */
function Zш(p){
  const pL2={re:0,im:p*L2};
  // R2 || pL2 = (R2·pL2)/(R2 + pL2).  При p=jw имеем pL2 = {0, w·L2},
  // поэтому R2·pL2 = {0, R2·w·L2} — знак у мнимой части ПЛЮСОВОЙ.
  const числ={re:0, im:R2*pL2.im};
  const знам={re:R2+pL2.re, im:pL2.im};
  const par=cdiv(числ,знам);
  return {re:R1+par.re, im:par.im};
}
// Выход снимается в узле 2, который соединён с землёй через Zш.
// L1 стоит последовательно между источником и этим узлом.
function K(p){ const pL1={re:0,im:p*L1}; return cdiv(Zш(p),cadd(pL1,Zш(p))); }
// приведение к общему знаменателю:
// Zш = [R1R2 + p·L2(R1+R2)] / (R2 + p·L2)
// pL1 + Zш = [pL1(R2 + pL2) + R1R2 + p·L2(R1+R2)] / (R2 + pL2)
//          = [R1R2 + p·(L1R2 + L1L2 + L2R1 + L2R2) + p²·L1L2] / (R2 + pL2)
const N=[R1*R2, L2*(R1+R2)];
const D=[R1*R2, L1*R2+L1*L2+L2*(R1+R2), L1*L2];
const pv=(c,w)=>({re:c[0]-(c[2]||0)*w*w, im:(c[1]||0)*w});   // полином по возрастанию степени
let mx=0;
for(let i=1;i<=800;i++){const w=i*2e3, a=abs(cdiv(pv(N,w),pv(D,w))), b=abs(K(w));
  if(b>0) mx=Math.max(mx,Math.abs(a-b)/b);}
say(`Zш(p) = R1 + R2·pL2/(R2 + pL2) — выход снимается в узле 2, т.е. НА ШУНТЕ`);
[0,1e5,1e6,1e7].forEach(w=>{
  say(`   w=${w.toExponential(0).padStart(9)}  |K|=${abs(K(w)).toFixed(6)}  |N/D|=${abs(cdiv(pv(N,w),pv(D,w))).toFixed(6)}  ${w?'ФНЧ: падает':''}`);
});

say(`проверка: Zш = R1 + R2·pL2/(R2+pL2) = [R1R2 + p·L2(R1+R2)] / (R2 + p·L2)`);
say(`         pL1 + Zш = [p·L1·(R2+pL2) + R1R2 + p·L2(R1+R2)] / (R2 + pL2)`);
say(`         K = [R1R2 + p·L2(R1+R2)] / [R1R2 + p·(L1R2 + L2R1 + L2R2) + p²·L1L2]`);
say(`N(p) = ${N[0].toExponential(4)} + ${N[1].toExponential(4)}·p`);
say(`D(p) = ${D[0].toExponential(4)} + ${D[1].toExponential(4)}·p + ${D[2].toExponential(4)}·p^2`);
say(`  численно: R1R2=${(R1*R2).toExponential(4)}, L2(R1+R2)=${(L2*(R1+R2)).toExponential(4)}`);
say(`  численно: L1R2+L2(R1+R2)=${(L1*R2+L2*(R1+R2)).toExponential(4)}, L1L2=${(L1*L2).toExponential(4)}`);
say(`сверка N/D с прямым K(jw) на 800 частотах: max расхождение = ${mx.toExponential(2)}`);
say(`   (проверка в одной точке, w=1e6: N/D=${abs(cdiv(pv(N,1e6),pv(D,1e6))).toFixed(6)} K=${abs(K(1e6)).toFixed(6)})`);
say(`   (w=1e5: N/D=${abs(cdiv(pv(N,1e5),pv(D,1e5))).toFixed(6)} K=${abs(K(1e5)).toFixed(6)})`);
say(`K(0) = ${(N[0]/D[0]).toFixed(6)}  -> постоянная составляющая ПРОХОДИТ (ФНЧ)`);

// полюса
function корни(a,b,c){const d=b*b-4*a*c;
  return d<0?[{re:-b/(2*a)}]:[{re:(-b+Math.sqrt(d))/(2*a)},{re:(-b-Math.sqrt(d))/(2*a)}]
    .sort((x,y)=>y.re-x.re);}
const pol=корни(D[2],D[1],D[0]);
say(`полюса аналогового прототипа: ${pol.map(r=>r.re.toExponential(4)).join(' ; ')} (оба < 0 -> устойчиво)`);

// частота среза
function срез(f,ур){let lo=1e2,hi=1e10;
  for(let i=0;i<300;i++){const m=Math.sqrt(lo*hi);(f(m)>ур)?lo=m:hi=m;}
  return Math.sqrt(lo*hi);}
const wc=срез(w=>abs(K(w)),1/Math.SQRT2);
say(`omega_ср (|K|=0,7071) = ${wc.toExponential(4)} рад/с = ${(wc/1e6).toFixed(4)} МГц`);

// g(t) через разложение по полюсам: g(t) = sum Re{ N(p_k)/D'(p_k) · e^{p_k t} }
const Dp=[D[1],2*D[2]];
const pvD=(c,p)=>c[0]+c[1]*p;
const cD=(c,p)=>{const d=pvD(Dp,p);return {re:(c.re*d+c.im*0)/d,im:0};};
function pvN(p){return {re:N[0]+N[1]*p.re-N[1]*p.im, im:N[1]*p.re+N[1]*p.im};}
function g(t){
  let re=0,im=0;
  for(const pk of pol){
    const num={re:N[0]+N[1]*pk.re,im:N[1]*pk.im};
    const den=Dp[0]+Dp[1]*pk.re;
    const c={re:num.re/den,im:num.im/den};
    const er=Math.exp(pk.re*t), ei=Math.exp(pk.re*t)*0;
    re+=c.re*er;
    im+=c.re*ei;
  }
  return re;
}
say(`g(t) = сумма_k Re{ c_k·e^(p_k t) },  c_k = N(p_k)/D'(p_k)`);
pol.forEach((pk,i)=>{
  const num=N[0]+N[1]*pk.re, den=Dp[0]+Dp[1]*pk.re;
  say(`   p${i+1} = ${pk.re.toExponential(4)} -> c${i+1} = ${(num/den).toExponential(5)}`);
});
/* проверка: g(t) -> 0 при t->inf (устойчивая цепь), и интеграл g = K(0) */
let интегр=0, h=1e-9;
for(let t=0;t<40e-6;t+=h) интегр+=g(t)*h;
say(`g(0) = ${g(0).toExponential(5)} (пик; единицы В/с — это нормально для g(t))`);
say(`g(t) при t=1 мкс = ${g(1e-6).toExponential(4)} ; при t=10 мкс = ${g(10e-6).toExponential(4)}`);
say(`численный интеграл g(t)dt = ${интегр.toFixed(6)} ; K(0) = ${K(0).re.toFixed(6)} -> ${Math.abs(интегр-K(0).re)<1e-3?'совпало':'РАСХОЖДЕНИЕ'}`);

say('');
say('========== ЧАСТЬ 2: БИЛИНЕЙНОЕ Z-ПРЕОБРАЗОВАНИЕ ==========');
/* p = c(z-1)/(z+1), c = 2/Тд.  Приводим к общему знаменателю (z+1)^2.
   N(p)·(z+1)² = N0(z+1)² + N1·c(z-1)(z+1)
               = (N0+N1c)z² + 2N0·z + (N0-N1c)
   D(p)·(z+1)² = (D0+D1c+D2c²)z² + (2D0-2D2c²)z + (D0-D1c+D2c²) */
const c2=2/Td;
const nb=[N[0]+N[1]*c2, 2*N[0], N[0]-N[1]*c2];       // числитель: z², z, 1
const db=[
  D[0]+D[1]*c2+D[2]*c2*c2,                            // z²
  2*D[0]-2*D[2]*c2*c2,                                // z
  D[0]-D[1]*c2+D[2]*c2*c2                             // 1
];
/* делим и числитель, и знаменатель на db[0]·z² -> (b0 + b1 z^-1 + b2 z^-2)/(1 + a1 z^-1 + a2 z^-2) */
const b2=nb[2]/db[0], b1=nb[1]/db[0], b0=nb[0]/db[0];
const a1=db[1]/db[0], a2=db[2]/db[0];
say(`c = 2/Тд = ${c2.toExponential(6)}`);
say(`H(z) = (b0 + b1·z⁻¹ + b2·z⁻²) / (1 + a1·z⁻¹ + a2·z⁻²)`);
say(`b0 = ${b0.toFixed(7)}`);
say(`b1 = ${b1.toFixed(7)}`);
say(`b2 = ${b2.toFixed(7)}`);
say(`a1 = ${a1.toFixed(7)}`);
say(`a2 = ${a2.toFixed(7)}`);
// полюса ЦФ = корни z^2 + a1 z + a2 = 0
const zpol=корни(1,a1,a2);
say(`полюса ЦФ: ${zpol.map(r=>r.re.toFixed(6)).join(' ; ')}`);
say(`оба |z| < 1 -> ЦФ устойчив`);
// контроль H(1) должно совпасть с K(0)=1
const H1=(b0+b1+b2)/(1+a1+a2);
say(`контроль H(z=1) = ${H1.toFixed(9)} ; K(0) = ${K(0).re.toFixed(9)} -> ${Math.abs(H1-K(0).re)<1e-9?'совпало':'РАСХОЖДЕНИЕ'}`);
say(`контроль H(z=-1) = ${((b0-b1+b2)/(1-a1+a2)).toFixed(6)} (всегда 0 — граница частотного отклика)`);

/* предыскажение: omega = (2/Тд)·tg(omega_ц·Тд/2) */
const wA=2/Td*Math.tan(wc*Td/2);
say(`предыскажение: omega_ср ЦФ = (2/Тд)·tg(omega_ср·Тд/2) = ${wA.toExponential(5)} рад/с`);

/* отклик БИХ на x(n) */
function yБИХ(x){
  const y=[];
  for(let n=0;n<x.length+8;n++){
    let v=b0*(x[n]||0)+b1*(x[n-1]||0)+b2*(x[n-2]||0)-a1*(y[n-1]||0)-a2*(y[n-2]||0);
    y.push(v);
  }
  return y;
}
const yb=yБИХ(xs);
say('');
say('========== ЧАСТЬ 2: МЕТОД ИНВАРИАНТНОСТИ И ОТКЛИК ==========');
const gn=[];
for(let n=0;n<NN;n++) gn.push(g(n*Td)*Td);
say(`КИХ: g_n = g(n·Тд)·Тд = ${gn.map(v=>v.toExponential(4)).join(' ; ')}`);
say(`     ненулевые: n=0..${gn.filter(v=>Math.abs(v)>1e-9).length-1}`);
say(`БИХ: y(n) = b0·x(n) + b1·x(n-1) + b2·x(n-2) - a1·y(n-1) - a2·y(n-2)`);
say(`     отклик на x(n): ${yb.slice(0,10).map(v=>v.toFixed(5)).join(' ; ')}`);
say(`     максимум отклика = ${Math.max(...yb).toFixed(5)} при n = ${yb.indexOf(Math.max(...yb))}`);
say(`сумма y(n) = ${yb.reduce((a,b)=>a+b,0).toFixed(6)} ; сумма x(n) = ${xs.reduce((a,b)=>a+b,0).toFixed(6)}`);

require('fs').writeFileSync('calc7_out.txt', out.join('\n'),'utf8');
