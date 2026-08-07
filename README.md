# 모시미+ 상용 데모 (고객 / 매니저 / API)

병원 동행·돌봄 매칭 플랫폼의 **고객 앱**, **매니저 앱**, **백엔드 API** 모노레포입니다.

## 구조

```
apps/api        # Hono + PostgreSQL REST API
apps/customer   # 모시미+ 고객 앱
apps/manager    # 모시미+ 매니저 앱
packages/shared # 타입·API 클라이언트·컨텍스트
```

## 백엔드 주요 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register/customer` | 고객 가입 |
| POST | `/api/auth/register/manager` | 매니저 가입 |
| POST | `/api/auth/login` | 로그인 (JWT) |
| GET | `/api/me` | 내 정보 |
| GET | `/api/services` | 서비스 목록 |
| POST | `/api/bookings` | 예약 신청 (matching) |
| GET | `/api/bookings?scope=open\|mine` | 목록 |
| POST | `/api/bookings/:id/accept` | 매니저 수락·배정 |
| POST | `/api/bookings/:id/decline` | 매니저 거절 |
| PATCH | `/api/bookings/:id/status` | 상태 전이 |
| POST | `/api/bookings/:id/payments/ready` | 결제 준비 (orderId) |
| POST | `/api/payments/confirm` | Toss 결제 확정 |
| POST | `/api/payments/confirm-stub` | 스텁 결제 확정 |
| GET | `/api/payments/config` | 결제 모드/클라이언트 키 |
| GET | `/api/push/vapid-public-key` | Web Push 공개키 |
| POST | `/api/push/subscribe` | 푸시 구독 등록 |
| PATCH | `/api/managers/me` | 수신 ON/OFF 등 |

상태 흐름: `matching → matched → confirmed → in_progress → completed` (또는 `cancelled`)

## 로컬 실행

```bash
npm install

# PostgreSQL — Docker 또는 Homebrew
npm run db:up
# 또는: brew services start postgresql@16
#      createuser -s mosimi && createdb -O mosimi mosimi
#      psql -d postgres -c "ALTER USER mosimi WITH PASSWORD 'mosimi';"

# 스키마 마이그레이션 + 시드
npm run db:seed

# API http://localhost:8787
npm run dev:api

# 고객 http://localhost:5173
npm run dev:customer

# 매니저 http://localhost:5174
npm run dev:manager
```

### 시드 계정

- 고객: `customer@mosimi.local` / `customer123`
- 매니저: `seoyeon@mosimi.local` / `manager123`  
  (junho / haneul / minji @mosimi.local 동일 비밀번호)

## 환경 변수

`apps/api/.env.example` 참고.

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` | 설정 시 Toss PG, 없으면 stub |
| `VAPID_*` | Web Push (없으면 서버 콘솔 stub 로그) |

프론트는 `VITE_API_BASE_URL` (기본 `http://localhost:8787`)을 사용합니다.

### VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

생성된 값을 `apps/api/.env`의 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`에 넣고  
`VAPID_SUBJECT=mailto:dev@mosimi.local` 를 추가하세요.

## 결제

- **Stub** (기본): 예약 상세 → 결제하기 → 즉시 `paid`
- **Toss**: 키 설정 후 결제창 → `payment-success.html` → `/#/payment/success`에서 confirm
