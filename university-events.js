const universityFacultyDirectory = [
  { name: 'Агрономический факультет', email: 'agronomicheskiy.fakultet@mail.ru' },
  { name: 'Факультет экономики и управления АПК', email: 'econdekanat2020@mail.ru' },
  { name: 'Биолого-технологический факультет', email: 'biotech_dekanat@mail.ru' },
  { name: 'Факультет ветеринарной медицины', email: 'lnau.vet@yandex.ru' },
  { name: 'Инженерный факультет', email: 'mechfac@rambler.ru' },
  { name: 'Факультет пищевых технологий', email: 'lgau_tehfak@lnau.su' },
  { name: 'Факультет сельхозстроительства, землеустройства и кадастров', email: 'stroy_f_lnau@mail.ru' },
  { name: 'Политехнический колледж ЛГАУ', email: 'pklnau@yandex.ru' }
];

const officialPlanSource = 'http://lgau.ru/kalendar-meropriyatij-gou-vo-lnr-lgau/';
const allUniversityFaculties = universityFacultyDirectory.map(item => item.name);
const seedUniversityEvents = [
  { id: 201, title: 'Акция «Кормушка», посвящённая Международному дню птиц', date: '2025-04-01', time: '10:00', place: 'ФГБОУ ВО Луганский ГАУ', audience: 'Студенты и сотрудники университета', count: 25, owner: 'Отдел по воспитательной и социальной работе, факультет ветеринарной медицины', faculties: ['Факультет ветеринарной медицины'], source: officialPlanSource },
  { id: 202, title: 'Кубок ректора ЛГАУ', date: '2025-04-02', time: '15:00', place: 'ФГБОУ ВО Луганский ГАУ', audience: 'Студенты и сотрудники университета', count: 100, owner: 'Отдел по воспитательной и социальной работе и факультеты', faculties: allUniversityFaculties, source: officialPlanSource },
  { id: 203, title: 'Акция #ЯблочныйБУМ ко Всемирному дню здоровья', date: '2025-04-07', time: '10:00', place: 'ФГБОУ ВО Луганский ГАУ', audience: 'Студенты и сотрудники университета', count: 100, owner: 'Отдел по воспитательной и социальной работе, студенческое самоуправление', faculties: allUniversityFaculties, source: officialPlanSource },
  { id: 204, title: 'Благотворительный марафон «Пасхальный фестиваль»', date: '2025-04-14', time: '10:00', place: 'ФГБОУ ВО Луганский ГАУ', audience: 'Студенты и сотрудники университета', count: 100, owner: 'Отдел по воспитательной и социальной работе и факультеты', faculties: allUniversityFaculties, source: officialPlanSource }
];

let universityEvents = JSON.parse(localStorage.getItem('lgauUniversityEvents') || 'null') || seedUniversityEvents;
let editingUniversityEventId = null;

function saveUniversityEvents() {
  localStorage.setItem('lgauUniversityEvents', JSON.stringify(universityEvents));
  if (typeof renderDashboard === 'function') renderDashboard();
}

function universityDateLabel(value) {
  if (!value) return 'Дата не указана';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function isUniversityArchive(event) {
  return new Date(`${event.date}T23:59:59`) < new Date();
}

function universityRecipients(event) {
  return universityFacultyDirectory.filter(item => event.faculties.includes(item.name));
}

function renderUniversityEvents(filter = 'all') {
  const list = [...universityEvents]
    .filter(event => filter === 'all' || (filter === 'archive' ? isUniversityArchive(event) : !isUniversityArchive(event)))
    .sort((a, b) => a.date.localeCompare(b.date));
  document.querySelector('#universityEventList').innerHTML = list.map(event => {
    const recipients = universityRecipients(event);
    return `<article class="university-event ${isUniversityArchive(event) ? 'is-archive' : ''}">
      <div class="plan-date"><strong>${esc(universityDateLabel(event.date))}</strong><span>${esc(event.time || 'Время не указано')}</span></div>
      <div class="plan-content"><a class="tag" href="${event.source || officialPlanSource}" target="_blank" rel="noreferrer">КАЛЕНДАРНЫЙ ПЛАН ↗</a><h3>${esc(event.title)}</h3><p>${esc(event.place)}</p><div class="plan-meta"><span>${esc(event.audience)}</span><span>${Number(event.count) || 0} чел.</span><span>${esc(event.owner)}</span></div></div>
      <div class="plan-routing"><strong>НАПОМИНАНИЕ ФАКУЛЬТЕТАМ</strong><p>${recipients.length ? recipients.map(item => esc(item.name)).join(', ') : 'Получатели не назначены'}</p><div class="plan-actions"><button class="mini-button" data-edit-university="${event.id}">Изменить</button><button class="mini-button" data-mail-university="${event.id}">Письмо ↗</button></div></div>
    </article>`;
  }).join('') || '<div class="archive-empty">В выбранном периоде мероприятий нет</div>';
  document.querySelector('#universityBadge').textContent = universityEvents.filter(event => !isUniversityArchive(event)).length;
  document.querySelector('#universityPlanStatus').textContent = `${universityEvents.length} записей · ${universityEvents.filter(event => !isUniversityArchive(event)).length} предстоящих`;
  document.querySelectorAll('[data-edit-university]').forEach(button => button.addEventListener('click', () => openUniversityEvent(universityEvents.find(event => String(event.id) === button.dataset.editUniversity))));
  document.querySelectorAll('[data-mail-university]').forEach(button => button.addEventListener('click', () => prepareUniversityEventReminder(universityEvents.find(event => String(event.id) === button.dataset.mailUniversity))));
}

function openUniversityEvent(event = null) {
  editingUniversityEventId = event?.id || null;
  document.querySelector('#universityEventModalTitle').textContent = event ? 'Редактировать мероприятие' : 'Новое мероприятие';
  document.querySelector('#universityEventTitle').value = event?.title || '';
  document.querySelector('#universityEventDate').value = event?.date || '';
  document.querySelector('#universityEventTime').value = event?.time || '';
  document.querySelector('#universityEventPlace').value = event?.place || 'ФГБОУ ВО Луганский ГАУ';
  document.querySelector('#universityEventAudience').value = event?.audience || 'Студенты университета';
  document.querySelector('#universityEventCount').value = event?.count || 25;
  document.querySelector('#universityEventOwner').value = event?.owner || 'Отдел по воспитательной и социальной работе';
  document.querySelector('#universityFacultyPicker').innerHTML = universityFacultyDirectory.map(item => `<label><input type="checkbox" value="${esc(item.name)}" ${event?.faculties.includes(item.name) ? 'checked' : ''}>${esc(item.name)}</label>`).join('');
  document.querySelector('#universityEventModal').classList.remove('hidden');
}

function saveUniversityEvent() {
  const title = document.querySelector('#universityEventTitle').value.trim();
  const date = document.querySelector('#universityEventDate').value;
  if (!title || !date) return toast('Укажите название и дату мероприятия');
  const event = {
    id: editingUniversityEventId || Date.now(), title, date,
    time: document.querySelector('#universityEventTime').value,
    place: document.querySelector('#universityEventPlace').value.trim(),
    audience: document.querySelector('#universityEventAudience').value.trim(),
    count: Number(document.querySelector('#universityEventCount').value) || 0,
    owner: document.querySelector('#universityEventOwner').value.trim(),
    faculties: [...document.querySelectorAll('#universityFacultyPicker input:checked')].map(input => input.value),
    source: officialPlanSource
  };
  const index = universityEvents.findIndex(item => item.id === editingUniversityEventId);
  if (index >= 0) universityEvents[index] = event; else universityEvents.push(event);
  saveUniversityEvents();
  renderUniversityEvents();
  document.querySelector('#universityEventModal').classList.add('hidden');
  toast('Мероприятие сохранено в плане');
}

function universityReminderBody(event) {
  return `Коллеги!\n\nНапоминаем о проведении университетского мероприятия «${event.title}».\n\nДата: ${universityDateLabel(event.date)}\nВремя: ${event.time || 'уточняется'}\nМесто: ${event.place}\nЦелевая аудитория: ${event.audience}\nПланируемое количество: ${event.count} чел.\nОтветственный: ${event.owner}\n\nПросим довести информацию до кураторов и обеспечить участие назначенной аудитории.`;
}

function prepareUniversityEventReminder(event) {
  const recipients = universityRecipients(event);
  if (!recipients.length) return toast('Назначьте факультеты-получатели');
  const eml = `To: ${recipients.map(item => item.email).join(', ')}\r\nSubject: Напоминание ЛГАУ: ${event.title} · ${universityDateLabel(event.date)}\r\nContent-Type: text/plain; charset="utf-8"\r\n\r\n${universityReminderBody(event)}`;
  download(`ЛГАУ_${event.date}_${event.title.replace(/[\\/:*?"<>|]/g, '_')}.eml`, eml, 'message/rfc822');
  toast('Письмо факультетам подготовлено');
}

function prepareDueUniversityReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const key = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const due = universityEvents.filter(event => event.date === key);
  due.forEach(prepareUniversityEventReminder);
  if (!due.length) toast('На завтра университетских мероприятий нет');
}

function normalizeUniversityDate(value) {
  if (value instanceof Date) return localDateKey(value);
  const parsed = parseAppDate(value);
  return parsed ? localDateKey(parsed) : '';
}

async function importUniversityPlan(file) {
  const rows = await universalFileRows(file);
  let imported = 0;
  rows.forEach(row => {
    const dateIndex = row.findIndex(value => normalizeUniversityDate(value));
    if (dateIndex < 0) return;
    const date = normalizeUniversityDate(row[dateIndex]);
    const time = String(row.find(value => /^\d{1,2}:\d{2}$/.test(String(value).trim())) || '');
    const textCells = row.map(value => String(value).trim()).filter(value => value && value !== time && !normalizeUniversityDate(value));
    const title = textCells.sort((a, b) => b.length - a.length)[0]?.slice(0, 240);
    if (!title || /^(дата|время|место|название|мероприятие)\s*:?$/i.test(title)) return;
    universityEvents.push({ id: Date.now() + Math.random(), title, date, time, place: 'ФГБОУ ВО Луганский ГАУ', audience: 'Студенты и сотрудники университета', count: 25, owner: 'Уточнить по календарному плану', faculties: allUniversityFaculties, source: officialPlanSource });
    imported++;
  });
  if (!imported) {
    const text = rows.map(row => row.map(value => String(value || '')).join(' ')).join('\n');
    const draft = eventDraftFromText(text, file.name);
    const date = normalizeUniversityDate(draft.date);
    if (date) {
      universityEvents.push({ id: Date.now() + Math.random(), title: draft.title, date, time: draft.time === 'Время не указано' ? '' : draft.time, place: draft.place, audience: 'Студенты и сотрудники университета', count: 25, owner: draft.owner, faculties: allUniversityFaculties, source: officialPlanSource });
      imported = 1;
    }
  }
  if (!imported) return toast('Не удалось распознать строки плана. Проверьте таблицу');
  saveUniversityEvents();
  renderUniversityEvents();
  toast(`Импортировано мероприятий: ${imported}`);
}

document.querySelector('[data-view="university"]').addEventListener('click', () => {
  document.querySelector('#pageTitle').textContent = 'Мероприятия университета';
  renderUniversityEvents();
});
document.querySelector('#newUniversityEventBtn').addEventListener('click', () => openUniversityEvent());
document.querySelector('#saveUniversityEventBtn').addEventListener('click', saveUniversityEvent);
document.querySelectorAll('[data-close-university]').forEach(button => button.addEventListener('click', () => document.querySelector('#universityEventModal').classList.add('hidden')));
document.querySelector('#prepareUniversityRemindersBtn').addEventListener('click', prepareDueUniversityReminders);
document.querySelectorAll('[data-plan-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-plan-filter]').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  renderUniversityEvents(button.dataset.planFilter);
}));
document.querySelector('#importUniversityPlanBtn').addEventListener('click', () => document.querySelector('#universityPlanInput').click());
document.querySelector('#universityPlanInput').addEventListener('change', event => {
  [...event.target.files].reduce((chain, file) => chain.then(() => importUniversityPlan(file)).catch(error => toast(`${file.name}: ${error.message}`)), Promise.resolve());
  event.target.value = '';
});
renderUniversityEvents();
