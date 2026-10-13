import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FARMING } from "../content";
import { classify, parseOpenMeteo, realLookup, toRegion, type WeatherHour } from "./weather";

const HOUR = 3_600_000;
const hours = (overrides: Partial<WeatherHour>, count = 12): WeatherHour[] =>
    Array.from({ length: count }, () => ({ temperature: 15, precipitation: 0, cloudCover: 20, code: 1, ...overrides }));

describe("weather", () => {
    it("sums up a period, the most dramatic first", () => {
        assert.equal(classify(hours({}), FARMING), "clear");
        assert.equal(classify(hours({ cloudCover: 90 }), FARMING), "overcast");
        assert.equal(classify(hours({ precipitation: 0.5, cloudCover: 90 }), FARMING), "rain");
        assert.equal(classify(hours({ temperature: 31, precipitation: 0.5 }), FARMING), "heatwave");
        assert.equal(classify(hours({ temperature: -2, precipitation: 0.5 }), FARMING), "frost");
        assert.equal(classify([...hours({ temperature: -2 }, 11), { temperature: 5, precipitation: 3, cloudCover: 100, code: 95 }], FARMING), "storm");
    });

    it("looks a period up from the hours, and falls back where they run out", () => {
        const start = Date.UTC(2026, 9, 13, 0);
        const weather = new Map(hours({ cloudCover: 95 }).map((hour, i) => [start + i * HOUR, hour]));
        const lookup = realLookup(weather, FARMING, () => "heatwave");
        assert.equal(lookup(start), "overcast");
        assert.equal(lookup(start + HOUR), "heatwave", "the 12th hour is missing");
    });

    it("reads Open-Meteo's hourly answer, skipping gaps", () => {
        const parsed = parseOpenMeteo({
            hourly: { time: [0, 3600], temperature_2m: [10, null], precipitation: [0, 0], cloud_cover: [50, 50], weather_code: [2, 2] },
        });
        assert.deepEqual([...parsed.keys()], [0]);
    });

    it("snaps a place to its region's grid square", () => {
        assert.deepEqual(toRegion(51.26, -0.24, FARMING), { latitude: 51.5, longitude: 0 });
        assert.deepEqual(toRegion(-33.87, 151.21, FARMING), { latitude: -34, longitude: 151 });
    });
});
