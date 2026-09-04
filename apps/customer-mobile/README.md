# 위드유 고객용 모바일 웹앱 (iOS / Android)

Capacitor로 GitHub Pages 고객 웹앱을 네이티브 셸에서 실행합니다.

- **앱 ID**: `plus.mosimi.customer`
- **로드 URL**: https://hbyim.github.io/withmehospital/

## 사전 요구

- Node.js 20+
- **iOS**: macOS + Xcode (Swift Package Manager — CocoaPods 불필요)
- **Android**: Android Studio + SDK

## 설치 · 플랫폼 추가

```bash
# 저장소 루트에서
npm install
cd apps/customer-mobile

# 최초 1회 (Android / iOS SPM — CocoaPods 불필요)
npx cap add android
# iOS: `cap add ios --packagemanager SPM` 대소문자 버그 회피
node ../../scripts/add-ios-spm.mjs
npx cap sync
```

## 실행

```bash
# Xcode / Android Studio 열기
npm run open:ios
npm run open:android

# 또는 시뮬레이터·실기기 직접 실행
npm run run:ios
npm run run:android
```

루트에서도 가능합니다.

```bash
npm run mobile:customer:sync
npm run mobile:customer:ios
npm run mobile:customer:android
```

## 로컬 빌드 번들 사용 (오프라인 셸)

원격 URL 대신 `apps/customer` 빌드 결과를 넣고 싶다면 `capacitor.config.ts`의 `server.url`을 제거하고 `webDir`을 고객 앱 `dist`로 맞춘 뒤 `cap sync` 하세요.
