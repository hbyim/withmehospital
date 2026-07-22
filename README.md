# 모시미+ 데모

병원 동행·돌봄 매니저 실시간 매칭 플랫폼 [모시미](https://www.mosimi.co.kr)의 핵심 플로우를 재현한 모바일 웹 데모입니다.

## 조사 요약

모시미(아이티브릿지)는 AI·빅데이터·위치 기반(LBS)으로 동행/돌봄 매니저를 실시간 매칭하는 서비스입니다.

- **동행**: 병원, 한시간, 투석, 건강검진, 입·퇴원, 기타
- **돌봄**: 노인, 아이, 가정, 병원, 기타
- 연령 무관, 원하는 장소·시간, **정기결제 없이 이용분 결제**
- 상담 챗봇, B2B(모시미 비즈) 확장

## 데모에 포함된 기능

1. 홈 / 서비스 카탈로그
2. 예약 신청 (장소·일정·대상·요청사항)
3. 위치 기반 매니저 매칭 시뮬레이션
4. 예약 확정·진행·완료 상태 관리
5. 이용 내역 / 마이페이지
6. 규칙 기반 상담 챗봇

> 실제 결제·본인인증·실시간 GPS 매칭은 포함되지 않습니다. 예약 데이터는 브라우저 `localStorage`에 저장됩니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 표시된 주소(기본 `http://localhost:5173`)로 접속하세요.

## GitHub Pages 배포

이 저장소에는 `master`/`main` 푸시 시 자동 배포하는 GitHub Actions 워크플로가 포함되어 있습니다.

1. GitHub에 저장소를 만들고 코드를 푸시합니다.
2. **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 설정합니다.
3. Actions 탭에서 `Deploy to GitHub Pages` 워크플로가 성공하면  
   `https://<username>.github.io/<repo>/` 주소로 접속할 수 있습니다.

SPA 라우팅은 GitHub Pages 호환을 위해 `HashRouter`(`#/services` 형태)를 사용합니다.
