async function fetchRange(key, start, end) {
  const url = `http://openapi.seoul.go.kr:8088/${key}/json/bikeList/${start}/${end}/`;
  const r = await fetch(url);
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { parseError: String(e), raw: text.slice(0, 500) };
  }
}

export default async function handler(req, res) {
  const key = process.env.SEOUL_BIKE_API_KEY || process.env.SEOUL_BIKE_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'SEOUL_BIKE_API_KEY is not set in Vercel Environment Variables.' });
  }

  const ranges = [[1, 1000], [1001, 2000], [2001, 3000], [3001, 4000]];
  const rows = [];
  const errors = [];

  for (const [start, end] of ranges) {
    try {
      const j = await fetchRange(key, start, end);
      if (j.rentBikeStatus?.row) rows.push(...j.rentBikeStatus.row);
      else if (j.row) rows.push(...j.row);
      else if (j.RESULT) errors.push({ range: `${start}-${end}`, result: j.RESULT });
      else errors.push({ range: `${start}-${end}`, result: j });
    } catch (err) {
      errors.push({ range: `${start}-${end}`, error: String(err && err.message ? err.message : err) });
    }
  }

  if (rows.length) return res.status(200).json({ ok: true, rows, count: rows.length });
  return res.status(500).json({ ok: false, error: 'Seoul Bike API returned no rows.', details: errors });
}
