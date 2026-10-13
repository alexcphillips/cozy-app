import type { GeoFarmWeather } from "@cozy/shared/geo";
import type { FarmingConfig } from "../content/models";

/**
 * Real local weather for farms, from Open-Meteo (free, no key).
 *
 * A farm's weather comes from its home region: a coarse grid square
 * (`config.weather.regionDegrees`, ~50 km), so no precise location is
 * stored or sent. One fetch per region per hour serves every farm in it.
 * Each Farm Turn takes the weather of the 12 hours it came in over,
 * summed up as one game weather. When the API can't answer, or a period is
 * past what it returned, the farm's seeded placeholder roll stands in.
 *
 * PLACEHOLDER: the cache is in memory, so a restart fetches again. Fine for
 * one server; the Cloudflare plan keeps it in the World Durable Object.
 */

/** Turns a period's start (ms) into its weather. */
export type WeatherLookup = (periodStart: number) => GeoFarmWeather;

/** One hour of a region's weather. */
export type WeatherHour = { temperature: number; precipitation: number; cloudCover: number; code: number };

/** A region's hours, keyed by the hour's start (ms). */
export type RegionWeather = Map<number, WeatherHour>;

const HOUR_MS = 3_600_000;
const CACHE_MS = HOUR_MS;
/** After a failed fetch, wait this long before asking again. */
const RETRY_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 3000;

/** The region's grid square, as its centre. */
export function toRegion(latitude: number, longitude: number, config: FarmingConfig): { latitude: number; longitude: number } {
    const step = config.weather.regionDegrees;
    // `+ 0` turns a -0 into 0, so the same square always has the same key.
    const snap = (value: number) => Math.round(Math.round(value / step) * step * 1000) / 1000 + 0;
    return { latitude: snap(latitude), longitude: snap(longitude) };
}

export const regionKey = (region: { latitude: number; longitude: number }) => `${region.latitude},${region.longitude}`;

/**
 * A period's hours as one game weather, the most dramatic first: a
 * thunderstorm, a frost, a heatwave, real rain, heavy cloud, else clear.
 */
export function classify(hours: WeatherHour[], config: FarmingConfig): GeoFarmWeather {
    const { heatwaveC, frostC, rainMm, overcastCloud } = config.weather;
    if (hours.some((hour) => hour.code >= 95)) return "storm";
    if (Math.min(...hours.map((hour) => hour.temperature)) <= frostC) return "frost";
    if (Math.max(...hours.map((hour) => hour.temperature)) >= heatwaveC) return "heatwave";
    if (hours.reduce((sum, hour) => sum + hour.precipitation, 0) >= rainMm) return "rain";
    if (hours.reduce((sum, hour) => sum + hour.cloudCover, 0) / hours.length >= overcastCloud) return "overcast";
    return "clear";
}

/** A lookup over a region's hours, falling back to `fallback` for any period it doesn't fully cover. */
export function realLookup(weather: RegionWeather, config: FarmingConfig, fallback: WeatherLookup): WeatherLookup {
    const periodHours = Math.round(config.turnHours);
    return (periodStart) => {
        const first = Math.floor(periodStart / HOUR_MS) * HOUR_MS;
        const hours: WeatherHour[] = [];
        for (let i = 0; i < periodHours; i++) {
            const hour = weather.get(first + i * HOUR_MS);
            if (!hour) return fallback(periodStart);
            hours.push(hour);
        }
        return classify(hours, config);
    };
}

type OpenMeteoResponse = {
    hourly?: {
        time: number[];
        temperature_2m: (number | null)[];
        precipitation: (number | null)[];
        cloud_cover: (number | null)[];
        weather_code: (number | null)[];
    };
};

/** Open-Meteo's hourly answer as a region's hours. Hours with a gap are left out. */
export function parseOpenMeteo(body: OpenMeteoResponse): RegionWeather {
    const hours: RegionWeather = new Map();
    const hourly = body.hourly;
    if (!hourly) return hours;
    for (const [i, time] of hourly.time.entries()) {
        const temperature = hourly.temperature_2m[i];
        const precipitation = hourly.precipitation[i];
        const cloudCover = hourly.cloud_cover[i];
        const code = hourly.weather_code[i];
        if (temperature == null || precipitation == null || cloudCover == null || code == null) continue;
        hours.set(time * 1000, { temperature, precipitation, cloudCover, code });
    }
    return hours;
}

const cache = new Map<string, { at: number; weather: RegionWeather | null; pending?: Promise<RegionWeather | null> }>();

async function fetchRegion(region: { latitude: number; longitude: number }): Promise<RegionWeather | null> {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
        latitude: String(region.latitude),
        longitude: String(region.longitude),
        hourly: "temperature_2m,precipitation,cloud_cover,weather_code",
        // Banked turns reach back at most 48 hours; Read the Sky looks 36 ahead.
        past_days: "3",
        forecast_days: "3",
        timezone: "UTC",
        timeformat: "unixtime",
    }).toString();
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!response.ok) return null;
        const hours = parseOpenMeteo((await response.json()) as OpenMeteoResponse);
        return hours.size > 0 ? hours : null;
    } catch {
        return null;
    }
}

/** A region's hours, from the cache or a fresh fetch. Null while the API can't be reached. */
export async function regionWeather(region: { latitude: number; longitude: number }, now = Date.now()): Promise<RegionWeather | null> {
    const key = regionKey(region);
    const cached = cache.get(key);
    if (cached?.pending) return cached.pending;
    if (cached && now - cached.at < (cached.weather ? CACHE_MS : RETRY_MS)) return cached.weather;

    const pending = fetchRegion(region);
    cache.set(key, { at: now, weather: cached?.weather ?? null, pending });
    const weather = await pending;
    cache.set(key, { at: now, weather: weather ?? cached?.weather ?? null });
    return weather ?? cached?.weather ?? null;
}
