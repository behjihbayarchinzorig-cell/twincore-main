// The weather in Ulaanbaatar right now, for the front page's live district (Open-Meteo, free, no key). Fetched here on
// the server and cached for ten minutes, so visitors' browsers never call the weather service themselves.

export const revalidate = 600;

const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=47.92&longitude=106.92' +
  '&current=temperature_2m,weather_code,cloud_cover,precipitation,snowfall,is_day&daily=snow_depth_max&forecast_days=1&timezone=Asia%2FUlaanbaatar';

export type LiveWeather = {
  kind: 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';
  temp: number; // °C
  cloud: number; // 0..1 sky covered
  rain: number; // 0..1 how hard it rains
  snow: number; // 0..1 how hard it snows
  fog: number; // 0..1
  cover: number; // 0..1 snow lying on the ground
  time: string; // local time of the reading
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export async function GET() {
  try {
    const r = await fetch(URL, { next: { revalidate } });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const c = d.current;
    const code: number = c.weather_code;
    // WMO weather codes: 0–3 clear to overcast, 45/48 fog, 51–67 drizzle and rain, 71–77 snow, 80–82 showers,
    // 85–86 snow showers, 95–99 thunderstorms
    const snowy = (code >= 71 && code <= 77) || code === 85 || code === 86;
    const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    const foggy = code === 45 || code === 48;
    const heavy = [65, 67, 75, 82, 86, 97, 99].includes(code) ? 1 : [63, 73, 81, 96].includes(code) ? 0.75 : 0.5;
    const depth: number = d.daily?.snow_depth_max?.[0] ?? 0;
    const w: LiveWeather = {
      kind: code >= 95 ? 'storm' : snowy ? 'snow' : rainy ? 'rain' : foggy ? 'fog' : c.cloud_cover > 60 ? 'cloudy' : 'clear',
      temp: Math.round(c.temperature_2m),
      cloud: clamp01(c.cloud_cover / 100),
      rain: rainy ? Math.max(heavy, clamp01(c.precipitation / 3)) : 0,
      snow: snowy ? Math.max(heavy, clamp01(c.snowfall / 2)) : 0,
      fog: foggy ? 1 : 0,
      cover: snowy ? 1 : clamp01((depth - 0.01) / 0.05),
      time: c.time,
    };
    return Response.json(w, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } });
  } catch {
    return Response.json(null, { status: 503 });
  }
}
