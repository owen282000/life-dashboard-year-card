import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  VERSION,
  addDays,
  autoThresholds,
  cssColor,
  dayKey,
  defaultThresholds,
  fillZeros,
  firstWeekday,
  formatDuration,
  formatValue,
  fromForm,
  gridLayout,
  hexToRgb,
  kindOf,
  levelOf,
  levelShade,
  loadRange,
  metricColor,
  missingStrings,
  monthSummaries,
  parseThresholds,
  perDay,
  pickField,
  rangeLabel,
  readMetrics,
  resolveMetric,
  statisticCandidates,
  stubMetrics,
  summarize,
  toForm,
  translate,
  yearRange,
} from "../dist/life-dashboard-year-card.js";
import { ENTRY, makeHass, sampleDays } from "./fixtures.mjs";

const NOON = Date.parse("2026-11-20T12:00:00Z");
const TODAY = "2026-11-20";

test("the version matches package.json and the changelog knows it or is unreleased", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.version, VERSION);
  const hacs = JSON.parse(readFileSync(new URL("../hacs.json", import.meta.url), "utf8"));
  assert.equal(hacs.filename, "life-dashboard-year-card.js");
});

test("every language has every text, with its placeholders", () => {
  assert.deepEqual(missingStrings(), []);
  for (const language of ["en", "nl", "de", "es", "fr", "it", "pt", "ja", "zh", "hi", "ar"]) {
    assert.match(translate(language, "daysAt", { value: "10,000" }), /10,000/);
    assert.match(translate(language, "startsOn", { date: "6 Oct" }), /6 Oct/);
    assert.match(translate(language, "missingBody", { entity: "sensor.x" }), /sensor\.x/);
    assert.match(translate(language, "rangeTo", { from: "A", to: "B" }), /A.*B/);
  }
  assert.equal(translate("nl-BE", "year"), "Jaar");
  assert.equal(translate("xx", "year"), "Year");
  assert.equal(translate("en", "nope"), "nope");
});

test("no text of the card holds a long dash", () => {
  const source = readFileSync(new URL("../dist/life-dashboard-year-card.js", import.meta.url), "utf8");
  assert.equal(/[–—]/.test(source), false);
});

test("day keys follow the time zone, and day arithmetic ignores daylight saving", () => {
  assert.equal(dayKey(Date.parse("2026-11-20T23:30:00Z"), "Europe/Amsterdam"), "2026-11-21");
  assert.equal(dayKey(Date.parse("2026-11-20T23:30:00Z"), "America/New_York"), "2026-11-20");
  assert.equal(dayKey(Date.parse("2026-11-20T23:30:00Z"), undefined), "2026-11-20");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("yearRange gives the calendar year, the last twelve months, and earlier pages", () => {
  assert.deepEqual(yearRange("calendar", 0, NOON, "Europe/Amsterdam"),
    { period: "calendar", start: "2026-01-01", end: "2026-12-31", today: TODAY, year: 2026 });
  assert.equal(yearRange("calendar", 2, NOON, "UTC").start, "2024-01-01");
  assert.deepEqual(yearRange("rolling", 0, NOON, "UTC"),
    { period: "rolling", start: "2025-11-21", end: TODAY, today: TODAY });
  assert.deepEqual(yearRange("rolling", 1, NOON, "UTC"),
    { period: "rolling", start: "2024-11-21", end: "2025-11-20", today: TODAY });
  // 29 February has no counterpart a year earlier.
  const leap = yearRange("rolling", 1, Date.parse("2028-02-29T12:00:00Z"), "UTC");
  assert.equal(leap.end, "2027-02-28");
  assert.equal(leap.start, "2026-03-01");
  assert.equal(yearRange("anything", -3, NOON, "UTC").period, "calendar");
  assert.equal(yearRange("calendar", -3, NOON, "UTC").year, 2026);
});

test("gridLayout puts every day in a week column and a weekday row", () => {
  const monday = gridLayout("2026-01-01", "2026-12-31", 1);
  assert.equal(monday.cells.length, 365);
  // 1 January 2026 is a Thursday: row 3 when the week starts on Monday, row 4 on Sunday.
  assert.deepEqual(monday.cells[0], { key: "2026-01-01", col: 0, row: 3 });
  assert.equal(gridLayout("2026-01-01", "2026-12-31", 0).cells[0].row, 4);
  assert.equal(monday.weeks, 53);
  assert.equal(monday.cells.at(-1).col, 52);
  assert.ok(monday.cells.every((cell) => cell.row >= 0 && cell.row < 7 && cell.col < monday.weeks));
  assert.equal(new Set(monday.cells.map((cell) => `${cell.col}:${cell.row}`)).size, 365);
  assert.equal(gridLayout("2028-01-01", "2028-12-31", 1).cells.length, 366);
});

test("gridLayout labels each month once, above the column of its first day", () => {
  const { months, cells } = gridLayout("2026-01-01", "2026-12-31", 1);
  assert.deepEqual(months.map((month) => month.month), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  for (const month of months) {
    const first = cells.find((cell) => cell.key === `2026-${String(month.month + 1).padStart(2, "0")}-01`);
    assert.equal(month.col, first.col);
  }
  // A range that starts mid-month names that month when the next label is far enough.
  const rolling = gridLayout("2025-11-05", "2026-11-04", 1);
  assert.deepEqual(rolling.months[0], { col: 0, month: 10, year: 2025 });
  assert.equal(rolling.months[1].month, 11);
  // And leaves it out when the next month starts within three columns.
  const late = gridLayout("2025-11-21", "2026-11-20", 1);
  assert.equal(late.months[0].month, 11);
  assert.ok(late.months.every((month) => month.col <= late.weeks - 2));
});

test("firstWeekday follows the profile, then the language", () => {
  assert.equal(firstWeekday({ locale: { first_weekday: "sunday" } }), 0);
  assert.equal(firstWeekday({ locale: { first_weekday: "saturday" } }), 6);
  assert.equal(firstWeekday({ locale: { first_weekday: "language", language: "nl" } }), 1);
  assert.equal(firstWeekday({ locale: { first_weekday: "language", language: "en-US" } }), 0);
  assert.equal(firstWeekday({ locale: { language: "not a tag" } }), 1);
  assert.equal(firstWeekday(undefined), 0);
});

test("parseThresholds takes a list or text, sorted and without what is no number", () => {
  assert.deepEqual(parseThresholds([10000, 4000, 7000]), [4000, 7000, 10000]);
  assert.deepEqual(parseThresholds("4000, 7000; 10000"), [4000, 7000, 10000]);
  assert.deepEqual(parseThresholds("6 7 8"), [6, 7, 8]);
  assert.deepEqual(parseThresholds(["0.5", "x", -2, 0.5, 1]), [0.5, 1]);
  assert.deepEqual(parseThresholds(8), [8]);
  assert.equal(parseThresholds(""), null);
  assert.equal(parseThresholds(undefined), null);
  assert.equal(parseThresholds({ a: 1 }), null);
  assert.equal(parseThresholds([1, 2, 3, 4, 5, 6, 7, 8]).length, 6);
});

test("autoThresholds takes round quartiles of the days above zero", () => {
  const values = Array.from({ length: 100 }, (_, index) => (index + 1) * 123);
  assert.deepEqual(autoThresholds(values), [3200, 6300, 9300]);
  assert.equal(autoThresholds([1, 2, 3]), null);
  assert.equal(autoThresholds([0, 0, 0, 0, 0]), null);
  assert.equal(autoThresholds([5, 5, 5, 5, 5]), null);
  assert.deepEqual(autoThresholds([0, 1, 1, 1, 2, 2, 2, 2]), [2]);
});

test("levelOf and levelShade turn a value into a step of the scale", () => {
  const cuts = [4000, 7000, 10000];
  assert.equal(levelOf(null, cuts), -1);
  assert.equal(levelOf(undefined, cuts), -1);
  assert.equal(levelOf(NaN, cuts), -1);
  assert.equal(levelOf(0, cuts), 0);
  assert.equal(levelOf(3999, cuts), 1);
  assert.equal(levelOf(4000, cuts), 2);
  assert.equal(levelOf(9999, cuts), 3);
  assert.equal(levelOf(25000, cuts), 4);
  assert.equal(levelOf(5, null), 1);
  assert.deepEqual([1, 2, 3, 4].map((level) => levelShade(level, 4)), [32, 55, 77, 100]);
  assert.equal(levelShade(0, 4), 0);
  assert.equal(levelShade(1, 1), 100);
  assert.equal(levelShade(9, 4), 100);
});

test("pickField reads a sum as the day's change and a measurement as its maximum", () => {
  assert.equal(pickField([{ change: 5, max: null }]), "change");
  assert.equal(pickField([{ change: null, max: 7, mean: 6 }]), "max");
  assert.equal(pickField([{ mean: 6 }]), "mean");
  assert.equal(pickField([]), "change");
  assert.equal(pickField([{ change: 5, max: 7 }], "max"), "max");
  assert.equal(pickField([{ change: 5 }], "sum"), "change");
  assert.equal(pickField([{ change: 5, mean: 2 }], "mean"), "mean");
  assert.equal(pickField([{ max: 5 }], "nonsense"), "max");
});

test("perDay lands each row on its own date and skips what is no number", () => {
  const rows = [
    { start: Date.parse("2026-11-18T23:00:00Z"), change: 7000 },
    { start: "2026-11-19T23:00:00Z", change: 8000 },
    { start: Date.parse("2026-11-20T23:00:00Z"), change: null },
    { start: "nonsense", change: 5 },
    { start: Date.parse("2026-11-21T23:00:00Z"), change: -40 },
  ];
  const days = perDay(rows, "change", "Europe/Amsterdam");
  assert.deepEqual([...days], [["2026-11-19", 7000], ["2026-11-20", 8000], ["2026-11-22", 0]]);
  // Summer time: the day starts at 22:00 UTC.
  assert.deepEqual([...perDay([{ start: Date.parse("2026-07-01T22:00:00Z"), mean: 71.5 }], "mean", "Europe/Amsterdam")],
    [["2026-07-02", 71.5]]);
  assert.equal(perDay(null, "change", "UTC").size, 0);
  assert.equal(perDay([{ start: 0, max: -3 }], "max", "UTC").get("1970-01-01"), -3);
});

test("fillZeros makes the days between a sum's first and last day zero", () => {
  const values = new Map([["2026-11-10", 5], ["2026-11-13", 2]]);
  assert.deepEqual([...fillZeros(values)].sort(), [["2026-11-10", 5], ["2026-11-11", 0], ["2026-11-12", 0], ["2026-11-13", 2]]);
  assert.equal(fillZeros(new Map()).size, 0);
  assert.equal(fillZeros(values).has("2026-11-09"), false);
  assert.equal(fillZeros(values).has("2026-11-14"), false);
});

test("summarize counts the days of the range up to today", () => {
  const range = { start: "2026-01-01", end: "2026-12-31", today: TODAY };
  const values = new Map([
    ["2025-12-31", 99999], ["2026-01-01", 4000], ["2026-06-01", 12000], ["2026-06-02", 0],
    ["2026-11-20", 8000], ["2026-11-21", 50000], ["2026-11-19", NaN],
  ]);
  const summary = summarize(values, range, 10000);
  assert.equal(summary.count, 4);
  assert.equal(summary.active, 3);
  assert.equal(summary.average, 6000);
  assert.deepEqual(summary.best, { key: "2026-06-01", value: 12000 });
  assert.equal(summary.reached, 1);
  assert.equal(summary.first, "2026-01-01");
  const empty = summarize(new Map(), range);
  assert.equal(empty.count, 0);
  assert.equal(empty.average, null);
  assert.equal(empty.best, null);
  // A page in the past ends at its own last day.
  assert.equal(summarize(values, { start: "2025-01-01", end: "2025-12-31", today: TODAY }).count, 1);
});

test("monthSummaries gives an average and a count per month, in order", () => {
  const range = { start: "2026-01-01", end: "2026-12-31", today: TODAY };
  const values = new Map([["2026-03-02", 4], ["2026-01-05", 10], ["2026-01-06", 20], ["2026-12-01", 5]]);
  assert.deepEqual(monthSummaries(values, range), [
    { month: "2026-01", count: 2, total: 30, average: 15 },
    { month: "2026-03", count: 1, total: 4, average: 4 },
  ]);
});

test("statisticCandidates names the history of a Life Dashboard sensor", () => {
  const entry = (key) => ({ platform: "life_dashboard", translation_key: key, config_entry_id: ENTRY });
  const prefix = `life_dashboard:${ENTRY.toLowerCase()}_`;
  assert.equal(statisticCandidates(entry("steps_today"))[0], `${prefix}steps`);
  assert.equal(statisticCandidates(entry("sleep_duration"))[0], `${prefix}sleep_minutes`);
  assert.equal(statisticCandidates(entry("screen_time_today"))[0], `${prefix}screen_time`);
  assert.equal(statisticCandidates(entry("exercise_today"))[0], `${prefix}exercise_minutes`);
  assert.ok(statisticCandidates(entry("weight")).includes(`${prefix}weight`));
  assert.ok(statisticCandidates(entry("mindfulness_today")).includes(`${prefix}mindfulness_minutes`));
  assert.deepEqual(statisticCandidates({ platform: "mobile_app", translation_key: "steps", config_entry_id: "x" }), []);
  assert.deepEqual(statisticCandidates(null), []);
});

test("kindOf recognizes steps, sleep, screen time and workouts by their id", () => {
  const prefix = `life_dashboard:${ENTRY.toLowerCase()}_`;
  assert.equal(kindOf(`${prefix}steps`), "steps");
  assert.equal(kindOf(`${prefix}sleep_minutes`), "sleep");
  assert.equal(kindOf(`${prefix}screen_time`), "screen");
  assert.equal(kindOf(`${prefix}exercise_minutes`), "workouts");
  assert.equal(kindOf(`${prefix}sleep_deep`), null);
  assert.equal(kindOf(`${prefix}weight`), null);
  assert.equal(kindOf("sensor.pixel_9_daily_steps"), "steps");
  assert.equal(kindOf("sensor.fitbit_steps_today"), "steps");
  assert.equal(kindOf("sensor.garmin_sleep_duration"), "sleep");
  assert.equal(kindOf("sensor.withings_deep_sleep"), null);
  assert.equal(kindOf("sensor.phone_screen_time"), "screen");
  assert.equal(kindOf("sensor.scale_weight"), null);
  assert.equal(kindOf(undefined), null);
});

test("defaultThresholds come in the statistic's own unit", () => {
  assert.deepEqual(defaultThresholds("steps", "steps"), [4000, 7000, 10000]);
  assert.deepEqual(defaultThresholds("sleep", "h"), [6, 7, 8]);
  assert.deepEqual(defaultThresholds("sleep", "min"), [360, 420, 480]);
  assert.deepEqual(defaultThresholds("screen", "s"), [7200, 10800, 14400]);
  assert.equal(defaultThresholds("sleep", "%"), null);
  assert.equal(defaultThresholds("steps", "km"), null);
  assert.equal(defaultThresholds(null, "kg"), null);
});

test("readMetrics takes the list, the shorthand, and drops what names no sensor", () => {
  assert.deepEqual(readMetrics({ entity: "sensor.steps" }), [
    { entity: "sensor.steps", statistic: null, name: null, color: null, thresholds: null, aggregate: "auto" },
  ]);
  const metrics = readMetrics({ metrics: [
    "sensor.a",
    { entity: " sensor.b ", name: " Sleep ", color: "#8f7ff7", thresholds: "6,7,8", aggregate: "mean" },
    { statistic: "life_dashboard:x_steps", aggregate: "nonsense", color: "url(javascript:1)" },
    { name: "nothing" }, null, 5,
  ] });
  assert.equal(metrics.length, 3);
  assert.equal(metrics[0].entity, "sensor.a");
  assert.deepEqual(metrics[1], { entity: "sensor.b", statistic: null, name: "Sleep", color: "#8f7ff7", thresholds: [6, 7, 8], aggregate: "mean" });
  assert.equal(metrics[2].statistic, "life_dashboard:x_steps");
  assert.equal(metrics[2].aggregate, "auto");
  assert.equal(metrics[2].color, null);
  assert.deepEqual(readMetrics({}), []);
  assert.deepEqual(readMetrics({ metrics: "sensor.a" }), []);
  assert.equal(readMetrics({ metrics: Array.from({ length: 20 }, (_, i) => `sensor.s${i}`) }).length, 8);
});

test("cssColor lets a color through and nothing else", () => {
  assert.equal(cssColor("#30b77e"), "#30b77e");
  assert.equal(cssColor("teal"), "teal");
  assert.equal(cssColor("rgb(48, 183, 126)"), "rgb(48, 183, 126)");
  assert.equal(cssColor("var(--primary-color)"), "var(--primary-color)");
  assert.equal(cssColor([48, 183, 126]), "#30b77e");
  assert.equal(cssColor([300, -4, 12.4]), "#ff000c");
  assert.equal(cssColor("red; background: url(x)"), null);
  assert.equal(cssColor("url(https://example.com/x)"), null);
  assert.equal(cssColor("expression(alert(1))"), null);
  assert.equal(cssColor(7), null);
  assert.deepEqual(hexToRgb("#30b77e"), [48, 183, 126]);
  assert.equal(hexToRgb("teal"), null);
  assert.equal(metricColor({ color: "#111111" }, "steps", 0), "#111111");
  assert.match(metricColor({ color: null }, "sleep", 0), /--life-dashboard-year-sleep/);
  assert.notEqual(metricColor({ color: null }, null, 0), metricColor({ color: null }, null, 1));
});

test("values read as durations, counts and measurements", () => {
  assert.equal(formatDuration(196, "en"), "3h 16m");
  assert.equal(formatDuration(120, "en"), "2h");
  assert.equal(formatDuration(0, "en"), "0m");
  assert.equal(formatDuration(-1, "en"), "");
  assert.equal(formatValue(7.25, "h", "en"), "7h 15m");
  assert.equal(formatValue(435, "min", "en"), "7h 15m");
  assert.equal(formatValue(11450, "steps", "en"), "11,450 steps");
  assert.equal(formatValue(11450, "steps", "nl"), "11.450 steps");
  assert.equal(formatValue(11450.4, "steps", "en", { bare: true }), "11,450");
  assert.equal(formatValue(10000, "steps", "en-US", { compact: true }), "10K");
  assert.equal(formatValue(74.26, "kg", "en"), "74.3 kg");
  assert.equal(formatValue(4.257, "km", "en"), "4.26 km");
  assert.equal(formatValue(97.5, "%", "en"), "97.5%");
  assert.equal(formatValue(42, null, "en"), "42");
  assert.equal(formatValue(null, "kg", "en"), "");
  assert.equal(formatValue(8, "h", "en", { compact: true }), "8h");
});

test("rangeLabel names the year or the twelve months, without a dash", () => {
  assert.equal(rangeLabel(yearRange("calendar", 0, NOON, "UTC"), "en"), "2026");
  assert.equal(rangeLabel(yearRange("rolling", 0, NOON, "UTC"), "en"), "Nov 2025 to Nov 2026");
  assert.equal(rangeLabel(yearRange("rolling", 0, NOON, "UTC"), "nl"), "nov 2025 tot nov 2026");
});

test("stubMetrics starts from Life Dashboard's sensors, else from a step sensor", () => {
  assert.deepEqual(stubMetrics(makeHass({ today: TODAY })).map((metric) => metric.entity), [
    "sensor.sams_pixel_steps_today", "sensor.sams_pixel_last_sleep_duration",
    "sensor.sams_pixel_screen_time_today", "sensor.sams_pixel_exercise_today",
  ]);
  assert.deepEqual(stubMetrics(makeHass({ today: TODAY, app: false })), [{ entity: "sensor.sams_pixel_daily_steps" }]);
  assert.deepEqual(stubMetrics({ states: {}, entities: {} }), []);
  assert.deepEqual(stubMetrics(undefined), []);
});

test("a Life Dashboard sensor resolves to the phone's history, any other to itself", async () => {
  const hass = makeHass({ today: TODAY });
  const steps = await resolveMetric(hass, { entity: "sensor.sams_pixel_steps_today" });
  assert.equal(steps.id, `life_dashboard:${ENTRY.toLowerCase()}_steps`);
  assert.equal(steps.unit, "steps");
  assert.equal(steps.external, true);
  const plain = await resolveMetric(hass, { entity: "sensor.sams_pixel_daily_steps" });
  assert.equal(plain.id, "sensor.sams_pixel_daily_steps");
  assert.equal(plain.external, false);
  assert.equal(hass.calls.filter((call) => call.type === "config/entity_registry/get").length, 1);
  const none = await resolveMetric(hass, { entity: "sensor.no_statistics" });
  assert.deepEqual([none.id, none.found], ["sensor.no_statistics", false]);
  const direct = await resolveMetric(hass, { statistic: `life_dashboard:${ENTRY.toLowerCase()}_sleep_minutes` });
  assert.equal(direct.unit, "h");
});

test("loadRange reads a year in one request and gives a value per day", async () => {
  const hass = makeHass({ today: TODAY });
  const range = yearRange("calendar", 0, NOON, "Europe/Amsterdam");
  const metrics = readMetrics({ metrics: [
    "sensor.sams_pixel_steps_today", "sensor.sams_pixel_exercise_today", "sensor.sams_pixel_screen_time_today",
    "sensor.scale_weight", "sensor.no_statistics",
  ] });
  const [steps, workouts, screen, weight, none] = await loadRange(hass, metrics, range, "Europe/Amsterdam");
  const requests = hass.calls.filter((call) => call.type === "recorder/statistics_during_period");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].period, "day");
  assert.equal(requests[0].statistic_ids.length, 4);

  const days = new Map(sampleDays(TODAY).map((day) => [day.key, day]));
  assert.equal(steps.field, "change");
  assert.equal(steps.values.get("2026-08-10"), days.get("2026-08-10").steps);
  assert.equal(steps.values.get(TODAY), days.get(TODAY).steps);
  assert.equal(summarize(steps.values, range).count, 324);
  // A day without a workout has no row; between the first and the last it is zero.
  const rest = [...days.values()].find((day) => day.key > "2026-02-01" && day.workout === 0);
  assert.equal(workouts.values.get(rest.key), 0);
  assert.equal(workouts.values.get("2026-01-01"), days.get("2026-01-01").workout);
  // Screen time only goes back as far as the phone sent it.
  assert.equal(summarize(screen.values, range).first, addDays(TODAY, -63));
  assert.equal(weight.field, "max");
  assert.ok(Math.abs(weight.values.get(TODAY) - days.get(TODAY).weight - 0.2) < 1e-9);
  assert.equal(none.found, false);
  assert.equal(none.values.size, 0);

  // The same page again within the quarter of an hour asks nothing new.
  await loadRange(hass, metrics, range, "Europe/Amsterdam");
  assert.equal(hass.calls.filter((call) => call.type === "recorder/statistics_during_period").length, 1);
  // An earlier page is a new request, and the aggregate decides the field.
  const earlier = yearRange("calendar", 1, NOON, "Europe/Amsterdam");
  const [mean] = await loadRange(hass, readMetrics({ metrics: [{ entity: "sensor.scale_weight", aggregate: "mean" }] }), earlier, "Europe/Amsterdam");
  assert.equal(mean.field, "mean");
  assert.equal(summarize(mean.values, earlier).count, 0);
});

test("without the app a plain sensor starts on the day it was added", async () => {
  const hass = makeHass({ today: TODAY, app: false });
  const range = yearRange("rolling", 0, NOON, "Europe/Amsterdam");
  const [steps] = await loadRange(hass, readMetrics({ entity: "sensor.sams_pixel_daily_steps" }), range, "Europe/Amsterdam");
  const summary = summarize(steps.values, range);
  assert.equal(summary.count, 45);
  assert.equal(summary.first, addDays(TODAY, -44));
});

test("the editor's form and the YAML convert both ways", () => {
  const config = {
    type: "custom:life-dashboard-year-card",
    metrics: [
      { entity: "sensor.steps", thresholds: [4000, 7000, 10000], color: "#30b77e" },
      { entity: "sensor.sleep", color: "var(--accent-color)" },
      "sensor.plain",
    ],
  };
  const form = toForm(config);
  assert.equal(form.metrics[0].thresholds, "4000, 7000, 10000");
  assert.deepEqual(form.metrics[0].color, [48, 183, 126]);
  assert.equal("color" in form.metrics[1], false);
  assert.deepEqual(form.metrics[2], { entity: "sensor.plain" });

  const back = fromForm({ ...form, title: "", period: "calendar", layout: "rows" }, config);
  assert.deepEqual(back, {
    type: "custom:life-dashboard-year-card",
    layout: "rows",
    metrics: [
      { entity: "sensor.steps", thresholds: [4000, 7000, 10000], color: "#30b77e" },
      { entity: "sensor.sleep", color: "var(--accent-color)" },
      { entity: "sensor.plain" },
    ],
  });
  assert.deepEqual(toForm({ entity: "sensor.steps" }).metrics, [{ entity: "sensor.steps" }]);
  assert.deepEqual(fromForm({ metrics: [{ entity: "sensor.a", thresholds: "x", aggregate: "auto", name: "" }], period: "rolling" }),
    { metrics: [{ entity: "sensor.a" }], period: "rolling" });
});
