// 카카오 Local API를 서버에서 병렬로 집계해 한 번의 응답으로 내려준다.
// 브라우저에서 호출당 1회씩 프록시를 타던 구조(최대 47회 왕복)를 1회 왕복으로 줄이고,
// 결과는 Vercel 엣지에 1시간 캐싱한다.
const CENTER = { x: '126.99855', y: '37.60925' }; // 국민대 경영관
const RADIUS = 2100;

const CATEGORY_CODES = {
  restaurant: ['FD6'], cafe: ['CE7'], convenience: ['CS2'], medical: ['HP8', 'PM9'],
  bank: ['BK9'], transit: ['SW8'], school: ['SC4', 'AC5'], shopping: ['MT1'], public: ['PO3']
};
const KEYWORDS = {
  transit: ['국민대학교 버스정류장', '정릉 버스정류장'],
  public: ['국민대학교 주민센터', '정릉 우체국', '정릉 경찰서'],
  shopping: ['국민대학교 마트', '정릉 시장', '정릉 쇼핑'],
  restaurant: ['국민대학교 음식점'], cafe: ['국민대학교 카페'],
  medical: ['국민대학교 병원', '국민대학교 약국'],
  bank: ['국민대학교 은행'], convenience: ['국민대학교 편의점']
};

function slim(d, cat) {
  return {
    cat,
    place_name: d.place_name,
    x: d.x,
    y: d.y,
    road_address_name: d.road_address_name,
    address_name: d.address_name,
    phone: d.phone,
    place_url: d.place_url
  };
}

async function kakaoGet(key, path, params) {
  const url = `https://dapi.kakao.com/v2/local/${path}.json?${new URLSearchParams(params).toString()}`;
  const r = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Kakao ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

// 같은 코드의 페이지는 is_end 판단 때문에 순차, 코드끼리는 전부 병렬.
async function categoryDocs(key, cat, code) {
  const docs = [];
  for (let page = 1; page <= 3; page++) {
    const j = await kakaoGet(key, 'search/category', {
      x: CENTER.x, y: CENTER.y, radius: RADIUS, sort: 'distance', size: 15,
      category_group_code: code, page
    });
    (j.documents || []).forEach(d => docs.push(slim(d, cat)));
    if (j.meta && j.meta.is_end) break;
  }
  return docs;
}

export default async function handler(_req, res) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'KAKAO_REST_API_KEY is not set.' });
  }

  const errors = [];
  const tasks = [];

  for (const [cat, codes] of Object.entries(CATEGORY_CODES)) {
    for (const code of codes) {
      tasks.push(categoryDocs(key, cat, code).catch(e => {
        errors.push(`category ${cat}/${code}: ${String(e && e.message ? e.message : e)}`);
        return [];
      }));
    }
  }

  for (const [cat, queries] of Object.entries(KEYWORDS)) {
    for (const query of queries) {
      tasks.push(kakaoGet(key, 'search/keyword', {
        x: CENTER.x, y: CENTER.y, radius: RADIUS, sort: 'distance', size: 15, page: 1, query
      }).then(j => (j.documents || []).map(d => slim(d, cat))).catch(e => {
        errors.push(`keyword ${cat}/${query}: ${String(e && e.message ? e.message : e)}`);
        return [];
      }));
    }
  }

  const documents = (await Promise.all(tasks)).flat();

  if (documents.length) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ ok: true, count: documents.length, documents, errors: errors.length ? errors : undefined });
  }
  return res.status(502).json({ ok: false, error: 'Kakao Local API returned no documents.', details: errors });
}
