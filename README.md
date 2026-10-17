# 1930 Census Name Index

A static website for searching people in the 1930 Czechoslovak census sheets
that [slovakiana.sk](https://slovakiana.sk/en/census-forms) has scanned.
It is an independent project, not affiliated with slovakiana.sk or the
Slovak National Archive; every result links back to the original sheet there.

Four search fields: first name, surname, district, municipality. Matching is
a case- and diacritic-insensitive substring match, all filled fields must match.

## Files

| File | Purpose |
|---|---|
| `index.html` | the page |
| `style.css` | styling |
| `app.js` | loads the data and runs the search in the browser |
| `data/records.json` | the index, one entry per census sheet |

No build step, no dependencies.

## Run locally

The page loads `data/records.json` with `fetch`, which browsers block on
`file://` URLs, so serve the folder over HTTP:

```sh
docker run --rm -p 8080:80 -v "$(pwd):/usr/share/nginx/html:ro" nginx:alpine
```

Then open <http://localhost:8080>. Stop with Ctrl-C.

## Data format

`data/records.json` holds one object per sheet, with the people on it.
The pipeline in the repository root (`download.py`, `transcribe.py`) produces
one markdown transcription per sheet; convert those into this shape:

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

## Deploy to GitHub Pages

Everything uses relative paths, so the site works under a sub-path such as
`https://zabop.github.io/slovakiana-catalogue/`. In the repository settings,
point Pages at the branch and folder containing these files (GitHub only
offers `/` or `/docs`, so either rename this folder to `docs` or publish it
with the `actions/upload-pages-artifact` workflow using `path: frontend`).
