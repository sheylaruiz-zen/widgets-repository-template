# Connector Setup

> **Platform rules live online, not here.** This file covers only the local build tooling in this repository. For the connector schema, authentication types, Jinja2 template variables, response transformation, SDK usage, and security rules — always consult the authoritative docs:
>
> - **LLM-optimized full text**: https://developer-portal.gainsight.com/docs/llms-full.txt
> - **Human-readable**: https://developer-portal.gainsight.com/docs

---

## What this repo does

Each widget may optionally include a `connectors.json` file alongside its `widget.json`:

```
widgets/<widget_name>/
├── widget.json
├── connectors.json      # Optional — connector definitions for this widget
└── dist/
    └── content.html
```

`bin/build-registry.sh` scans every widget directory for `connectors.json`, validates each entry, and merges all connectors into a single `connectors_registry.json` at the repository root.

> **Note:** The per-widget split is a local build-script convention for organizing source. The platform itself reads only the generated root-level `connectors_registry.json`. Either layout works upstream; this repo uses the per-widget layout so connector definitions sit next to the widget code that calls them.

## Composite connectors

A `connectors.json` may declare two kinds of connector, in two sibling arrays. Either or both may be present:

```json
{
  "connectors": [ ... ],
  "composite_connectors": [ ... ]
}
```

- `connectors` — single-request connectors (one `url` + `method`). This is the array described above.
- `composite_connectors` — connectors that run an ordered sequence of `steps`, where later steps can build on earlier ones. A composite has **no top-level `url`**; each step is itself a request.

The build script merges both arrays from every widget into the generated `connectors_registry.json`, which the platform reads.

### Shape

```json
{
  "composite_connectors": [
    {
      "name": "Country Lookup",
      "permalink": "country-lookup",
      "steps": [
        { "name": "all-countries",    "url": "https://restcountries.com/v3.1/all",           "method": "GET" },
        { "name": "europe-countries", "url": "https://restcountries.com/v3.1/region/europe", "method": "GET" }
      ]
    }
  ]
}
```

A step accepts the same fields as a single connector (`url`, `method`, `headers`, `query_parameters`, `authentication`, `request_body`, `response_body`, `response_content_type`), with two differences: a step `name` must be a slug, and `path_parameters` are not supported on steps. **How a later step references an earlier step's response, and the templating/auth/response-transformation semantics, are documented online** — fetch the docs before authoring real steps.

Call a composite from widget code with `sdk.connectors.composite.execute()` (distinct from the single-connector `sdk.connectors.execute()`). See `widgets/countries-react/connectors.json` for a working example. The exact SDK signature is in the online docs.

## Prerequisites

- `jq` installed
  - macOS: `brew install jq`
  - Linux: `sudo apt-get install jq` or `sudo yum install jq`

## Build commands

```bash
./bin/build-registry.sh            # Regenerate connectors_registry.json (and extensions_registry.json)
./bin/build-registry.sh --dry-run  # Preview without writing
./bin/build-registry.sh --validate # Validate the already-generated registry files
```

## Creating / modifying a connector (local-tooling steps only)

1. Create or edit `widgets/<name>/connectors.json`.
   - **Fetch the online docs first** for the current connector schema: authentication types, required/optional fields, supported algorithms, template variables, filters, and response transformation.
2. Run `./bin/build-registry.sh` to validate and regenerate the root registry.
3. Call the connector from widget code using the Widget SDK. **The SDK API (including the canonical script URL, `WidgetServiceSDK` constructor, and `connectors.execute()` options) is documented online** — cross-check with the online docs rather than assuming the shape.
4. Commit the per-widget `connectors.json` and the regenerated `connectors_registry.json`.

## Local-only validation performed by `bin/build-registry.sh`

The build script does **not** re-implement the platform's validation. It checks only what is needed to produce a well-formed registry:

- `connectors.json` is valid JSON and has a `connectors` array, a `composite_connectors` array, or both.
- Each connector has a non-empty `name` (≤ 255 chars) and non-empty `url`.
- `method`, if present, is one of `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`.
- `permalink`, if present, matches `^[a-z0-9]+(-[a-z0-9]+)*$`. If omitted, the build script auto-generates one from `name`.
- Permalinks are unique across **all** connectors in the repository, not just within a single widget.

For each entry in `composite_connectors`:

- `name` is non-empty (≤ 255 chars); `permalink` follows the same format/auto-generation rule and is unique across all composite connectors.
- `steps` is a non-empty array.
- Each step has a non-empty `name` that is a slug (`^[a-z0-9]+(-[a-z0-9]+)*$`) and a non-empty `url`; step names are unique within the composite.
- Step `method`, if present, is one of the verbs above.
- `path_parameters` are not present on any step.

Composite permalinks live in their own namespace, separate from single-connector permalinks (mirroring the platform).

Everything else — auth field names, template variable semantics, inter-step data passing, supported algorithms, request/response transformation behavior, rate limits, secrets handling — is enforced by the platform and documented online.

## Sample

- `widgets/countries-react/connectors.json` — a single connector plus a composite connector, both calling the public REST Countries API. Adapt them or delete them once the project has its own connectors.

## Troubleshooting

### Build fails with "must contain a 'connectors' and/or 'composite_connectors' array"
The file needs at least one of the two top-level arrays: `{ "connectors": [ ... ] }`, `{ "composite_connectors": [ ... ] }`, or both. Each must be an array, even for a single entry.

### Build fails on a composite connector's steps
Every composite connector needs a `steps` array with at least one step (`must have a steps array` / `must have at least one step`), and each step `name` must be a slug — lowercase letters, numbers, single dashes (`step name ... must be a slug`). Step names must be unique within the composite, each step needs a `url`, and `path_parameters` are not allowed on steps.

### Build fails with "invalid permalink format"
Lowercase letters, numbers, and single dashes only; no leading/trailing dashes; no consecutive dashes.

### Build fails with "Duplicate connector permalink"
Permalinks must be unique repo-wide. Rename one of the conflicting entries.

### Connector call fails at runtime (wrong auth, bad template, missing secret, upstream error, etc.)
**Fetch the online docs** — the authentication types, `get_secret()` behavior, Jinja2 functions/filters, and error responses are all documented there.
