# BOJ-In-My-Heart

백준 온라인 저지(BOJ) 사이트의 사용자 정보를 추출하여 json으로 저장하고 로컬에서 시각화해주는 CLI 도구 및 뷰어입니다.

## 실행 방법

이 프로젝트는 **Node.js** 와 **Bun** 환경을 지원합니다.

### Node.js 환경에서 실행하기

```bash
# 1. cli 폴더로 이동 및 의존성 설치
cd cli
npm install

# 2. 특정 사용자의 데이터 추출 (결과는 data 폴더에 저장됨)
npm start <username>
# 예시: npm start happyp
```

### Bun 환경에서 실행하기

```bash
# 1. cli 폴더로 이동 및 의존성 설치
cd cli
bun install

# 2. 특정 사용자의 데이터 추출 (결과는 data 폴더에 저장됨)
bun start <username>
# 예시: bun start happyp
```

### Docker 환경에서 실행하기 (Node.js 24 Alpine)

```powershell
# PowerShell 기준
docker run --rm -v "${PWD}:/app" -w /app/cli node:24-alpine sh -c "npm install && npm start <username>"
```

### Docker 환경에서 실행하기 (Bun)

```powershell
# PowerShell 기준
docker run --rm -v "${PWD}:/app" -w /app/cli oven/bun:latest sh -c "bun install && bun start <username>"
```

## 뷰어 사용 방법 (데이터 시각화)

1. `viewer` 폴더 안의 `viewer.html` 파일을 더블클릭하여 브라우저로 엽니다.
2. 브라우저 화면에서 CLI를 통해 `data` 폴더에 생성된 json 파일을 마우스로 끌어다 놓거나 클릭하여 불러옵니다.
3. 백준 사이트와 완벽하게 100% 일치하는 UI로 해당 사용자의 잔디, 맞은 문제, 랭킹 및 언어별 통계 정보가 렌더링됩니다!

## 데이터 구조 (JSON)

생성되는 JSON 파일의 데이터 구조는 다음과 같습니다:

```json
{
  "id": "fascinating",
  "statusMessage": "BOJ-In-My-Heart",
  "leftTable": {
    "등수": "1",
    "맞은 문제": "999",
    "시도했지만 맞지 못한 문제": "1",
    "제출": "1000",
    "문제집": "1"
  },
  "grassData": [
    {
      "date": "Jan 6, 2025",
      "submit": 1
    }
  ],
  "solvedProblems": ["1000", "1001", "1002"],
  "languageData": [
    {
      "언어": "java",
      "맞았습니다": "1000",
      "출력 형식": "1",
      "틀렸습니다": "0"
    }
  ],
  "timestamp": "2026-04-22T15:35:50.000Z"
}
```
