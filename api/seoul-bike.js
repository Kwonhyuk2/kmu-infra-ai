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

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default async function handler(req, res) {
  const key = process.env.SEOUL_BIKE_API_KEY || process.env.SEOUL_BIKE_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'SEOUL_BIKE_API_KEY is not set in Vercel Environment Variables.' });
  }

  const urlObj = new URL(req.url, `https://${req.headers.host}`);
  const lat = parseFloat(urlObj.searchParams.get('lat') || '');
  const lng = parseFloat(urlObj.searchParams.get('lng') || '');
  const radius = parseFloat(urlObj.searchParams.get('radius') || '0');
  const filterByRadius = radius > 0 && Number.isFinite(lat) && Number.isFinite(lng);

  const ranges = [[1, 1000], [1001, 2000], [2001, 3000], [3001, 4000]];
  const errors = [];

  const results = await Promise.all(ranges.map(([start, end]) =>
    fetchRange(key, start, end).catch(err => ({
      fetchError: String(err && err.message ? err.message : err), range: `${start}-${end}`
    }))
  ));

  let rows = [];
  results.forEach((j, i) => {
    const [start, end] = ranges[i];
    if (j.fetchError) errors.push({ range: j.range, error: j.fetchError });
    else if (j.rentBikeStatus?.row) rows.push(...j.rentBikeStatus.row);
    else if (j.row) rows.push(...j.row);
    else if (j.RESULT) errors.push({ range: `${start}-${end}`, result: j.RESULT });
    else errors.push({ range: `${start}-${end}`, result: j });
  });

  const totalFetched = rows.length;
  if (filterByRadius) {
    rows = rows.filter(d => {
      const la = parseFloat(d.stationLatitude), lo = parseFloat(d.stationLongitude);
      return Number.isFinite(la) && Number.isFinite(lo) && haversine(lat, lng, la, lo) <= radius;
    });
  }

  rows = rows.map(d => ({
    stationName: d.stationName,
    stationLatitude: d.stationLatitude,
    stationLongitude: d.stationLongitude,
    parkingBikeTotCnt: d.parkingBikeTotCnt,
    rackTotCnt: d.rackTotCnt,
    shared: d.shared
  }));

  if (totalFetched) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ ok: true, rows, count: rows.length, totalFetched });
  }
  return res.status(500).json({ ok: false, error: 'Seoul Bike API returned no rows.', details: errors });
}
