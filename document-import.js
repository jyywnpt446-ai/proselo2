const baseParseFile = parseFile;

function fileExtension(file) {
  return file.name.toLowerCase().split('.').pop();
}

function ensureSupportedDocument(file) {
  if (fileExtension(file) === 'doc') throw new Error('Старый формат .doc нужно сохранить как .docx или PDF');
}

async function spreadsheetRows(file) {
  if (!window.XLSX) throw new Error('Модуль Excel не загрузился. Проверьте интернет-соединение');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' });
}

function documentLines(text) {
  let lines = String(text || '').split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (lines.length < 2) lines = String(text || '').split(/(?<=[.!?])\s+(?=[А-ЯA-Z])/).map(line => line.trim()).filter(Boolean);
  return lines;
}

function rowFromTextLine(line) {
  const delimited = line.split(/\t|\s*;\s*|\s+\|\s+/).map(value => value.trim()).filter(Boolean);
  if (delimited.length > 1) return delimited;
  const date = line.match(/\d{1,2}[.\/-]\d{1,2}[.\/-]20\d{2}|\d{1,2}\s+[а-яё]+(?:\s+20\d{2})?/i);
  if (date) return [date[0], line.replace(date[0], '').replace(/^\s*[-–—:;,]\s*/, '').trim()];
  return [line];
}

async function universalFileRows(file) {
  ensureSupportedDocument(file);
  const extension = fileExtension(file);
  if (extension === 'xlsx' || extension === 'xls') return spreadsheetRows(file);
  if (extension === 'docx') {
    if (!window.mammoth) throw new Error('Модуль Word не загрузился. Проверьте интернет-соединение');
    const html = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const parsed = new DOMParser().parseFromString(html.value, 'text/html');
    const tableRows = [...parsed.querySelectorAll('tr')].map(row => [...row.querySelectorAll('td,th')].map(cell => cell.textContent.trim()));
    if (tableRows.length) return tableRows;
  }
  const parsed = await baseParseFile(file);
  return documentLines(parsed.text).map(rowFromTextLine);
}

async function universalFileText(file) {
  const rows = await universalFileRows(file);
  return rows.map(row => row.map(value => String(value || '').trim()).filter(Boolean).join(' | ')).filter(Boolean).join('\n');
}

parseFile = async function parseAnySupportedFile(file) {
  const extension = fileExtension(file);
  if (extension === 'xlsx' || extension === 'xls') {
    const rows = await spreadsheetRows(file);
    return { sender: file.name.replace(/\.[^.]+$/, ''), text: rows.map(row => row.join(' | ')).join('\n'), filename: file.name };
  }
  return baseParseFile(file);
};

function labeledValue(text, labels) {
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${labels.join('|')})\\s*[:\\-–—]\\s*([^\\n]+)`, 'i');
  return (String(text).match(pattern) || [])[1]?.trim() || '';
}

function importedEventDate(value) {
  const date = parseAppDate(value);
  if (!date) return 'Дата не указана';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(date).replace(' г.', '');
}

function eventDraftFromText(text, fileName) {
  const lines = documentLines(text);
  const dateText = (text.match(/\d{1,2}[.\/-]\d{1,2}[.\/-]20\d{2}|\d{1,2}\s+[а-яё]+(?:\s+20\d{2})?/i) || [])[0] || '';
  const time = (text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/) || [])[0] || 'Время не указано';
  const title = labeledValue(text, ['название', 'тема', 'мероприятие']) || lines.find(line => line.length > 5 && !parseAppDate(line)) || fileName.replace(/\.[^.]+$/, '');
  return {
    id: Date.now() + Math.random(),
    title: title.slice(0, 220),
    date: importedEventDate(dateText),
    time,
    place: labeledValue(text, ['место проведения', 'место', 'адрес']) || 'Уточнить по исходному файлу',
    audience: [],
    owner: labeledValue(text, ['ответственный', 'исполнитель']) || 'Назначить ответственного',
    status: 'Черновик'
  };
}

function eventDraftsFromRows(rows, fileName) {
  const drafts = [];
  rows.forEach(row => {
    const values = row.map(value => String(value || '').trim()).filter(Boolean);
    const dateValue = values.find(value => parseAppDate(value));
    if (!dateValue) return;
    const time = values.find(value => /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value)) || 'Время не указано';
    const title = values.filter(value => value !== dateValue && value !== time && !/^\d+$/.test(value)).sort((a, b) => b.length - a.length)[0];
    if (!title || /дата|наименование|мероприятие/i.test(title) && values.length < 3) return;
    drafts.push({ id: Date.now() + Math.random(), title: title.slice(0, 220), date: importedEventDate(dateValue), time, place: 'Уточнить по исходному файлу', audience: [], owner: 'Назначить ответственного', status: 'Черновик' });
  });
  return drafts.length ? drafts : [eventDraftFromText(rows.map(row => row.join(' ')).join('\n'), fileName)];
}

async function importEventDocuments(fileList, targetView) {
  let imported = 0;
  const failed = [];
  for (const file of [...fileList]) {
    try {
      const rows = await universalFileRows(file);
      const drafts = eventDraftsFromRows(rows, file.name);
      events.push(...drafts);
      imported += drafts.length;
    } catch (error) {
      failed.push(`${file.name}: ${error.message}`);
    }
  }
  if (imported) {
    save();
    renderEvents();
    renderCalendar();
    switchView(targetView);
  }
  toast(imported ? `Добавлено черновиков мероприятий: ${imported}${failed.length ? `. Не обработано: ${failed.length}` : ''}` : failed[0] || 'Не удалось распознать файлы');
}

function monitoringRowsFromDocument(rows) {
  return rows.slice(0, 60).map(row => {
    const cells = row.map(value => String(value || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!cells.length || /^(показатель|мониторинг|тема)$/i.test(cells[0]) || /^(тема|период|отчётный период|ответственный|исполнитель)\s*:/i.test(cells[0])) return null;
    if (cells.length === 1) {
      const parts = cells[0].split(/\s*[:;]\s*/, 2);
      return { indicator: parts[0].slice(0, 240), value: parts[1] || '', unit: '', comment: 'Импортировано из документа' };
    }
    return { indicator: cells[0].slice(0, 240), value: cells[1] || '', unit: cells[2] || '', comment: cells.slice(3).join(' ') };
  }).filter(row => row?.indicator);
}

async function importMonitoringDocuments(fileList) {
  let imported = 0;
  const failed = [];
  for (const file of [...fileList]) {
    try {
      const rows = await universalFileRows(file);
      const text = rows.map(row => row.join(' ')).join('\n');
      const parsedRows = monitoringRowsFromDocument(rows);
      if (!parsedRows.length) throw new Error('не найдены строки показателей');
      const topic = labeledValue(text, ['тема', 'мониторинг']) || file.name.replace(/\.[^.]+$/, '');
      const period = labeledValue(text, ['отчётный период', 'период']) || 'Требует уточнения';
      monitorings.push({ id: Date.now() + Math.random(), topic: topic.slice(0, 180), period: period.slice(0, 100), deadline: parseLetterDeadline(text), owner: labeledValue(text, ['ответственный', 'исполнитель']) || 'Назначить ответственного', created: new Intl.DateTimeFormat('ru-RU').format(new Date()), rows: parsedRows });
      imported++;
    } catch (error) {
      failed.push(`${file.name}: ${error.message}`);
    }
  }
  if (imported) {
    save();
    renderMonitoringArchive();
  }
  toast(imported ? `Импортировано мониторингов: ${imported}${failed.length ? `. Не обработано: ${failed.length}` : ''}` : failed[0] || 'Не удалось распознать файлы');
}

document.querySelector('#importEventsBtn').onclick = () => document.querySelector('#eventsFileInput').click();
document.querySelector('#eventsFileInput').onchange = event => {
  importEventDocuments(event.target.files, 'events');
  event.target.value = '';
};
document.querySelector('#importCalendarBtn').onclick = () => document.querySelector('#calendarFileInput').click();
document.querySelector('#calendarFileInput').onchange = event => {
  importEventDocuments(event.target.files, 'calendar');
  event.target.value = '';
};
