document.querySelector('#importMonitoringBtn').addEventListener('click', () => {
  document.querySelector('#monitoringFileInput').click();
});

document.querySelector('#monitoringFileInput').addEventListener('change', event => {
  const files = [...event.target.files];
  const spreadsheets = files.filter(file => /\.xlsx?$/i.test(file.name));
  const documents = files.filter(file => !/\.xlsx?$/i.test(file.name));
  if (spreadsheets.length) importMonitoringFiles(spreadsheets);
  if (documents.length) importMonitoringDocuments(documents);
  event.target.value = '';
});
