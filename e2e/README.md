# E2E 테스트 (Playwright)

브라우저 기반 End-to-End 테스트입니다. `next dev` 서버를 자동으로 띄우고 실제 브라우저로 시나리오를 검증합니다.

## 최초 1회 셋업

```bash
# 1) 브라우저 바이너리
npx playwright install chromium

# 2) 브라우저 실행에 필요한 시스템 라이브러리 (Linux/WSL, sudo 필요)
sudo npx playwright install-deps chromium
```

## 실행

```bash
npm run test:e2e          # 헤드리스 실행
npm run test:e2e:ui       # Playwright UI 모드 (디버깅)
npm run test:e2e:report   # 마지막 HTML 리포트 열기
```

기본적으로 `.env.local`(없으면 `.env.test`)의 환경 변수를 불러옵니다.

## 인증 전략

이 앱의 로그인은 **Google / Kakao OAuth 전용**입니다. 실제 소셜 로그인 UI 는
외부 도메인 의존성과 약관 문제로 E2E 에서 자동화하지 않습니다.

- **미인증 테스트**는 자격 증명 없이 바로 실행됩니다.
  로그인 페이지 렌더링, 보호 경로 리다이렉트, OAuth 흐름 시작을 검증합니다.
- **인증 테스트**는 `e2e/auth.setup.ts` 가 Supabase 테스트 사용자(email/password)로
  로그인해 세션 쿠키를 발급하고 `storageState`(`e2e/.auth/user.json`)로 저장합니다.
  이후 인증 테스트는 이 세션을 재사용해 OAuth 화면을 거치지 않습니다.

### 인증 테스트 활성화

1. Supabase 대시보드에서 **Email 로그인 활성화** 후 테스트 전용 사용자를 생성합니다.
   (가급적 프로덕션이 아닌 별도/스테이징 프로젝트 권장)
2. `.env.local` 또는 `.env.test` 에 다음을 추가합니다.

   ```bash
   E2E_TEST_USER_EMAIL=e2e@example.com
   E2E_TEST_USER_PASSWORD=********
   ```

자격 증명이 없으면 인증 테스트는 자동으로 **skip** 됩니다.

## 구조

| 파일 | 역할 |
| --- | --- |
| `playwright.config.ts` | 설정 · dev 서버 기동 · `setup → chromium` 프로젝트 의존성 |
| `e2e/auth.setup.ts` | 세션 발급 → storageState 저장 (인증 셋업 프로젝트) |
| `e2e/constants.ts` | storageState 경로 등 공유 상수 |
| `e2e/login.spec.ts` | 로그인 / 인증 리다이렉트 시나리오 |
