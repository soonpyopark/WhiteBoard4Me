# WhiteBoard4Me

로컬 PC에서 동작하는 화이트보드 앱입니다.  
필압 펜 타블렛, 이미지·텍스트 삽입, 레이어 순서 조정, 자동 저장, Windows 포터블 exe 배포를 지원합니다.

- **제작**: 청년안민규
- **블로그**: [https://note4all.tistory.com](https://note4all.tistory.com)
- **라이선스**: [MIT License](./LICENSE)

---

## 주요 기능

### 갤러리
- 새 화이트보드 생성
- 썸네일 미리보기
- 이름 변경 / 삭제

### 그리기 & 편집
- **도구**: 텍스트, 손(화면 이동), 선택, 올가미, 연필, 볼펜, 형광펜, 지우개, 사진 첨부
- Wacom·XP-Pen 등 **필압 타블렛** 자동 반영 (Pointer Events + `pressure`)
- Catmull-Rom 스플라인 보간으로 부드러운 필기
- 연필·볼펜·형광펜: 선 두께·투명도·색상·선 끝 모양(일반/화살표) 설정
- **지우개**: 부분 지우기 / 획 전체 삭제 모드
- **텍스트**
  - 클릭하여 여러 줄 입력 (`Ctrl+Enter` 확정, `Esc` 취소)
  - 더블클릭으로 재편집 (편집 시 텍스트 옵션 메뉴 자동 표시)
  - 글꼴·크기·색상 변경
  - **PC에 설치된 글꼴** 이름 직접 입력 (폰트 파일은 exe/빌드에 포함되지 않음)
- **이미지**: 파일 첨부, 드래그·붙여넣기 (대용량 JPEG 자동 압축)
- **선택·올가미**: 객체 선택, 다중 선택(올가미), 이동·크기 조절·회전
- **레이어 순서**: 선택된 객체에서 **우클릭** 또는 **0.5초 길게 누르기** → 맨 위로 / 위로 / 아래로 / 맨 아래로 / **개체 삭제**
- 실행 취소 / 다시 실행
- **자동 저장** (편집 후 약 2.5초 뒤)

### 보기
- 확대 / 축소 / 배율 직접 입력
- 가로 너비 맞추기
- 내용 **중앙으로 이동** (100% 배율)

### 내보내기
- 화이트보드 전체를 **PNG 이미지**로 저장

---

## 단축키

| 키 | 동작 |
|----|------|
| `Ctrl+Z` | 되돌리기 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 다시 실행 |
| `Delete` / `Backspace` | 선택 객체 삭제 |
| `Ctrl+Enter` | 텍스트 입력 확정 |

---

## Windows 포터블 exe (권장)

블로그에서 배포하는 exe 파일은 **설치 없이** 바로 실행할 수 있습니다.

1. `WhiteBoard4Me.exe` 실행 (또는 `exe/WhiteBoard4Me-*/` 폴더에서 실행)
2. exe와 같은 폴더에 `data/`가 생성되며, 화이트보드가 JSON으로 저장됩니다.
3. 메뉴 바 없이 전체 화면에 가깝게 동작하며, 외부 링크는 **기본 브라우저**에서 열립니다.

> exe 빌드는 개발자용입니다. 소스에서 직접 만들려면 아래 **개발자용 빌드**를 참고하세요.

---

## 소스에서 실행 (개발·수정)

### 요구 사항

- [Node.js](https://nodejs.org/) 20 이상
- npm

### 설치

```bash
git clone <저장소-URL>
cd "White Board"
npm install
```

### 개발 서버

```bash
npm run dev
```

브라우저에서 **http://localhost:3005** 접속 (`.env`의 `PORT`로 변경 가능)

`.env` 예시는 [`.env.example`](./.env.example)를 참고하세요.

| 변수 | 설명 |
|------|------|
| `PORT` | API·프론트 개발 서버 포트 (기본 `3005`) |
| `VITE_HOME_URL` | (선택) 갤러리 «홈» 버튼 클릭 시 이동할 URL |

### 프로덕션 실행 (브라우저)

```bash
npm run build
npm run start
```

### Windows 포터블 exe 빌드

```bash
npm run build:dist:exe
```

빌드 결과: `exe/WhiteBoard4Me-YYMMDD-HHMMSS/` 폴더

### 기타 스크립트

```bash
npm run lint          # oxlint
npm run electron:dev  # Electron 로컬 실행 (개발용)
```

---

## 데이터 저장 위치

| 실행 방식 | 저장 경로 |
|-----------|-----------|
| `npm run dev` / `npm run start` | 프로젝트 루트 `data/{id}.json` |
| Windows 포터블 exe | exe 파일 옆 `data/{id}.json` |

각 JSON 파일에는 제목, 그림(`paths`), 이미지(`images`), 텍스트(`texts`), 썸네일 등이 포함됩니다.  
객체는 `zIndex`로 겹침 순서가 저장됩니다.

---

## 기술 스택

- React 19 + TypeScript + Vite 8
- Express 5 (로컬 REST API · JSON 파일 저장)
- HTML5 Canvas 2D + Pointer Events
- Electron 36 (Windows portable exe)

---

## 라이선스

이 프로젝트는 [MIT License](./LICENSE) 하에 배포됩니다.

- 자유롭게 사용·수정·재배포할 수 있습니다.
- 배포 시 **저작권 표시와 MIT License 전문**을 포함해 주세요.

---

## 문의

배포·사용 관련 안내 및 업데이트는 아래 블로그에서 확인할 수 있습니다.

**[https://note4all.tistory.com](https://note4all.tistory.com/entry/%EC%9D%B8%ED%84%B0%EB%84%B7-%EC%97%86%EC%9D%B4%EB%8F%84-%EC%8A%A5%EC%8A%A5-%EB%82%B4-PC-%EC%95%88%EC%9D%98-%EB%98%91%EB%98%91%ED%95%9C-%EC%8A%A4%EC%BC%80%EC%B9%98%EB%B6%81-WhiteBoard4Me-v106-%EB%B0%B0%ED%8F%AC)**
