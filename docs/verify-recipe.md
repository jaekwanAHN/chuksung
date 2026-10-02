# 검증 레시피 정정 기록 (#129)

## 범위와 결정

기준 커밋은 `3abdd78`, 작업 브랜치는 `docs/verify-recipe`다. 2026-10-02 사용자가
포트·계정·인증·StrictMode·원격 조회·셀렉터 안내 정정과 검증·커밋·푸시·PR 생성을
승인했다. 앱, 인증 스크립트, E2E 설정 및 DB는 변경하지 않았다.

기존 레시피는 수동 서버 포트를 슬롯 값으로 고정하고 임시 로그인 파일과 별도 셀렉터
목록을 안내했다. 실제 `scripts/dev-login.mjs`는 현재 작업의 E2E 계정을 사용하지만
서버 포트는 `--port` 인자가 필요하다. `playwright.config.ts`는 기존 서버를 재사용할
수 있으므로 다른 작업의 서버에 연결하면 다른 코드로 검증하는 오탐이 생긴다.

[수정한 레시피](../.claude/skills/verify/SKILL.md)는 슬롯 배정과 환경변수 로드 계약을
참조하고 서버·로그인 도구의 포트를 일치시키도록 안내한다. 수동 검증과 E2E는 같은
슬롯에서 직렬 실행한다. 별도 포트만 선택해도 같은 계정의 데이터 경합은 남기 때문이다.

브라우저 로그인은 기존 `dev:login`, 자동 인증·API 요청·로케이터는 기존 E2E를
참조한다. StrictMode의 dev 전용 이상을 무시하지 않고 이펙트 정리와 production
재현 여부를 함께 확인하도록 했다. 원격 Management API 조회 절차는
[스키마 문서](schema-source-of-truth.md#management-api로-원격-실제-상태-확인)에 둔다.
해당 토큰은 읽기만 허용하는 키가 아니므로 조회 절차의 범위를 명시했다.

## 검증 결과

- `git diff --check`: 통과.
- skill-creator의 `quick_validate.py .claude/skills/verify`: `Skill is valid!`.
- 변경 문서의 상대 링크 대상과 헤딩 앵커 존재 여부: 통과.
- `package.json`의 `dev`, `dev:login`, `build`, `start` 명령 존재 여부: 통과.
- 레시피의 고정 포트·고정 계정·임시 인증 파일·별도 셀렉터 잔존 검사: 없음.
- `scripts/dev-login.mjs`의 인자·계정 처리, `e2e/auth.setup.ts`의 storageState,
  `e2e/goal.spec.ts`의 API 요청·복원 방식, `playwright.config.ts`의 포트·서버
  재사용 설정을 안내와 대조했다.
- 설치된 Next.js의 `reactStrictMode.md`와 CLI `next.md`에서 App Router의
  StrictMode 기본값, build 후 start 순서와 `--port` 옵션을 확인했다.
- `Field.tsx`의 암시적 라벨 연결과 태스크·템플릿 스펙을 확인해 디자인 토큰 문서의
  오래된 셀렉터 출처를 정정했다. 실제 UI의 ID는 변경하지 않았다.

문서와 스킬만 수정했으므로 lint/build·unit·E2E와 실제 로그인·원격 SQL 호출은
실행하지 않았다. 이 기록은 안내와 현재 코드의 구조 대조 결과이며 브라우저나 원격
스키마의 실행 검증 결과를 뜻하지 않는다.
