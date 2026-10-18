// First name and surname are case- and diacritic-insensitive substring matches.
// District and municipality are chosen from drop-downs that only offer
// combinations present in the data. Everyone is listed on load; filled-in
// fields narrow the list. Results are paged.
// Data comes from data/records.json; see README.md for the format.

const FIELDS = ["name", "surname", "district", "municipality"];
const PAGE_SIZE = 10;

const form = document.getElementById("search");
const status = document.getElementById("status");
const table = document.getElementById("results");
const tbody = table.querySelector("tbody");
const pager = document.getElementById("pager");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const pageLabel = document.getElementById("page-label");
const clearButton = document.getElementById("clear");
const coverage = document.getElementById("coverage");

let people = [];
let sheetCount = 0;
let pairs = []; // distinct { district, municipality } combinations in the data
let districts = [];
let hits = [];
let page = 1;

const collator = new Intl.Collator("sk");
const unique = (values) => [...new Set(values)].sort(collator.compare);

const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

fetch("data/records.json")
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((data) => {
    people = data.sheets.flatMap((sheet) =>
      sheet.persons.map((p) => ({ ...p, sheet })),
    );
    sheetCount = data.sheets.length;
    pairs = [
      ...new Map(
        data.sheets.map((s) => [
          JSON.stringify([s.district, s.municipality]),
          { district: s.district, municipality: s.municipality },
        ]),
      ).values(),
    ];
    districts = unique(pairs.map((p) => p.district));
    fillSelect(form.district, districts, "Any district");
    coverage.textContent = describeCoverage();

    // The search and the page number are kept in the URL so they can be
    // bookmarked or shared.
    const params = new URLSearchParams(location.search);
    form.name.value = params.get("name") || "";
    form.surname.value = params.get("surname") || "";
    setPlace(
      params.get("district") || "",
      params.get("municipality") || "",
      true,
    );
    search(Number(params.get("page")) || 1);
  })
  .catch(
    (err) =>
      (status.textContent = `Could not load data/records.json (${err}). Serve the site over HTTP, see README.md.`),
  );

const municipalitiesOf = (district) =>
  unique(
    pairs
      .filter((p) => !district || p.district === district)
      .map((p) => p.municipality),
  );

const districtsOf = (municipality) =>
  unique(
    pairs.filter((p) => p.municipality === municipality).map((p) => p.district),
  );

// "a, b and c"
const listJoin = (items) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
    : items[0] || "";

// One sentence for the header: counts, then the municipalities grouped by
// district, e.g. "618 names from 100 sheets from the municipalities of Komárno
// and Zemianska Olča (Komárno district) and Veľké Zlievce (Modrý Kameň district)."
function describeCoverage() {
  const groups = districts
    .map((d) => ({ district: d, municipalities: municipalitiesOf(d) }))
    .sort((a, b) => collator.compare(a.municipalities[0], b.municipalities[0]))
    .map((g) => `${listJoin(g.municipalities)} (${g.district} district)`);
  const noun = pairs.length === 1 ? "municipality" : "municipalities";
  return `${
    people.length
  } names from ${sheetCount} sheets from the ${noun} of ${listJoin(groups)}.`;
}

function fillSelect(select, values, anyLabel) {
  select.replaceChildren(
    new Option(anyLabel, ""),
    ...values.map((v) => new Option(v, v)),
  );
}

// Applies a district/municipality choice to the two drop-downs so that only
// combinations present in the data can be submitted: the municipality list is
// limited to the chosen district, a municipality outside it is cleared, and
// (with inferDistrict) a municipality found in exactly one district selects
// that district.
function setPlace(district, municipality, inferDistrict) {
  if (inferDistrict && municipality && !district) {
    const found = districtsOf(municipality);
    if (found.length === 1) district = found[0];
  }
  if (!districts.includes(district)) district = "";
  form.district.value = district;
  const municipalities = municipalitiesOf(district);
  fillSelect(form.municipality, municipalities, "Any municipality");
  form.municipality.value = municipalities.includes(municipality)
    ? municipality
    : "";
}

form.district.addEventListener("change", () =>
  setPlace(form.district.value, form.municipality.value, false),
);
form.municipality.addEventListener("change", () =>
  setPlace(form.district.value, form.municipality.value, true),
);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  search(1);
});

clearButton.addEventListener("click", () => {
  form.name.value = "";
  form.surname.value = "";
  setPlace("", "", false);
  search(1);
  form.name.focus();
});

prevButton.addEventListener("click", () => {
  goTo(page - 1);
  status.scrollIntoView();
});
nextButton.addEventListener("click", () => {
  goTo(page + 1);
  status.scrollIntoView();
});

function query() {
  return Object.fromEntries(FIELDS.map((f) => [f, form[f].value.trim()]));
}

// Filters people by the form fields (empty fields match everything) and shows
// the requested page.
function search(toPage) {
  const q = query();
  hits = people
    .filter(
      (p) =>
        norm(p.name).includes(norm(q.name)) &&
        norm(p.surname).includes(norm(q.surname)) &&
        (!q.district || p.sheet.district === q.district) &&
        (!q.municipality || p.sheet.municipality === q.municipality),
    )
    .sort(
      (a, b) =>
        a.surname.localeCompare(b.surname, "sk") ||
        a.name.localeCompare(b.name, "sk"),
    );
  goTo(toPage);
}

// Renders one page of the current hits; out-of-range page numbers are clamped.
function goTo(toPage) {
  const pageCount = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  page = Math.min(Math.max(1, toPage), pageCount);

  const q = query();
  const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v));
  if (page > 1) params.set("page", page);
  const qs = params.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);

  const start = (page - 1) * PAGE_SIZE;
  const shown = hits.slice(start, start + PAGE_SIZE);
  const n = hits.length;
  const filtered = Object.values(q).some(Boolean);
  const count = filtered
    ? `${n} match${n === 1 ? "" : "es"}`
    : `${n} people from ${sheetCount} sheets`;
  status.textContent =
    n === 0
      ? filtered
        ? "No matches."
        : "No records."
      : n > PAGE_SIZE
      ? `${count}, showing ${start + 1}–${start + shown.length}.`
      : `${count}.`;

  tbody.replaceChildren(...shown.map(row));
  table.hidden = n === 0;

  pager.hidden = pageCount <= 1;
  pageLabel.textContent = `Page ${page} of ${pageCount}`;
  prevButton.disabled = page === 1;
  nextButton.disabled = page === pageCount;
}

function row(p) {
  const tr = document.createElement("tr");
  // Same order as the table header and the form fields.
  const cells = [p.name, p.surname, p.sheet.district, p.sheet.municipality];
  for (const text of cells) {
    const td = document.createElement("td");
    td.textContent = text || "";
    tr.appendChild(td);
  }
  const link = document.createElement("a");
  link.href = `https://slovakiana.sk/en/census-forms/${p.sheet.id}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "View on slovakiana.sk ↗";
  tr.appendChild(document.createElement("td")).appendChild(link);
  return tr;
}
