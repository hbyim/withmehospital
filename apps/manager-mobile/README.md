# 위드유 매니저용 모바일 웹앱 (iOS / Android)

Capacitor로 GitHub Pages 매니저 웹앱을 네이티브 셸에서 실행합니다.

- **앱 ID**: `plus.mosimi.manager`
- **로드 URL**: https://hbyim.github.io/withmehospital/manager/

## 사전 요구

- Node.js 20+
- **iOS**: macOS + Xcode (Swift Package Manager — CocoaPods 불필요)
- **Android**: Android Studio + SDK

## 설치 · 플랫폼 추가

```bash
npm install
cd apps/manager-mobile

npx cap add android
# iOS SPM (저장소 루트에서 node scripts/add-ios-spm.mjs)
npx cap sync
```

## 실행

```bash
npm run open:ios
npm run open:android
npm run run:ios
npm run run:android
```

루트:

```bash
npm run mobile:manager:sync
npm run mobile:manager:ios
npm run mobile:manager:android
```
