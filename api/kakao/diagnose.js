export default async function handler(req, res) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'KAKAO_REST_API_KEY is not set in Vercel Environment Variables.' });
  }

  const params = new URLSearchParams({
    query: '국민대학교 카페',
    x: '126.99855',
    y: '37.60925',
    radius: '2100',
    size: '3',
    sort: 'distance'
  });

  try {
    const upstream = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
      headers: { Authorization: `KakaoAK ${key}` }
    });
    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return res.status(upstream.status).json({ ok: upstream.ok, status: upstream.status, sample: json });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
