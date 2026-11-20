# Changelog

All notable changes to this card are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- First version: a year of any sensor with long-term statistics as a grid with one square per day, in four steps of one color, with the daily average, the days that reached the highest threshold and the best day above it
- Several metrics in one card, one at a time or all below each other, each with its own name, color, thresholds and way of taking the day's value
- The calendar year or the last twelve months, with buttons to page back a year at a time
- Hover, touch and keyboard readout per day, and the months as a table for screen readers
- A sensor of the Life Dashboard integration reads the phone's history instead of its own statistics, so a backfill shows up on the days it happened
- Thresholds and colors without configuration for steps, sleep, screen time and exercise, and a scale from the data for any other sensor
- A note with the date the statistics start, and empty states for a sensor without statistics and a year without data
- Visual editor in the card picker, built on Home Assistant's own form
- English, Arabic, Chinese, Dutch, French, German, Hindi, Italian, Japanese, Portuguese and Spanish, following the Home Assistant profile

[Unreleased]: https://github.com/owen282000/life-dashboard-year-card/commits/main
