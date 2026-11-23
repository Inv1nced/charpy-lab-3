'use strict';
const byId = (id) => document.getElementById(id);
const fmt = (value, digits = 2) => value.toLocaleString('ru-RU', {maximumFractionDigits: digits});

const time = byId('time');
const play = byId('play');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let animationFrame = 0;

function drawImpact(value) {
  const descent = Math.min(value / 53, 1);
  const rebound = Math.max(0, (value - 53) / 47);
  const separation = Math.max(0, (value - 57) / 43);
  const angle = 63 * Math.cos(descent * Math.PI / 2) - 34 * Math.sin(rebound * Math.PI / 2);
  byId('hammer').setAttribute('transform', 'rotate(' + angle + ' 210 38)');
  byId('topPart').setAttribute('transform', 'translate(' + 37 * separation + ' ' + (-15 * separation) + ') rotate(' + (-25 * separation) + ' 225 172)');
  byId('bottomPart').setAttribute('transform', 'translate(' + 37 * separation + ' ' + 16 * separation + ') rotate(' + (25 * separation) + ' 225 172)');
  byId('crack').setAttribute('opacity', value >= 53 && value <= 59 ? '1' : '0');
  time.value = Math.round(value);
  let stage = 'Маятник поднят';
  if (value >= 63) stage = 'Остаток энергии поднимает маятник';
  else if (value >= 53) stage = 'Удар, трещина растёт от дна надреза';
  else if (value > 0) stage = 'Маятник разгоняется';
  const phase = byId('phase');
  if (phase.textContent !== stage) phase.textContent = stage;
}
function stopImpact() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  play.textContent = Number(time.value) === 100 ? 'Повторить' : 'Пуск';
}
play.addEventListener('click', () => {
  if (animationFrame) {
    stopImpact();
    return;
  }
  const from = Number(time.value) === 100 ? 0 : Number(time.value);
  if (reduced.matches) {
    drawImpact(from < 53 ? 53 : 100);
    play.textContent = from < 53 ? 'Следующий этап' : 'Повторить';
    return;
  }
  const start = performance.now();
  play.textContent = 'Пауза';
  function tick(now) {
    const value = Math.min(100, from + (now - start) / 35);
    drawImpact(value);
    if (value < 100) animationFrame = requestAnimationFrame(tick);
    else stopImpact();
  }
  animationFrame = requestAnimationFrame(tick);
});
byId('restart').addEventListener('click', () => {
  drawImpact(0);
  stopImpact();
});
time.addEventListener('input', () => {
  stopImpact();
  drawImpact(Number(time.value));
});

const areaButtons = [...document.querySelectorAll('[data-area]')];
const areaText = {
  start: 'Слева от максимума — около 20 клеток, или 10,34 Дж на зарождение трещины.',
  grow: 'Справа от максимума — около 23,5 клетки, или 12,15 Дж на распространение.',
  both: 'Две площади дают полную работу около 22,49 Дж. Форма кривой показана схематично.'
};
for (const button of areaButtons) {
  button.addEventListener('click', () => {
    const mode = button.dataset.area;
    for (const other of areaButtons) other.setAttribute('aria-pressed', String(other === button));
    byId('areaStart').setAttribute('opacity', mode === 'grow' ? '.18' : '1');
    byId('areaGrow').setAttribute('opacity', mode === 'start' ? '.18' : '1');
    byId('areaInfo').textContent = areaText[mode];
  });
}

const fields = ['cellsBefore', 'cellsAfter', 'scale', 'area'].map(byId);
function compute() {
  const [before, after, scale, section] = fields.map((field) => field.valueAsNumber);
  const output = byId('calcResult');
  if (fields.some((field) => !field.validity.valid) || ![before, after, scale, section].every(Number.isFinite) || scale <= 0 || section <= 0) {
    output.textContent = 'Введи неотрицательное число клеток и положительные значения масштаба и площади.';
    return;
  }
  const startEnergy = before * scale;
  const growthEnergy = after * scale;
  const total = startEnergy + growthEnergy;
  const kcu = total * 1000 / section;
  if (![total, kcu].every(Number.isFinite)) {
    output.textContent = 'Число слишком большое для расчёта. Проверь введённые значения.';
    return;
  }
  output.textContent = 'Зарождение ' + fmt(startEnergy) + ' Дж · Рост ' + fmt(growthEnergy) + ' Дж · Всего ' + fmt(total) + ' Дж · KCU ≈ ' + fmt(kcu) + ' кДж/м²';
}
for (const field of fields) field.addEventListener('input', compute);
compute();

const treatmentRows = [
  ['Закалка','10,3','12,1','22,4','129','152','281','—','—'],
  ['Отпуск ≈ 200 °C','8,272','20,68','28,95','103,4','258,5','361,5','31,4','392,5'],
  ['Отпуск 300 °C','9,82','29,47','39,29','122,78','368,36','491,14','39,0','487,5'],
  ['Отпуск ≈ 400 °C','10,86','33,6','44,46','135,7','420','555,7','42,0','525'],
  ['Отпуск ≈ 500 °C','11,89','61','72,89','148,64','762,58','911,22','74,5','931,25'],
  ['Отпуск 550 °C','8,01','34,89','42,91','100,17','436,22','536,39','45,2','565'],
  ['Отпуск ≈ 600 °C','10,6','111,2','121,8','132,5','1390','1522,5','118,7','1483,75']
];
const tempRows = [
  ['1','100','77,9','0,93'],
  ['2','100','76,3','0,91'],
  ['3','50','61,2','0,73'],
  ['4','30','54,5','0,65'],
  ['5','0','51,1','0,61'],
  ['6','≈ 0','50,3','0,60']
];
function populate(tableId, rows) {
  const table = byId(tableId);
  for (const [label, ...values] of rows) {
    const row = table.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = label;
    row.append(heading);
    for (const value of values) row.insertCell().textContent = value;
  }
}
populate('mainRows', treatmentRows);
populate('tempRows', tempRows);

const tempInput = byId('temp');
const dvs = [[-80,0],[-60,0],[-50,30],[-40,50],[-20,100],[20,100]];
const kcu = [[-80,.60],[-60,.60],[-50,.65],[-40,.73],[-20,.90],[20,.90]];
const x = (temp) => 48 + (temp + 80) * 2.91;
const svgNS = 'http://www.w3.org/2000/svg';
function chartNode(parent, tag, attributes, label) {
  const element = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (label !== undefined) element.textContent = label;
  parent.append(element);
  return element;
}
function makePlot(id, points, ticks, min, max, color) {
  const svg = byId(id);
  const y = (n) => 155 - (n - min) / (max - min) * 129;
  for (const tick of ticks) {
    chartNode(svg, 'line', {x1:48,x2:339,y1:y(tick),y2:y(tick),stroke:'#dce7e8'});
    chartNode(svg, 'text', {x:41,y:y(tick)+4,'text-anchor':'end',fill:'#4e6270','font-size':13}, fmt(tick));
  }
  for (const tick of [-80,-60,-40,-20,0,20]) {
    chartNode(svg, 'text', {x:x(tick),y:174,'text-anchor':'middle',fill:'#4e6270','font-size':13}, fmt(tick));
  }
  chartNode(svg, 'text', {x:339,y:194,'text-anchor':'end',fill:'#4e6270','font-size':13}, 'T, °C');
  chartNode(svg, 'line', {x1:48,x2:339,y1:155,y2:155,stroke:'#718792'});
  chartNode(svg, 'line', {x1:x(-40),x2:x(-40),y1:23,y2:155,stroke:'#718792','stroke-dasharray':'4 5'});
  chartNode(svg, 'polyline', {points:points.map(([temp,val]) => x(temp) + ',' + y(val)).join(' '),fill:'none',stroke:color,'stroke-width':3,'stroke-linejoin':'round'});
  const guide = chartNode(svg, 'line', {x1:0,x2:0,y1:23,y2:155,stroke:color,opacity:.46});
  const dot = chartNode(svg, 'circle', {r:6,fill:color,stroke:'white','stroke-width':2});
  return (temp) => {
    const right = points.findIndex(([point]) => point >= temp);
    let value = points[0][1];
    if (right > 0) {
      const [t0, v0] = points[right - 1];
      const [t1, v1] = points[right];
      value = v0 + (v1 - v0) * (temp - t0) / (t1 - t0);
    }
    guide.setAttribute('x1', x(temp));
    guide.setAttribute('x2', x(temp));
    dot.setAttribute('cx', x(temp));
    dot.setAttribute('cy', y(value));
    return value;
  };
}
const showDvs = makePlot('dvsPlot', dvs, [0,30,50,100], 0, 100, '#12615b');
const showKcu = makePlot('kcuPlot', kcu, [.60,.70,.80,.90], .58, .93, '#aa5518');
function drawTemperature() {
  const temp = Number(tempInput.value);
  byId('tempReading').textContent = fmt(temp) + ' °C';
  byId('tempResult').textContent = 'На восстановленных кривых ДВС ≈ ' + fmt(showDvs(temp), 0) + '% · KCU ≈ ' + fmt(showKcu(temp)) + ' по шкале тетради.';
}
tempInput.addEventListener('input', drawTemperature);
drawTemperature();

const questions = [
  ['manual','Каков физический смысл характеристики «вязкость»?','Вязкость показывает, сколько энергии нужно затратить на разрушение. В теории эту работу можно отнести к объёму материала. В опыте Шарпи делим работу удара на площадь металла под надрезом.'],
  ['manual','Как вязкость связана с прочностью и пластичностью?','Важно, какую нагрузку металл выдерживает и насколько успевает согнуться или растянуться до разрыва. На теоретическом графике это высота и ширина площади под кривой. Обе величины влияют на работу разрушения.'],
  ['manual','Каким методом обычно определяют вязкость металлов и какие факторы важны?','Ударным изгибом надрезанного образца по Шарпи. Существенны скорость нагружения и жёсткость напряжённого состояния в зоне надреза.'],
  ['manual','При каких скоростях деформации испытания считаются статическими?','В пособии указан диапазон 10⁻⁴–10⁻² с⁻¹. При ударном испытании речь идёт о порядке 10² с⁻¹.'],
  ['manual','Что такое коэффициент мягкости?','Отношение максимального касательного напряжения к максимальному приведённому нормальному. Чем меньше отношение, тем жёстче напряжённое состояние.'],
  ['manual','Какие типы концентраторов предусмотрены ГОСТом?','U — скруглённый надрез, V — V-образный надрез, T — заранее наведённая усталостная трещина. В основном тексте пособия указан ГОСТ 9454-78, в вопросе на с. 33 напечатано 9454-76.'],
  ['manual','Какими способами разделяют ударную вязкость?','Первый способ — посчитать клетки слева и справа от вершины графика. Второй — ударить по бруску, в котором уже есть трещина. По такому удару оценивают энергию её роста. Это метод Дроздовского.'],
  ['manual','В чём состоит методика Дроздовского и что она определяет?','Брусок многократно нагружают, пока в нём не появится маленькая трещина. Потом бьют маятником. Трещина уже есть, поэтому большая часть работы удара идёт на её рост. Отсюда KCT примерно равно KCр.'],
  ['manual','Каковы недостатки методики Дроздовского?','Часть работы нужна, чтобы сдвинуть готовую трещину с места. До удара в ней также могут происходить коррозионные и другие процессы. По пособию KCT превышает KCр, а расхождение может быть заметным для пластичных материалов.'],
  ['manual','Почему разность KCU − KCT (или KCV − KCT) даёт KCз?','Полное значение складывается из зарождения и распространения. Вычитаем KCT как оценку второй части. Результат приближённый и, по пояснению пособия, занижен.'],
  ['manual','Как разделить составляющие по диаграмме «нагрузка — прогиб»?','Граница проходит в максимуме перед спадом нагрузки. Площадь слева даёт Kз, справа — Kр. Делим каждую на живое сечение и получаем KCз и KCр. В § 3.8 в названии оси есть опечатка; в теории указан прогиб.'],
  ['manual','Какой из двух материалов надёжнее при равном KCU или KCV?','При прочих равных тот, у которого больше KCр. Если трещина уже есть, именно сопротивление её дальнейшему росту особенно важно.'],
  ['manual','В чём сходство и отличие статических и динамических испытаний?','В обоих образец нагружают и оценивают сопротивление деформации или разрушению. Отличается скорость деформации. Для ударного испытания она на несколько порядков выше, чем для статического.'],
  ['lab','Где бьёт маятник и почему трещина идёт от надреза?','Посередине между двумя опорами, напротив надреза. Изгиб растягивает металл на стороне надреза, а у его дна концентрируется напряжение.'],
  ['lab','Как копёр определяет полную работу удара?','По убыли энергии маятника: после разрушения образца он уже не добирается до прежней высоты. Прибор показывает работу удара K в джоулях.'],
  ['lab','Почему площадь одного квадратика на диаграмме измеряется в джоулях?','Сторона по вертикали соответствует шагу силы в ньютонах, сторона по горизонтали — шагу прогиба в метрах. Умножаем ньютоны на метры и получаем Н·м, то есть джоуль.'],
  ['lab','Воспроизведи расчёт 281 кДж/м² без подсказки.','Складываем 20 и 23,5 клетки, умножаем на 0,517 Дж/клетку. Получаем 22,4895 Дж. Делим на 8 × 10⁻⁵ м² и переводим Дж/м² в кДж/м². Результат ≈ 281 кДж/м².'],
  ['lab','Что означает живое сечение и сколько оно здесь составляет?','Это площадь материала, оставшегося в плоскости надреза до удара. По записи 80 мм². Для бруска 10 × 10 мм и надреза 2 мм получаем 10 × 8 мм².'],
  ['lab','Зачем сравнивать результаты по диаграмме и по установке?','Это два способа найти полную работу. Сравнение позволяет проверить порядок результатов. Ручной подсчёт клеток и считывание показаний могут давать расхождение. Диаграмма дополнительно выделяет работу зарождения и роста.'],
  ['lab','Что значит ДВС = 50% и как найти T₅₀?','Половина площади поверхности излома имеет признаки вязкого разрушения. На верхнем графике от 50% проводим горизонталь до кривой и опускаемся к оси температур. По тетради около −40 °C.'],
  ['lab','Почему важно различать температуру испытания и температуру отпуска?','Температура отпуска относится к подготовке материала. Температура испытания — к состоянию образца во время удара. В таблице режимов и на температурном графике меняются разные параметры.'],
  ['lab','Что в таблице особенно изменилось между закалкой и строкой с максимальным KCU?','Работа зарождения изменилась с 10,3 до 10,6 Дж, а работа распространения — с 12,1 до 111,2 Дж. В этой паре рост общего результата связан преимущественно с работой распространения трещины.'],
  ['lab','Как определяют период маятника по процедуре из пособия?','Трижды измеряют время 100 полных колебаний, находят среднее время и делят на 100. По периоду можно оценить расстояние от оси до центра удара.']
].map(([group, question, answer], id) => ({group, question, answer, id}));

const statusKey = 'charpy-lab-v1';
let marks = {};
try {
  const saved = JSON.parse(localStorage.getItem(statusKey) ?? '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) marks = saved;
} catch {}
let index = 0;
let open = false;
const deck = byId('deck');
function activeDeck() {
  if (deck.value === 'all') return questions;
  if (deck.value === 'retry') return questions.filter((card) => marks[card.id] === 'retry');
  return questions.filter((card) => card.group === deck.value);
}
function displayCard(message = '') {
  const cards = activeDeck();
  index = Math.min(index, Math.max(0, cards.length - 1));
  const card = cards[index];
  const known = cards.filter((item) => marks[item.id] === 'known').length;
  byId('cardCount').textContent = card ? (index + 1) + ' / ' + cards.length : '0 карточек';
  byId('cardProgress').max = Math.max(1, cards.length);
  byId('cardProgress').value = known;
  byId('question').textContent = card?.question ?? 'Пока нет карточек на повторение';
  byId('answer').textContent = card?.answer ?? '';
  byId('answer').hidden = !open || !card;
  byId('reveal').hidden = !card;
  byId('reveal').textContent = open ? 'Скрыть ответ' : 'Показать ответ';
  byId('reveal').setAttribute('aria-expanded', String(open && !!card));
  byId('know').hidden = !open || !card;
  byId('retry').hidden = !open || !card;
  byId('prev').disabled = !card || index === 0;
  byId('next').disabled = !card || index >= cards.length - 1;
  byId('cardStatus').textContent = message || (card ? 'Вспомнил ' + known + ' из ' + cards.length : 'Отметь сложный вопрос кнопкой «Повторю», и он появится здесь.');
}
deck.addEventListener('change', () => { index = 0; open = false; displayCard(); });
byId('reveal').addEventListener('click', () => { open = !open; displayCard(); });
byId('prev').addEventListener('click', () => { index -= 1; open = false; displayCard(); });
byId('next').addEventListener('click', () => { index += 1; open = false; displayCard(); });
function markCard(status) {
  const cards = activeDeck();
  const selected = cards[index];
  if (!selected) return;
  marks[selected.id] = status;
  try { localStorage.setItem(statusKey, JSON.stringify(marks)); } catch {}
  if (deck.value !== 'retry' || status === 'retry') index = Math.min(index + 1, cards.length - 1);
  open = false;
  displayCard(status === 'known' ? 'Отмечено как выученное.' : 'Добавлено в колоду для повторения.');
  if (!byId('reveal').hidden) byId('reveal').focus({preventScroll:true});
  else deck.focus({preventScroll:true});
}
byId('know').addEventListener('click', () => markCard('known'));
byId('retry').addEventListener('click', () => markCard('retry'));
displayCard();

const links = [...document.querySelectorAll('.toc a')];
const sections = links.map((link) => document.querySelector(link.hash));
function updateNavigation() {
  let current = 0;
  for (let i = 0; i < sections.length; i += 1) {
    if (sections[i].getBoundingClientRect().top < 170) current = i;
  }
  for (const [index, link] of links.entries()) {
    if (index === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
window.addEventListener('scroll', updateNavigation, {passive:true});
updateNavigation();
