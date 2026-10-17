// Search is case- and diacritic-insensitive substring matching over the four fields.
// Data comes from data/records.json; see README.md for the format.

const FIELDS = ['name', 'surname', 'district', 'municipality'];
const MAX_ROWS = 500;

const form = document.getElementById('search');
const status = document.getElementById('status');
const table = document.getElementById('results');
const tbody = table.querySelector('tbody');

let people = [];

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

fetch('data/records.json')
  .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
  .then(data => {
    people = data.sheets.flatMap(sheet => sheet.persons.map(p => ({ ...p, sheet })));
    fillList('districts', data.sheets.map(s => s.district));
    fillList('municipalities', data.sheets.map(s => s.municipality));
    status.textContent = `${people.length} people from ${data.sheets.length} sheets indexed.`;

    // Searches are kept in the URL so they can be bookmarked or shared.
    const params = new URLSearchParams(location.search);
    if (FIELDS.some(f => params.get(f))) {
      FIELDS.forEach(f => (form[f].value = params.get(f) || ''));
      search();
    }
  })
  .catch(err => (status.textContent = `Could not load data/records.json (${err}). Serve the site over HTTP, see README.md.`));

function fillList(id, values) {
  const options = [...new Set(values)].sort().map(v => Object.assign(document.createElement('option'), { value: v }));
  document.getElementById(id).replaceChildren(...options);
}

form.addEventListener('submit', e => {
  e.preventDefault();
  search();
});

function search() {
  const q = Object.fromEntries(FIELDS.map(f => [f, form[f].value.trim()]));
  if (!Object.values(q).some(Boolean)) {
    status.textContent = 'Fill in at least one field.';
    table.hidden = true;
    return;
  }
  history.replaceState(null, '', '?' + new URLSearchParams(Object.entries(q).filter(([, v]) => v)));

  const hits = people
    .filter(p =>
      norm(p.name).includes(norm(q.name)) &&
      norm(p.surname).includes(norm(q.surname)) &&
      norm(p.sheet.district).includes(norm(q.district)) &&
      norm(p.sheet.municipality).includes(norm(q.municipality)))
    .sort((a, b) => a.surname.localeCompare(b.surname, 'sk') || a.name.localeCompare(b.name, 'sk'));

  status.textContent =
    hits.length === 0 ? 'No matches.' :
    hits.length > MAX_ROWS ? `${hits.length} matches, showing the first ${MAX_ROWS}. Narrow the search.` :
    `${hits.length} match${hits.length === 1 ? '' : 'es'}.`;

  tbody.replaceChildren(...hits.slice(0, MAX_ROWS).map(row));
  table.hidden = hits.length === 0;
}

function row(p) {
  const tr = document.createElement('tr');
  const cells = [p.name, p.surname, p.sheet.municipality, p.sheet.district];
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text || '';
    tr.appendChild(td);
  }
  const link = document.createElement('a');
  link.href = `https://slovakiana.sk/en/census-forms/${p.sheet.id}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'View on slovakiana.sk ↗';
  tr.appendChild(document.createElement('td')).appendChild(link);
  return tr;
}
