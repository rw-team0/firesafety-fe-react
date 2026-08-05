# ArcGuard (아크가드) — 프론트엔드

전기화재 예방 스마트 진단/모니터링 시스템의 React 프론트엔드. 기존 Vue 3 프론트엔드(`firesafety-fe`)를
기계적으로 옮긴 게 아니라, 실제 화면·API 계약·권한·흐름은 유지하되 코드 구조와 공통 컴포넌트는
React 방식으로 새로 설계했다. PC(데스크톱 관리 콘솔)와 모바일(PWA, 현장 실사용)을 완전히 분리된
컴포넌트로 구현한다.

---

## 구조

```
src/
  app/         앱 초기화(App.jsx), 전역 Provider 묶음, 라우팅(routeConfig/router/가드)
  layouts/     DefaultLayout(PC 사이드바+헤더) / MobileLayout(하단탭 셸) / AuthLayout
  features/    도메인별 실 구현 — auth/accounts/sites/facilities/monitoring/alerts/
               statistics/system/inspections
  shared/      2개 이상 도메인이 함께 쓰는 api/components/constants/hooks/styles/utils
  dev/         개발 전용 페이지(디자인 시스템 카탈로그), production 라우트 미등록
```

| 영역 | 역할 |
|---|---|
| `shared/api` | `httpRequester`(axios 단일 인스턴스, `baseURL: '/api'`, 401 큐잉 재발급) |
| `shared/components` | 역할별 폴더(buttons/forms/feedback/modals/data-display/layout)로 분류된 공통 UI |
| `shared/constants` | 역할(`roles`)/enum 라벨(`domainLabels`)/상태색(`domainColors`)/라우트 경로(`routePaths`) |
| `features/{domain}` | 도메인 전용 `api/components/hooks/pages/utils` — PC 화면과 모바일(`Mobile*`) 화면이 같은
  feature 폴더 안에 공존하되 컴포넌트는 서로 import하지 않는다 |

PC/모바일 구분은 뷰포트가 아니라 **URL 프리픽스(`/m/*`)**로만 한다. 라우트 메타데이터(`path`,
`layout`, `requiredRole`, `requiresSite`, `navGroup`)는 `app/routing/routeConfig.js` 한 곳에 모은다.

---

## 기술 스택

| 구분 | 기술 |
|---|---|
| 언어 | JavaScript + JSX (TypeScript/Redux 도입 안 함) |
| 프레임워크 | React 19 |
| 빌드 도구 | Vite 8 (`@vitejs/plugin-react`) |
| 라우팅 | React Router 7 |
| HTTP | axios (공통 인스턴스 하나만 사용) |
| 상태관리 | React Context — 인증/현장/실시간 관제처럼 진짜 전역 상태에만 사용, 나머지는 로컬 state |
| 스타일 | CSS 변수(`shared/styles/tokens.css`) + 클래스 기반 전역 스타일시트. Tailwind/CSS-in-JS/UI 라이브러리 도입 안 함 |
| 실시간 통신 | `@stomp/stompjs` (순수 STOMP-over-WebSocket, SockJS 아님) |
| PWA / 푸시 | Web App Manifest, 커스텀 서비스워커, Firebase(FCM) 웹푸시 |
| 차트 | Recharts (통계 화면) |
| Lint | ESLint (React Hooks 규칙 포함) |

---

## 실행

### 사전 요구사항

- Node.js (Vite 8 요구 버전)
- 로컬에서 `firesafety-be` 백엔드가 8080 포트로 떠 있어야 실제 API 연동 확인 가능

### 1. 환경변수 설정

```bash
cp .env.example .env.local
# VITE_DEV_API_PROXY_TARGET / VITE_DEV_WS_PROXY_TARGET (미설정 시 http://localhost:8080 폴백)
# FCM을 실제로 테스트하려면 VITE_FIREBASE_* 값도 채운다(운영 빌드에만 로드됨, 아래 참고)
```

`.env.local`은 git 추적 대상이 아니다. 회사 서버 주소를 `.env.example`에 커밋하지 않는다.

### 2. 개발 서버

```bash
npm install
npm run dev
```

`vite.config.js`의 `server.host: '0.0.0.0'` 덕분에 같은 네트워크의 실기기(폰)에서도
`http://<로컬IP>:<포트>`로 접속해 테스트할 수 있다. 단, HTTPS가 아니라서 PWA 설치·서비스워커·FCM
푸시 실동작은 확인이 안 된다(로컬호스트 예외 제외) — 필요하면 ngrok 등으로 HTTPS 터널을 따로 연다.
로컬 네트워크 IP로 접속할 때는 백엔드 `application.yml`의 `constants.cors.allowed-origins`에 그
origin이 등록돼 있어야 한다.

### 3. 검증

```bash
npm run lint
npm run build
```

테스트 러너는 없다(Vue 원본에도 없었음). UI 변경은 `npm run dev`로 브라우저에서 실제로 확인한다.

### 4. 운영 빌드/배포

```bash
docker buildx build --platform linux/amd64 -t arcguard-frontend:latest --load .
```

`Dockerfile`/`nginx.conf`는 멀티스테이지 빌드 + SPA fallback(`try_files ... /index.html`) 구성이고,
`/api`·`/ws`는 이 컨테이너가 아니라 회사 상위 nginx가 프록시한다. `.env.production`은 FCM 등 운영
전용 값이 필요할 때만 만든다(Vite는 `vite build`/`vite preview`에서만 이 파일을 읽고 `vite dev`에서는
안 읽는다).

---

## 설계 근거

**PC와 모바일은 URL 프리픽스로만 나누고, 컴포넌트는 절대 공유하지 않는다.** 뷰포트 미디어쿼리로 같은
컴포넌트를 반응형으로 늘어뜨리는 방식은 화면마다 실제 정보 구조와 상호작용 방식이 달라서(예: 모바일
알림은 목록에서 바로 처리하지 않고 설비 상세로 넘겨 처리한다) 오히려 조건문이 누적되며 복잡해진다.
`Mobile` 접두사를 붙인 별도 페이지/컴포넌트를 만들고 API 함수·훅(`useAuth`/`useSite`/`useMonitoring`)만
공유한다.

**API 응답은 `httpRequester` 하나만 거치고, 실패 메시지는 인터셉터가 전역으로 처리한다.** 화면에서
axios를 직접 import하거나 중복 alert를 띄우지 않는다. 401은 `/auth/reissue`로 큐잉 재발급하고, 재발급
자체가 실패하면 세션을 정리하고 로그인 화면으로 하드 리다이렉트한다.

**Enum 계약값은 백엔드가 내려주는 영문 그대로 쓰고, 화면 표시용 한글은 `domainLabels.js`의 라벨 맵
하나로만 관리한다.** 백엔드와 동일한 설계 원칙이다 — 화면마다 라벨 매핑을 새로 만들면 값이 늘어날
때마다 여러 곳을 고쳐야 해서 어긋나기 쉽다.

**여러 건을 한 번에 처리하는 기능은 클라이언트에서 반복 호출하지 않고, 가능하면 서버 벌크 API를
쓴다.** 경보 확인/조치완료처럼 상태 변경마다 WebSocket 브로드캐스트가 나가는 기능을 클라이언트에서
반복 호출하면, 실시간 관제 상태(`MonitoringContext`)가 그 신호를 받을 때마다 재조회를 시도해 요청이
연쇄적으로 폭주할 수 있다. 이런 케이스는 서버에 전용 벌크 엔드포인트를 만들어 실시간 갱신 신호를
한 번만 보내도록 한다.
