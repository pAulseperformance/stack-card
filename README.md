# stack-card

A README card that lists your services with **the last day you actually used each one**, drawn as an SVG from a JSON file in your repo. No tokens, no external service, no dependencies.

```json
{
  "groups": [
    {
      "title": "Build and ship",
      "services": [
        { "name": "Cloudflare", "last_used": "2026-11-17" },
        { "name": "Modal", "last_used": "2026-11-06" },
        { "name": "Hetzner", "last_used": null }
      ]
    }
  ]
}
```

`last_used` is a date, `null` for "no date on file", or the string `"never"`. The band is derived from the date on every render, so the card cannot brag about a service you stopped using: it fades on its own, and after a month it reads `46d ago` in muted ink.

## Install

`.github/workflows/stack.yml`:

```yaml
name: stack card
on:
  schedule: [{ cron: "0 6 * * *" }]   # daily, so the ages move
  push:
    paths: [".github/stack.json"]
  workflow_dispatch:

jobs:
  card:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: pAulseperformance/stack-card@v1
      - name: commit it if it moved
        run: |
          git config user.name "stack-card"
          git config user.email "actions@users.noreply.github.com"
          git add .github/stack.svg
          git commit -m "stack: refresh the card" || exit 0
          git push
```

Then in your README:

```markdown
<img src=".github/stack.svg" alt="my stack, ranked by when I last used each service" width="460">
```

## Inputs

| input | default | what it is |
|---|---|---|
| `config` | `.github/stack.json` | the record of services and dates |
| `output` | `.github/stack.svg` | where the card is written |

## What it is, and what it is not

It is a renderer. It does not measure your usage for you: the dates are yours to write, and the card is only as honest as the file behind it. That is deliberate, because there is no way for an action to ask Cloudflare when you last called it without a credential for every provider.

If you want the dates to fill themselves, point the card at your own record instead. The site this came from does that: the same card, drawn by a Worker from a reading its nightly job writes, [explained here](https://pAulseperformance.com/case/stack/).

Live example, drawn from that record:

<img src="https://pAulseperformance.com/card/stack.svg?v=2026-11-17" alt="the stack behind the site, ranked by last use" width="460">

## Test

```sh
node --test test/render.test.mjs
```

## Licence

MIT. Copy it, fork it, ship it.
