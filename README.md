# 1930 Czechoslovak Census

A static website for searching people in the 1930 Czechoslovak census sheets
that [slovakiana.sk](https://slovakiana.sk/en/census-forms) has scanned.
It is an independent project, not affiliated with slovakiana.sk or the
Slovak National Archive; every result links back to the original sheet there.

The page lists everyone on load, 10 rows per page, sorted by surname and
first name. Four search fields narrow the list, all filled fields must match.
First name and surname are case- and diacritic-insensitive substring matches.
District and municipality are drop-downs built from the data: the municipality
list only offers municipalities of the chosen district, and choosing a
municipality first selects its district, so only combinations that occur in
the data can be searched. Clear empties all fields and shows the full list
again. The search and the page number are kept in the URL, so a result page can
be bookmarked or shared.

The form's columns mirror the table's, so each field sits above the column it
filters; the Sheet column has a fixed width (`--col-sheet` in `style.css`) and
the four data columns share the rest.

## Files

| File                          | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `index.html`                | the page                                                    |
| `style.css`                 | styling                                                     |
| `app.js`                    | loads the data and runs the search in the browser           |
| `data/records.json`         | the index, one entry per census sheet                       |
| `.github/workflows/ci.yaml` | deploys the site to GitHub Pages on every push to`master` |

No build step, no dependencies.

`index.html` links `style.css` and `app.js` with a `?v=` query. Bump it when
either file changes, otherwise browsers keep serving a cached copy for hours
(neither the local server below nor GitHub Pages tells them not to).

## Run locally

The page loads `data/records.json` with `fetch`, which browsers block on
`file://` URLs, so serve the folder over HTTP:

```sh
docker run --rm -p 8080:80 -v "$(pwd):/usr/share/nginx/html:ro" nginx:alpine
```

Then open [http://localhost:8080](http://localhost:8080). Stop with Ctrl-C.

## Data format

`data/records.json` holds one object per sheet, with the people on it.
The transcription pipeline lives in
[zabop/slovakiana-catalogue](https://github.com/zabop/slovakiana-catalogue)
and produces one markdown file per sheet; convert those into this shape:

```json
{
  "census": 1930,
  "generated": "2026-10-17",
  "sheets": [
    {
      "id": "cair-ko27ypy",
      "district": "Nové Zámky",
      "municipality": "Nové Zámky",
      "address": "Michal Bašta 10/508",
      "persons": [
        { "surname": "Kaffka", "name": "Alexander", "born": "12. apríl 1886", "relation": "majiteľ bytu" }
      ]
    }
  ]
}
```

* `id` is the slovakiana object id; the sheet link is `https://slovakiana.sk/en/census-forms/<id>`.
* `district` and `municipality` come from the slovakiana API
  (`https://wcm.slovakiana.sk/culturalobject/<id>`, `categories` level 1 and 2).
* `born`, `relation` and `address` are optional and not displayed; they are kept
  for later use. Keep `[?]` marks from the transcription for uncertain readings.

The sample file contains the one sheet transcribed so far (`cair-ko27ypy`).

## Deploy

Pushing to `master` runs `.github/workflows/ci.yaml`, which publishes the
repository root to GitHub Pages at [https://1930.sk](https://1930.sk).
The old address, `zabop.github.io/slovakiana-catalogue-fe`, redirects there.
One-time setup: in the repository settings under Pages, set Source to
"GitHub Actions" and Custom domain to `1930.sk`. The domain's DNS lives at the
registrar (HostCreators): the apex has GitHub Pages' A and AAAA addresses,
`www` is a CNAME to `zabop.github.io`, and mail for the domain goes to Proton.
