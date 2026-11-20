// Sample data for the tests, the harness and the screenshots: made-up phones, generated
// from a fixed seed. Nothing in here was ever measured on a person.

const DAY = 86400000;
export const ENTRY = "01TESTENTRY0000000000000AB";
const PREFIX = `life_dashboard:${ENTRY.toLowerCase()}_`;

function rng(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const keyOf = (time) => new Date(time).toISOString().slice(0, 10);
const timeOf = (key) => Date.parse(`${key}T00:00:00Z`);

/** `count` days ending on `today`, each with steps, hours of sleep, screen time and exercise. */
export function sampleDays(today, count = 800) {
  const random = rng(20261120);
  const end = timeOf(today);
  const days = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const time = end - back * DAY;
    const date = new Date(time);
    const weekday = date.getUTCDay();
    const dayOfYear = Math.round((time - Date.UTC(date.getUTCFullYear(), 0, 1)) / DAY);
    const season = Math.sin((2 * Math.PI * (dayOfYear - 100)) / 365);
    let steps = (7600 + 2300 * season) * (weekday === 6 ? 1.25 : weekday === 0 ? 0.85 : 1) * (0.65 + random() * 0.7);
    if (random() < 0.04) steps = 1500 + random() * 1800;
    // Two weeks of walking holiday in August.
    if (date.getUTCMonth() === 7 && date.getUTCDate() >= 3 && date.getUTCDate() <= 14) steps = 12500 + random() * 6000;
    const sleep = 7.15 + (weekday === 6 || weekday === 0 ? 0.6 : 0) + (random() - 0.5) * 1.7;
    const screen = Math.max(0.6, 3.25 + (weekday === 6 || weekday === 0 ? 0.75 : 0) + (random() - 0.5) * 2.2);
    let workout = 0;
    if ((weekday === 2 || weekday === 4 || weekday === 6) && random() < 0.75) workout = (28 + random() * 55) / 60;
    else if (random() < 0.08) workout = (20 + random() * 30) / 60;
    days.push({ key: keyOf(time), steps: Math.round(steps), sleep, screen, workout, weight: 74 + season * 1.2 + (random() - 0.5) * 0.8 });
  }
  return days;
}

// Rows as the recorder returns them for the period `day`, cut at midnight in a zone an
// hour east of UTC: the card has to put each on its own date all the same.
function sumRows(days, pick) {
  let sum = 0;
  return days.filter((day) => pick(day) > 0).map((day) => {
    const value = pick(day);
    sum += value;
    const start = timeOf(day.key) - 3600000;
    return { start, end: start + DAY, change: value, state: value, sum, max: null, mean: null, min: null };
  });
}

function meanRows(days, pick) {
  return days.map((day) => {
    const value = pick(day);
    const start = timeOf(day.key) - 3600000;
    return { start, end: start + DAY, change: null, state: null, sum: null, max: value + 0.2, mean: value, min: value - 0.2 };
  });
}

/**
 * A Home Assistant with one made-up phone. `app: true` has the Life Dashboard integration,
 * with a year of history for what comes from Health Connect and two months of screen time;
 * `app: false` has a plain step sensor that was added 45 days ago.
 */
export function makeHass({ today, app = true, language = "en-GB", firstWeekday = "language", timeZone = "Europe/Amsterdam" } = {}) {
  const days = sampleDays(today);
  const recent = (count) => days.slice(-count);
  const statistics = {
    [`${PREFIX}steps`]: { unit: "steps", has_sum: true, name: "Sam's Pixel steps", rows: sumRows(days, (day) => day.steps) },
    [`${PREFIX}sleep_minutes`]: { unit: "h", has_sum: true, name: "Sam's Pixel sleep", rows: sumRows(days, (day) => day.sleep) },
    [`${PREFIX}exercise_minutes`]: { unit: "h", has_sum: true, name: "Sam's Pixel exercise", rows: sumRows(days, (day) => day.workout) },
    [`${PREFIX}screen_time`]: { unit: "h", has_sum: true, name: "Sam's Pixel screen time", rows: sumRows(recent(64), (day) => day.screen) },
    "sensor.sams_pixel_daily_steps": { unit: "steps", has_sum: true, name: null, rows: sumRows(recent(45), (day) => day.steps) },
    "sensor.scale_weight": { unit: "kg", has_sum: false, name: null, rows: meanRows(recent(300), (day) => day.weight) },
  };
  const ours = (id, key) => ({ entity_id: id, platform: "life_dashboard", translation_key: key, device_id: "pixel", config_entry_id: ENTRY });
  const registry = {
    "sensor.sams_pixel_steps_today": ours("sensor.sams_pixel_steps_today", "steps_today"),
    "sensor.sams_pixel_last_sleep_duration": ours("sensor.sams_pixel_last_sleep_duration", "sleep_duration"),
    "sensor.sams_pixel_screen_time_today": ours("sensor.sams_pixel_screen_time_today", "screen_time_today"),
    "sensor.sams_pixel_exercise_today": ours("sensor.sams_pixel_exercise_today", "exercise_today"),
    "sensor.sams_pixel_daily_steps": { entity_id: "sensor.sams_pixel_daily_steps", platform: "mobile_app", device_id: "pixel2" },
    "sensor.scale_weight": { entity_id: "sensor.scale_weight", platform: "withings", device_id: "scale" },
    "sensor.no_statistics": { entity_id: "sensor.no_statistics", platform: "template" },
  };
  if (!app) for (const id of Object.keys(registry)) if (registry[id].platform === "life_dashboard") delete registry[id];
  const state = (id, value, attributes) => ({ entity_id: id, state: String(value), attributes });
  const states = {
    "sensor.sams_pixel_steps_today": state("sensor.sams_pixel_steps_today", 7842, { friendly_name: "Sam's Pixel Steps today", unit_of_measurement: "steps", state_class: "total" }),
    "sensor.sams_pixel_last_sleep_duration": state("sensor.sams_pixel_last_sleep_duration", 7.2, { friendly_name: "Sam's Pixel Last sleep duration", unit_of_measurement: "h" }),
    "sensor.sams_pixel_screen_time_today": state("sensor.sams_pixel_screen_time_today", 3.1, { friendly_name: "Sam's Pixel Screen time today", unit_of_measurement: "h" }),
    "sensor.sams_pixel_exercise_today": state("sensor.sams_pixel_exercise_today", 0.6, { friendly_name: "Sam's Pixel Exercise today", unit_of_measurement: "h" }),
    "sensor.sams_pixel_daily_steps": state("sensor.sams_pixel_daily_steps", 7842, { friendly_name: "Sam's Pixel Daily steps", unit_of_measurement: "steps", state_class: "total_increasing" }),
    "sensor.scale_weight": state("sensor.scale_weight", 74.2, { friendly_name: "Scale Weight", unit_of_measurement: "kg", state_class: "measurement" }),
    "sensor.no_statistics": state("sensor.no_statistics", "hello", { friendly_name: "No statistics" }),
  };
  for (const id of Object.keys(states)) if (!registry[id]) delete states[id];
  const calls = [];
  return {
    states,
    entities: registry,
    language,
    locale: { language, time_zone: "server", first_weekday: firstWeekday, number_format: "language", date_format: "language" },
    config: { time_zone: timeZone },
    calls,
    async callWS(message) {
      calls.push(message);
      if (message.type === "config/entity_registry/get") {
        if (!registry[message.entity_id]) throw new Error("not found");
        return registry[message.entity_id];
      }
      if (message.type === "recorder/get_statistics_metadata") {
        return message.statistic_ids.filter((id) => statistics[id] && (app || !id.includes(":"))).map((id) => ({
          statistic_id: id,
          statistics_unit_of_measurement: statistics[id].unit,
          has_sum: statistics[id].has_sum,
          name: statistics[id].name,
          source: id.includes(":") ? "life_dashboard" : "recorder",
        }));
      }
      if (message.type === "recorder/statistics_during_period") {
        const from = Date.parse(message.start_time);
        const to = message.end_time ? Date.parse(message.end_time) : Infinity;
        const out = {};
        for (const id of message.statistic_ids) {
          const rows = (statistics[id]?.rows ?? []).filter((row) => row.start >= from && row.start < to);
          if (rows.length) out[id] = rows;
        }
        return out;
      }
      throw new Error(`unexpected ${message.type}`);
    },
  };
}
