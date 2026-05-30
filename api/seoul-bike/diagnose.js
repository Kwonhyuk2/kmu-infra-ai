export default async function handler(req, res) {
  const key = process.env.SEOUL_BIKE_API_KEY || process.env.SEOUL_BIKE_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'SEOUL_BIKE_API_KEY is not set in Vercel Environment Variables.' });
  }
  try {
    const url = `http://openapi.seoul.go.kr:8088/${key}/json/bikeList/1/5/`;
    const r = await fetch(url);
    const text = await r.text();
    let sample;
    try { sample = JSON.parse(text); } catch { sample = text.slice(0, 500); }
    return res.status(r.status).json({ ok: r.ok, status: r.status, sample });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
