"use strict";
/* Автотест сигналов таблицы А.2 по контрольным значениям из signaly_A2_spec.md.
   Вынимает функции прямо из index.html и прогоняет все 9 форм при N2=1. */
const fs=require('fs');
const html=fs.readFileSync('app/index.html','utf8');
function pick(name){const i=html.indexOf('function '+name+'(');if(i<0)throw new Error('нет '+name);
 let d=0,j=html.indexOf('{',i);
 for(let k=j;k<html.length;k++){const ch=html[k];if(ch==='{')d++;else if(ch==='}'){d--;if(!d)return html.slice(i,k+1);}}
 throw new Error('не закрыта '+name);}
const dataForms=html.slice(html.indexOf('var ФОРМЫ_A2={'),html.indexOf('// Правая часть А.2:'));
const dataN2=html.slice(html.indexOf('var N2_A2={'),html.indexOf('// ВАЖНО: t2 и Tc берутся'));
const src=[
 'const C=(a,b)=>({re:a,im:b||0});',
 'const cAbs=z=>Math.hypot(z.re,z.im);',
 'var P={E:1,t1:1,N1:7,N2:1};',
 dataForms.replace(/;\s*$/,''),
 dataN2.replace(/;\s*$/,''),
 pick('парамСиг'),pick('грань'),pick('амп'),pick('отрезкиСигнала'),pick('s_аналог'),
 pick('Fотрезка'),pick('Sчисл'),pick('S0площадь'),
 'globalThis.__X={setP:function(a,b){P.N1=a;P.N2=b;P.t1=1;},Tc:парамСиг,mod:cAbs,S:Sчисл,S0:S0площадь,setE:function(e,t){P.E=e;P.t1=t;},get:function(){return {E:P.E,t1:P.t1};},sig:s_аналог};'
].join('\n');
eval(src);
const X=globalThis.__X;
// --- блок 2: ДПФ/ОДПФ формы 7 при N=12 (вариант 7), значения из задания ---
(function(){
 const P7={E:1,t1:1e-6,N1:7,N2:1};
 const saved=X.get();
 X.setP(7,1);X.setE(P7.E,P7.t1);
 eval(pick('ДПФ')+'\n'+pick('ОДПФ')+'\n'+pick('ОДПФк')+'\n'+
  pick('C')+'\n'+pick('cArg')+'\n'+pick('cAbs')+'\n'+pick('cA')+'\n'+pick('cM')+'\n'+pick('cE')+'\n'+pick('cD')+'\n'+
  'globalThis.__D={dft:ДПФ,idft:ОДПФ,idftk:ОДПФк,arg:cArg,abs:cAbs,tc:X.Tc,sig:X.sig};');
 const D=globalThis.__D;
 const q=D.tc(),Tc=q.Tc,Td=Math.PI/6.4765e6;
 const x=[];for(let n=0;n<12;n++){const t=n*Td+Td*1e-9;x.push(t<Tc?D.sig(t):0);}
 const Ck=D.dft(x);
 const expArg=[0,-82.2,-167.3,86.7,-117.0,133.2,0];
 const gotArg=Ck.slice(0,7).map(c=>D.abs(c)<1e-9?0:D.arg(c)*180/Math.PI);
 console.log('\nПроверка arg Ck (форма 7, N=12):');
 let fail=0;
 for(let k=0;k<7;k++){
  const ok=Math.abs(gotArg[k]-expArg[k])<0.15;
  if(!ok)fail++;
  console.log('  k='+k+': расч '+gotArg[k].toFixed(1)+' / ожид '+expArg[k].toFixed(1)+'  '+(ok?'ok':'ПРОВАЛ'));
 }
 const CkC=D.idftk(Ck);
 const mIm=Math.max(...CkC.map(c=>Math.abs(c.im)));
 console.log('Проверка ОДПФ (комплексное):');
 console.log('  max|Im x| = '+mIm.toExponential(2)+(mIm<1e-9?' ok':' ПРОВАЛ'));if(mIm>=1e-9)fail++;
 const expX=[0,0.485,0.970,1,1,0,0,0,0,0,0,0];
 let mDt=0;
 for(let n=0;n<12;n++)mDt=Math.max(mDt,Math.abs(CkC[n].re-expX[n]));
 console.log('  max|x−ожид| = '+mDt.toExponential(2)+(mDt<0.015?' ok':' ПРОВАЛ'));if(mDt>=0.015)fail++;
 X.setE(saved.E,saved.t1);
 if(fail){console.log('Блок 2: провалов '+fail);process.exitCode=1;}
 else console.log('Блок 2: все проверки пройдены');
})();
const EXP={1:[0,1.449,22.85,22],2:[2,2.000,16.27,16],3:[0,1.816,16.95,17],4:[2,2.000,2.75,3],
           5:[0,0.637,31.42,30],6:[1,1.000,19.24,19],7:[1.5,1.500,6.4765,7],
           8:[0.5,1.026,28.76,28],9:[-1,1.147,16.07,16]};
console.log('N1 | S(0) расч/спц      | M расч/спц       | omega_в расч/спц    | N_min | тест');
let провалов=0;
for(let n=1;n<=9;n++){
 X.setP(n,1);
 const q=X.Tc(),Tc=q.Tc;
 const s0=X.S0();
 let M=0;const NG=4000,W=60;
 for(let i=1;i<=NG;i++){const v=X.mod(X.S(W*i/NG,Tc));if(v>M)M=v;}
 const L=0.1*M;let cross=[],pw=W/NG,prev=X.mod(X.S(pw,Tc));
 for(let j=2;j<=NG;j++){const wj=W*j/NG,vj=X.mod(X.S(wj,Tc));
  if(prev>=L&&vj<L)cross.push((pw+wj)/2);pw=wj;prev=vj;}
 const wv=cross[cross.length-1],Td=Math.PI/wv,Nm=Math.ceil(q.Tc/Td);
 const e=EXP[n];
 const dS=Math.abs(s0-e[0]),dM=Math.abs(M-e[1]),dW=Math.abs(wv-e[2])/e[2]*100;
 // N_min лежит РОВНО на границе для формы 5: точное omega_в = 10*pi, значит
 // Tc/Тд = 30 ровно, и погрешность omega_в в 0,005 % перебрасывает ceil через
 // целое. Поэтому для пограничных случаев допускаем +1 (берётся большее — безопаснее).
 const наГранице=Math.abs(q.Tc/Td-e[3])<0.01;
 const okS=dS<0.005,okM=dM<0.005,okW=dW<0.5,okN=(Nm===e[3])||(наГранице&&Nm===e[3]+1);
 if(!(okS&&okM&&okW&&okN))провалов++;
 console.log(' '+n+' | '+s0.toFixed(4).padStart(8)+' /'+e[0].toFixed(3).padStart(6)+' | '+
  M.toFixed(4).padStart(8)+' /'+e[1].toFixed(3).padStart(6)+' | '+
  wv.toFixed(4).padStart(9)+' /'+e[2].toFixed(3).padStart(6)+' | '+String(Nm).padStart(4)+'   | '+
  (okS?'S0 ok':'S0 ПРОВАЛ')+', '+(okM?'M ok':'M ПРОВАЛ')+', '+(okW?'w ok':'w ПРОВАЛ')+', '+(okN?'N ok':'N ПРОВАЛ'));
}
console.log('\nПровалов: '+провалов+' из 9');
process.exit(провалов?1:0);