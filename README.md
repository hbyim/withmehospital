# 모시미+ 데모 (고객 / 매니저 분리)

병원 동행·돌봄 매칭 플랫폼 [모시미](https://www.mosimi.co.kr)의 **고객 앱**과 **매니저 앱**을 각각 독립 앱으로 분리한 데모입니다.

## 구조

```
apps/customer   # 모시미+ (고객용)
apps/manager    # 모시미+ 매니저
packages/shared # 예약 데이터·매니저 모델 공유
```

같은 브라우저 origin의 `localStorage`로 예약이 공유되어, 고객 신청 → 매니저 수락 연동이 됩니다.

## 로컬 실행

```bash
npm install

# 터미널 1 — 고객 앱 http://localhost:5173
npm run dev:customer

# 터미널 2 — 매니저 앱 http://localhost:5174
npm run dev:manager
```

## GitHub Pages

배포 후:

- 고객 앱: `https://hbyim.github.io/withmehospital/`
- 매니저 앱: `https://hbyim.github.io/withmehospital/manager/`
