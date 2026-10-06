function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseAppDate(value) {
  const text = String(value || '').trim().toLowerCase().replace(/^до\s+/, '');
  const iso = text.match(/^(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const numeric = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
  if (numeric) return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]));
  const months = { января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5, июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11 };
  const named = text.match(/(\d{1,2})\s+([а-яё]+)(?:\s+(20\d{2}))?/i);
  if (!named || months[named[2]] === undefined) return null;
  return new Date(Number(named[3] || new Date().getFullYear()), months[named[2]], Number(named[1]));
}

function parseLetterDeadline(text) {
  const source = String(text || '');
  const match = source.match(/(?:до|не позднее)\s+(\d{1,2}(?:[.\/-]\d{1,2}[.\/-]20\d{2}|\s+[а-яё]+(?:\s+20\d{2})?))/i);
  const date = match ? parseAppDate(match[1]) : null;
  return date ? localDateKey(date) : '';
}

function isWithinDays(value, start, days) {
  const date = parseAppDate(value);
  if (!date) return false;
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days);
  return date >= start && date < end;
}

function taskWord(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'задач';
  if (last === 1) return 'задача';
  return last >= 2 && last <= 4 ? 'задачи' : 'задач';
}

function renderDashboard() {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const newLetters = letters.filter(letter => letter.status === 'new');
  const nearEvents = events.filter(event => isWithinDays(event.date, dayStart, 7));
  const planEvents = typeof universityEvents === 'undefined' ? [] : universityEvents;
  const tomorrowEvents = planEvents.filter(event => event.date === localDateKey(tomorrow));
  const nearMonitorings = monitorings.filter(item => isWithinDays(item.deadline, dayStart, 7));
  const queue = [];

  newLetters.forEach(letter => {
    const deadline = letter.deadline || parseLetterDeadline(`${letter.summary || ''} ${letter.body || ''}`);
    queue.push({ kind: 'ПИСЬМО', urgent: true, title: letter.subject, meta: `${letter.sender} · ${deadline ? `срок ${universityDateLabel(deadline)}` : 'срок требует проверки'}`, view: 'inbox' });
  });
  nearEvents.forEach(event => queue.push({ kind: 'СОБЫТИЕ', title: event.title, meta: `${event.date}, ${event.time} · ${event.status}`, view: 'calendar' }));
  tomorrowEvents.forEach(event => queue.push({ kind: 'ЗАВТРА', urgent: true, title: event.title, meta: `${event.time || 'время уточняется'} · напоминание факультетам`, view: 'university' }));
  nearMonitorings.forEach(item => queue.push({ kind: 'СРОК', urgent: true, title: item.topic, meta: `${item.period} · до ${item.deadline}`, view: 'monitoring' }));

  document.querySelector('#dashboardDate').textContent = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  document.querySelector('#dashboardLettersCount').textContent = newLetters.length;
  document.querySelector('#dashboardEventsCount').textContent = nearEvents.length;
  document.querySelector('#dashboardUniversityCount').textContent = tomorrowEvents.length;
  document.querySelector('#dashboardMonitoringCount').textContent = nearMonitorings.length;
  document.querySelector('#attentionBadge').textContent = queue.length;
  document.querySelector('#dashboardQueueCaption').textContent = `${queue.length} ${taskWord(queue.length)}`;
  document.querySelector('#dashboardQueue').innerHTML = queue.length ? queue.map(item => `<article class="attention-item"><span class="attention-kind ${item.urgent ? 'urgent' : ''}">${item.kind}</span><div class="attention-copy"><strong>${esc(item.title)}</strong><span>${esc(item.meta)}</span></div><button class="mini-button" data-queue-view="${item.view}">Открыть →</button></article>`).join('') : '<div class="attention-empty"><strong>Срочных задач нет</strong><span>Можно перейти к планированию или проверить архив.</span></div>';
  document.querySelectorAll('[data-queue-view]').forEach(button => button.onclick = () => switchView(button.dataset.queueView));
}

document.querySelectorAll('[data-dashboard-target]').forEach(button => button.onclick = () => switchView(button.dataset.dashboardTarget));
document.querySelectorAll('[data-dashboard-action]').forEach(button => button.onclick = () => {
  const action = button.dataset.dashboardAction;
  if (action === 'upload') { switchView('inbox'); document.querySelector('#lettersFileInput').click(); }
  if (action === 'paste') { switchView('inbox'); document.querySelector('#letterModal').classList.remove('hidden'); }
  if (action === 'event') { switchView('university'); openUniversityEvent(); }
  if (action === 'monitoring') { switchView('monitoring'); openMonitoring(); }
});

renderDashboard();
