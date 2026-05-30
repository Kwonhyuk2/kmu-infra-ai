export default async function handler(req, res) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'KAKAO_REST_API_KEY is not set in Vercel Environment Variables.' });
  }

  const pathParam = req.query.path;
  const path = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam || '');
  const allowed = new Set(['search/category', 'search/keyword', 'search/address', 'geo/coord2address']);
  if (!allowed.has(path)) {
    return res.status(400).json({ ok: false, error: 'Unsupported Kakao Local API path.' });
  }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue;
    if (Array.isArray(v)) v.forEach(x => params.append(k, x));
    else if (v !== undefined) params.set(k, v);
  }

  const url = `https://dapi.kakao.com/v2/local/${path}.json?${params.toString()}`;
  try {
    const upstream = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
