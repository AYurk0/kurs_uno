# ПРАВКА К ПРОМПТУ: графики на SVG (функция `plot`)

Этот файл содержит (1) инструкцию, как встроить правку в существующий промпт `prompt_reshatel_kursovoy.md`, (2) готовый текст правки и (3) образец кода функции.

---

## ЧАСТЬ 1. ИНСТРУКЦИЯ ДЛЯ ТОГО, КТО ПЕРЕПИСЫВАЕТ ПРОМПТ

Задача: взять текущий `prompt_reshatel_kursovoy.md` и выдать его **полную обновлённую версию одним файлом**. Ничего не сокращай и не переформулируй вне перечисленных мест. Не добавляй пояснений внутрь промпта, что что-то «добавлено» или «изменено».

Сделай ровно шесть изменений:

1. **Раздел 4 «Технические ограничения».** В пункте про графики замени фразу про `<canvas>` на: «Графики рисуй как встроенный `<svg>` одной универсальной функцией `plot` (см. раздел 4Б); `<canvas>` не используй».
2. **Новый раздел 4Б.** Вставь текст из ЧАСТИ 2 (блок «РАЗДЕЛ 4Б») сразу после раздела 4А и перед разделом 5.
3. **Этап 1 «Математическое ядро».** В конец описания добавь: «Функция `plot` (раздел 4Б) пока не нужна; она делается на этапе 3».
4. **Этап 3 «Часть 1».** Добавь в конец: «Здесь реализуй и проверь функцию `plot` (раздел 4Б) на графиках части 1. Образец кода лежит в приложении к промпту; используй его как основу и не переписывай подход».
5. **Этап 7 «Частичный режим и оформление».** Добавь в конец: «Отчёт собирается как один HTML: графики и схемы вставляются как инлайновый SVG, картинки-файлы не нужны. Кнопка «Печать / PDF» открывает системную печать браузера».
6. **Приложение.** В самый конец промпта добавь заголовок «ПРИЛОЖЕНИЕ. ОБРАЗЕЦ КОДА `plot`» и код из ЧАСТИ 3 в блоке ```js.

Остальной текст промпта оставь без изменений. Проверь на выходе: (а) слова `canvas` встречаются только там, где сказано, что он не используется; (б) нумерация разделов и этапов не нарушена; (в) все шесть правок присутствуют. Кратко перечисли, что сделал, номерами из этого списка.

---

## ЧАСТЬ 2. ТЕКСТ ПРАВКИ

### РАЗДЕЛ 4Б (вставить как есть)

```
## 4Б. Графики: одна универсальная функция на SVG

Все графики (спектры, отсчёты, АЧХ, ФЧХ, характеристики) рисуются одной функцией `plot(контейнер, настройки)`, которая создаёт встроенный `<svg>`. Библиотек не используем.

**Настройки:** `title`, `xlabel`, `ylabel`, необязательные `xlim`, `ylim`, `series` (набор серий), `marks` (вертикальные пунктирные отметки, например ωв или fц).
**Серия:** `{label, x:[…], y:[…], type, dash}`; `type` — `line` (по умолчанию, непрерывная линия) или `stem` («палочки» для дискретных отсчётов); `dash:true` — штриховая линия для сравнения с эталоном.

**Функция обязана уметь:**
- автоматически подбирать пределы осей, «круглые» деления и сетку;
- рисовать несколько серий на общих осях с легендой;
- показывать значение точки при наведении мыши;
- кнопкой «Сохранить SVG» скачивать график файлом;
- подстраиваться под светлую и тёмную тему через CSS-переменные;
- иметь русские подписи осей с единицами измерения (рад/с, кГц, дБ, В).

**Соответствие графиков методички (п. 5) и вида серий:**

| График | Вид |
|---|---|
| Амплитудный спектр \|S(ω)\| входного сигнала, отметка ωв | линия + отметка |
| Отсчёты x(nTд) | stem |
| Спектр дискретизированного сигнала | линия |
| Коэффициенты Ck ДПФ (модуль и фаза) | stem |
| Восстановленный сигнал (Котельников, ряд Фурье) | линия поверх исходной |
| АЧХ, ФЧХ цифровых фильтров и скорректированная АЧХ аналогового прототипа | несколько линий на общих осях |
| g(nTд), y(nTд) | stem |

Ограничения: функция не должна знать о курсовой работе, только рисовать переданные данные. Расчёты и рисование строго разделены.
```

---

## ЧАСТЬ 3. ОБРАЗЕЦ КОДА `plot` (вставить в приложение промпта)

```js
// ---------- универсальная функция рисования (SVG, без библиотек) ----------
const COL=['var(--a)','var(--b)','var(--g)'];
function ticks(a,b,n){n=n||6;const raw=(b-a)/n,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p,s=(f<1.5?1:f<3?2:f<7?5:10)*p,t=[];
  for(let v=Math.ceil(a/s-1e-9)*s;v<=b+s*1e-9;v+=s)t.push(+v.toPrecision(10));return t}
const fmt=v=>String(+v.toPrecision(4));
function plot(host,o){
  const W=640,H=300,m={l:56,r:14,t:30,b:44},all=o.series.flatMap(s=>s.x.map((x,i)=>[x,s.y[i]]));
  let x0=o.xlim?o.xlim[0]:Math.min(...all.map(p=>p[0])),x1=o.xlim?o.xlim[1]:Math.max(...all.map(p=>p[0]));
  let y0=Math.min(...all.map(p=>p[1])),y1=Math.max(...all.map(p=>p[1]));
  if(o.series.some(s=>s.type==='stem')){y0=Math.min(y0,0);y1=Math.max(y1,0)}
  if(o.ylim){y0=o.ylim[0];y1=o.ylim[1]}else{const d=(y1-y0||1)*0.08;y1+=d;if(y0!==0)y0-=d}
  const sx=x=>m.l+(x-x0)/(x1-x0)*(W-m.l-m.r),sy=y=>H-m.b-(y-y0)/(y1-y0)*(H-m.t-m.b);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+o.title+'">';
  ticks(x0,x1).forEach(t=>{s+='<line x1="'+sx(t)+'" x2="'+sx(t)+'" y1="'+m.t+'" y2="'+(H-m.b)+'" stroke="var(--grid)"/><text class="mut" x="'+sx(t)+'" y="'+(H-m.b+16)+'" font-size="11" text-anchor="middle">'+fmt(t)+'</text>'});
  ticks(y0,y1,5).forEach(t=>{s+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+sy(t)+'" y2="'+sy(t)+'" stroke="var(--grid)"/><text class="mut" x="'+(m.l-6)+'" y="'+(sy(t)+4)+'" font-size="11" text-anchor="end">'+fmt(t)+'</text>'});
  s+='<rect x="'+m.l+'" y="'+m.t+'" width="'+(W-m.l-m.r)+'" height="'+(H-m.t-m.b)+'" fill="none" stroke="var(--mute)"/>';
  (o.marks||[]).forEach(k=>{s+='<line x1="'+sx(k.x)+'" x2="'+sx(k.x)+'" y1="'+m.t+'" y2="'+(H-m.b)+'" stroke="var(--mute)" stroke-dasharray="5 4"/><text x="'+(sx(k.x)+5)+'" y="'+(m.t+14)+'" font-size="12">'+k.label+'</text>'});
  o.series.forEach((se,j)=>{const c=COL[j%3];
    if(se.type==='stem'){se.x.forEach((x,i)=>{s+='<line x1="'+sx(x)+'" x2="'+sx(x)+'" y1="'+sy(0)+'" y2="'+sy(se.y[i])+'" stroke="'+c+'" stroke-width="1.6"/><circle cx="'+sx(x)+'" cy="'+sy(se.y[i])+'" r="3.4" fill="'+c+'"/>'})}
    else{s+='<path fill="none" stroke="'+c+'" stroke-width="2" '+(se.dash?'stroke-dasharray="6 4" ':'')+'d="'+se.x.map((x,i)=>(i?'L':'M')+sx(x).toFixed(1)+' '+sy(se.y[i]).toFixed(1)).join('')+'"/>'}});
  s+='<text x="'+m.l+'" y="18" font-size="13" font-weight="600">'+o.title+'</text>';
  s+='<text class="mut" x="'+((m.l+W-m.r)/2)+'" y="'+(H-6)+'" font-size="12" text-anchor="middle">'+o.xlabel+'</text>';
  s+='<text class="mut" transform="translate(13 '+((m.t+H-m.b)/2)+') rotate(-90)" font-size="12" text-anchor="middle">'+o.ylabel+'</text>';
  if(o.series.length>1){let lx=W-m.r-6;o.series.slice().reverse().forEach((se,k)=>{const j=o.series.length-1-k,w=se.label.length*6.4+30;lx-=w;
    s+='<line x1="'+lx+'" x2="'+(lx+18)+'" y1="17" y2="17" stroke="'+COL[j%3]+'" stroke-width="2" '+(se.dash?'stroke-dasharray="5 3"':'')+'/><text x="'+(lx+23)+'" y="21" font-size="12">'+se.label+'</text>'})}
  s+='</svg>';
  host.innerHTML='<div class="bar"><button data-a="svg">Сохранить SVG</button></div>'+s+'<div class="tip"></div>';
  const svg=host.querySelector('svg'),tip=host.querySelector('.tip');
  svg.addEventListener('mousemove',e=>{const r=svg.getBoundingClientRect(),x=x0+((e.clientX-r.left)/r.width*W-m.l)/(W-m.l-m.r)*(x1-x0);
    let best=null,bd=1e99;o.series.forEach(se=>se.x.forEach((xx,i)=>{const d=Math.abs(xx-x);if(d<bd){bd=d;best={se,i}}}));
    if(!best||x<x0||x>x1){tip.style.display='none';return}
    const px=sx(best.se.x[best.i])/W*r.width,py=sy(best.se.y[best.i])/H*r.height;
    tip.textContent=best.se.label+': '+fmt(best.se.x[best.i])+'; '+fmt(best.se.y[best.i]);
    tip.style.display='block';tip.style.left=Math.min(px+14,r.width-150)+'px';tip.style.top=(py+32)+'px'});
  svg.addEventListener('mouseleave',()=>tip.style.display='none');
  host.querySelector('button').onclick=()=>{const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([svg.outerHTML.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"')],{type:'image/svg+xml'}));a.download='grafik.svg';a.click()};
}
```

Демонстрационная страница, где этот код построил три графика (спектр, отсчёты, АЧХ), опубликована отдельно: https://claude.ai/artifact/VDtWNXR53eYHtZsx9uAivt
