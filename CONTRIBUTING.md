# Contributing

Thanks for your interest in improving the Life Dashboard Year Card.

## Getting started

The card is one JavaScript file with no dependencies and no build step: `dist/life-dashboard-year-card.js`.

```sh
npm test
node test/render.mjs
```

`npm test` runs the data logic under Node. `node test/render.mjs` serves the repository on a throwaway local port, runs the in-browser checks of `test/harness.html` in headless Chrome and writes screenshots to `test/out/`: light and dark, dashboard and phone width. Set `CHROME_BIN` if Chrome is somewhere else. Open `test/harness.html` through any static file server to look at the card by hand.

## What a change should keep

- One file, no dependencies, no build step.
- Every value that comes from a sensor or the configuration is set as text or as an attribute, never as markup.
- A sensor that is missing, has no statistics or has no data in a year shows a message, never a broken card.
- Works with any sensor that has long-term statistics. Nothing may require the Life Dashboard integration.
- Meaning is never color alone: every square has its date and value on hover, touch and keyboard, and the months are a table for screen readers.
- No dashes longer than a hyphen in texts, and no range formatting that inserts one.
- Sample data only in fixtures and screenshots, never someone's real health data.

## Commits and pull requests

Commit messages and pull request titles follow `type: Sentence with a capital`, such as `fix: Keep the month labels inside the grid`. Add a line under `## [Unreleased]` in `CHANGELOG.md` when a user would notice the change.

## Releasing

Versions are strict semver (`X.Y.Z`) and live in four places that must agree: `VERSION` in `dist/life-dashboard-year-card.js`, `version` in `package.json`, the section in `CHANGELOG.md`, and the git tag, which is the version without a prefix. A GitHub release on the tag is what the Marketplace offers to users.

The Marketplace installs `life-dashboard-year-card.js` from the release, and its download count is the install count. The `Release file` workflow runs the tests and attaches the file when a release is published, and fails when the versions do not match the tag. For an older release without the file, run the workflow by hand with that tag.

## Where things belong

The card only draws. Sensors and statistics are in the [integration](https://github.com/owen282000/life-dashboard-ha), and syncing is in the phone apps.
