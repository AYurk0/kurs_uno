"use strict";
/* Замер: сколько вычислений S(ω) и времени уходит на поиск ωв.
   СТАРЫЙ вариант: перебор с шагом 0,0005/Tc до 50/Tc = 100 000 вызовов. */
const t0=Date.now();
const P={E:1,t1:1e-6,N1:7,N2:1,N3N4:12,тип:"А",Td:0,N:12};
const t2=2*P.t1, Tc=3*P.t1;
function s_аналог(t){const E=P.E,t1=P.t1;
  if(t<0||t>=Tc)return 0;
  if(P.N1===7){if(t<t1)return E*t/t1;if(t<t2)return E;return 0;}
  return E;}
// Sчисл как в index.html: Симпсон, разрез по изломам
function Sчисл(w,Tc){const M=600,точки=[0,P.t1,t2,Tc];let re=0,im=0;
 for(let k=0;k<точки.length-1;k++){
  const a=точки[k],b=точки[k+1],h=(b-a)/M;let pr=0,pi=0;
  for(let i=0;i<=M;i++){const t=a+i*h,v=s_аналог(t);
   const wt=(i===0||i===M)?1:(i%2?4:2);
   pr+=wt*v*Math.cos(w*t); pi-=wt*v*Math.sin(w*t);}
  re+=pr*h/3; im+=pi*h/3;}
 return Math.hypot(re,im);}

const S0=Sчисл(0,Tc);
// СТАРЫЙ алгоритм
let nOld=0;const ta=Date.now();
{let w=0.0005/Tc;for(;w<=50/Tc;w+=0.0005/Tc){nOld++;if(Sчисл(w,Tc)<0.1*S0)break;}}
const tOld=Date.now()-ta;
// НОВЫЙ алгоритм
let nNew=0;const tb=Date.now();
{const wmax=50/Tc,шаг=wmax/1000;let wa=шаг,wb=null;
 for(let i=1;i<=1000;i++){const ww=i*шаг;nNew++;if(Sчисл(ww,Tc)<0.1*S0){wb=ww;break;}wa=ww;}
 if(wb!==null)for(let it=0;it<40;it++){const m=(wa+wb)/2;nNew++;(Sчисл(m,Tc)>=0.1*S0)?wa=m:wb=m;}}
const tNew=Date.now()-tb;

console.log('СТАРЫЙ: вызовов Sчисл =',nOld,' время =',tOld,'мс');
console.log('НОВЫЙ : вызовов Sчисл =',nNew,' время =',tNew,'мс');
console.log('ускорение в',(tOld/Math.max(tNew,0.01)).toFixed(0),'раз, вызовов меньше в',(nOld/nNew).toFixed(0),'раз');
console.log('всего было',(Date.now()-t0),'мс');
