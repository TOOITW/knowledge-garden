---
title: Jest 測試環境（Next.js + TypeScript）一頁紙
tags: [jest, testing, nextjs, typescript, rtl]
updated: 2025-10-06
---

## TL;DR

- **Next.js + TS** 用官方 `next/jest`；環境設 `jsdom`；在 `jest.setup.ts` 內掛 `@testing-library/jest-dom`。
- `tsconfig.json` 加 `"types": ["jest", "node"]` 讓 TS 認得 `describe/it/expect`。
- 測 Hook/DOM 用 `@testing-library/react`；計時器用 `jest.useFakeTimers()` + `jest.advanceTimersByTime()`。

---

## Why（為什麼要這樣設）

- Next.js 編譯鏈多（Babel/SWC/ESM），**`next/jest` 直接沿用 Next 設定**，避免轉譯踩雷。
- 前端測試需要 DOM 模擬 → **`testEnvironment: "jsdom"`**。
- TypeScript 環境要知道 Jest 的全域名稱 → **在 tsconfig 加 types**。

---

## What（元件構成）

- **Test Runner**：Jest（負責收集測試、跑、報告）
- **Environment**：`node`（純函式/後端）或 `jsdom`（有 DOM/React Hook）
- **Transformer**：`next/jest`（Next 官方）或 `babel-jest` / `ts-jest`（非 Next 專案）
- **Assertion 擴充**：`@testing-library/jest-dom`
- **React 測試工具**：`@testing-library/react`（含 `renderHook` ≥ v14）
- **Setup 檔**：`setupFilesAfterEnv`（載入 jest-dom、自訂 mock）
- **模組別名**：`moduleNameMapper`（如 `@/` → `src/`）

---

## How（一步到位：Next.js + TS）

### 1) 安裝

```bash
npm i -D jest @types/jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom
```

### 2) jest.config.mjs

```
jest.config.mjs
```

### 3) jest.setup.ts

```
import '@testing-library/jest-dom'
```

### 4) tsconfig.json（關鍵）

```
{
"compilerOptions": {
"types": ["jest", "node"],
"skipLibCheck": true
}
}
```

### 5) package.json scripts

```
{
"scripts": {
"dev": "next dev --turbopack",
"build": "next build",
"start": "next start",
"lint": "next lint",
"format": "prettier --write \"\*_/_.{js,jsx,ts,tsx,md,json}\"",
"test": "jest",
"test:watch": "jest --watch",
"test:ci": "jest --ci --runInBand"
}
}
```

### 怎麼選測試堆疊（決策樹）?

```
flowchart TD
  A[我要寫測試] --> B{專案是 Next.js?}
  B -- 是 --> C[next/jest<br/>testEnvironment: jsdom]
  B -- 否 --> D{要 DOM 嗎?}
  D -- 要 --> E[Jest + jsdom<br/>或 直接用 Vitest+jsdom]
  D -- 不要 --> F[Jest + node 環境 或 ts-jest]
  C --> G[RTL: @testing-library/react]
  E --> G
```

### Jest 執行流程

```
sequenceDiagram
  participant CLI as npm test
  participant J as Jest Runner
  participant ENV as jsdom Env
  participant S as Setup (jest.setup.ts)
  participant T as Tests

  CLI->>J: 啟動
  J->>ENV: 建立測試環境
  J->>S: 載入 setupFilesAfterEnv
  J->>T: 收集/執行測試檔
  T->>J: 回報結果 (pass/fail)
  J-->>CLI: 退出碼/報告
```

### Pitfalls（常見誤區）
