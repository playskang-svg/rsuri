# soft — 소프트웨어 공식 다운로드 안내 사이트 빌더

키워드사이트빌더(`bizhelp/`)를 주제만 바꿔 복제한 것이다. 지역×키워드·문자 상담 대신 **항목(메인 키워드) × 운영체제 → 프로그램 상세 → 공식 다운로드** 구조다.

- 다발 1개 = 사이트(서브도메인) 1개 = 워커 1개(`adbles-soft-<id>`)
- 첫 다발: `bundles/pc-essentials.json` → `soft.adbles.com` (메인 키워드 9개, 프로그램 31개)
- **설치 파일을 직접 올리지 않는다.** 모든 버튼은 개발사 공식 페이지로 연결한다(재배포 라이선스·악성코드 위험·애드센스 다운로드 버튼 정책 때문).

## 페이지 구조

| 주소 | 내용 |
|---|---|
| `/` | 항목 카드(메인 키워드) + 운영체제 바로가기 |
| `/<키워드>/` | 항목 설명 · 운영체제 탭 · 프로그램 카드(페이지 나눔) · 고를 때 볼 것 · FAQ |
| `/<키워드>/<os>/` | 그 운영체제를 지원하는 프로그램만. 전체와 목록이 같으면 만들지 않는다(중복 페이지 방지) |
| `/os/<os>/` | 운영체제별 전체 목록(페이지 나눔) |
| `/p/<프로그램>/` | 운영체제별 공식 다운로드 버튼 · 라이선스 · 확인일 · 같은 항목의 다른 프로그램 |
| `/about/` | 운영 원칙 |

`perPage`(기본 6)를 넘으면 `/page/2/`, `/page/3/` 로 넘어간다.

## 새 다발 주입

`bundles/` 에 JSON 하나를 추가하면 다음 main 배포에서 새 서브도메인이 생긴다. 다른 위치의 파일이나 URL 은 `--bundle` 로 넣는다.

```bash
node scripts/build.mjs                          # bundles/ 전부
node scripts/build.mjs --bundle ~/x.json        # 하나만 (https URL 도 가능, 환경변수 SOFT_BUNDLE 도 같음)
node scripts/build.mjs --check                  # 검증만
node scripts/check-links.mjs                    # 공식 주소 생존 확인(네트워크)
```

필수 필드: `id` `host` `name` `title` `checked`(YYYY-MM-DD) `keywords[1~9]` `programs`.
키워드: `slug` `keyword` `title` `intro` `programs[]` (+ 선택 `pick[]` `faq[{q,a}]`).
프로그램: `name` `vendor` `license` `summary` `official` `os{windows|macos|linux|android|ios: https 주소}` (+ 선택 `en` `features[]` `note` `builtin` `checked`).
검증에 걸리면 빌드가 멈춘다(키워드 10개 이상, 없는 프로그램 참조, 고아 프로그램, http 주소, host 중복 등).

## 지켜야 할 것

- 공식 배포처를 **직접 열어 확인한 주소만** 넣고 `checked` 를 갱신한다. 확인 못 하면 싣지 않는다(예: 팟플레이어 — potplayer.daum.net 이 2026-10 기준 응답 없음, 새 공식 주소 미확인으로 제외).
- 라이선스는 "개인 무료/기업 유료"처럼 확인한 범위만 적는다. 버전 번호·가격은 적지 않는다(자주 바뀜).
- `noindex: true` 가 기본이다. 공개(검색 노출)는 운영자가 결정한다 — 다발의 `noindex` 를 `false` 로 바꾸면 된다.
- 메인 키워드는 검색량을 재고 고른다(goldkey `searchad.mjs volume`). 첫 다발 9개는 아직 실측 전이다.
