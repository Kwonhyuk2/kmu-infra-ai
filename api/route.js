// openrouteservice(독일 호스팅) 경로 계산 프록시.
// 출발지가 국민대로 고정이라 목적지 좌표별로 응답이 결정되므로 엣지에 24시간 캐싱한다.
// GET으로 받아야 Vercel 엣지 캐시가 동작하므로 upstream POST를 여기서 감싼다.
const KMU = { lng: 126.99762, lat: 37.61095 };
// TODO: Vercel 환경변수 ORS_API_KEY 설정 후 fallback 키는 제거할 것.
const ORS_FALLBACK_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImYyOTIwYjE3Mjg2MjQ0MzI4MGUxY2ZmYTgwMmY5MTRlIiwiaCI6Im11cm11cjY0In0=';
const PROFILES = new Set(['foot-walking', 'driving-car']);

export default async function handler(req, res) {
  const key = process.env.ORS_API_KEY || ORS_FALLBACK_KEY;
  const urlObj = new URL(req.url, `https://${req.headers.host}`);
  const profile = urlObj.searchParams.get('profile');
  const lng = parseFloat(urlObj.searchParams.get('lng') || '');
  const lat = parseFloat(urlObj.searchParams.get('lat') || '');

  if (!PROFILES.has(profile) || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return res.status(400).json({ ok: false, error: 'Invalid params. Expect profile=foot-walking|driving-car&lng=&lat=' });
  }

  try {
    const upstream = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
      method: 'POST',
      headers: {
        Authorization: key,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/geo+json'
      },
      body: JSON.stringify({
        coordinates: [[KMU.lng, KMU.lat], [lng, lat]],
        instructions: false,
        units: 'm'
      })
    });

    if (!upstream.ok) {
      const t = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({ ok: false, error: `ORS ${upstream.status}: ${t.slice(0, 200)}` });
    }

    const j = await upstream.json();
    const f = j.features && j.features[0];
    if (!f || !f.properties || !f.properties.summary) {
      return res.status(502).json({ ok: false, error: 'no ORS route' });
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({
      ok: true,
      distance: f.properties.summary.distance,
      duration: f.properties.summary.duration,
      geometry: { coordinates: f.geometry.coordinates }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
