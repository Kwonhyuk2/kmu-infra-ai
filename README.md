# KMU Infra AI - Vercel 배포용

## 배포 전 환경변수
Vercel 프로젝트 Settings > Environment Variables에 아래 2개를 추가하세요.

- `KAKAO_REST_API_KEY`
- `SEOUL_BIKE_API_KEY`

값은 `.env.example`에 적어둔 키를 참고하세요. GitHub에는 실제 `.env` 파일을 올리지 않는 것을 권장합니다.

## Vercel 배포 순서
1. 이 폴더 전체를 GitHub 새 저장소에 업로드합니다.
2. Vercel에서 New Project를 누릅니다.
3. GitHub 저장소를 선택합니다.
4. Environment Variables에 위 2개 키를 등록합니다.
5. Deploy를 누릅니다.

## 배포 후 확인 주소
- 메인 앱: `https://프로젝트명.vercel.app/`
- 따릉이 진단: `https://프로젝트명.vercel.app/api/seoul-bike/diagnose`

## 로컬 테스트
Vercel CLI를 사용할 경우:

```bash
npm install
npx vercel dev
```

