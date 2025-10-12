# YYYY-MM-DD - [筆記主題] - [簡要描述]

**Tags:** #sre #aws #kubernetes #troubleshooting #learning
**Status:** #Draft / #Evergreen
**Related:** [[相關的 MOC 筆記]], [[另一個相關的原子筆記]]

---

## 🎯 情境 (Context / Goal)
> **為什麼我要寫這則筆記？** 我當時想做什麼？背景是什麼？

* *範例：在進行 v1.5 版本的服務部署時，需要將 CDN 上的靜態資源快取全部清除。*
* *範例：為了學習 EKS 的 HPA (Horizontal Pod Autoscaler) 如何運作。*


## 🔍 問題現象 / 核心內容 (Problem / Core Content)
> **發生了什麼事？** 觀察到的現象、錯誤訊息、或這個筆記的核心知識點是什麼？

* **現象描述:**
    * *範例：使用者回報看到舊的 CSS 樣式，頁面錯亂。*
* **錯誤訊息:**
    ```bash
    # 範例：貼上關鍵的錯誤 log
    git@github.com: Permission denied (publickey).
    ```
* **核心知識點:**
    * *範例：HPA 的運作原理是基於 Metrics Server 提供的 Pod CPU/Memory 使用率來決定是否擴縮容。*


## 🛠️ 分析與解決方案 (Analysis & Solution)
> **我是如何思考與解決的？** 或 **這個知識點的具體細節是什麼？** (這是筆記的精華)

1.  **步驟一：** 我首先檢查了...，發現...
2.  **步驟二：** 接著我嘗試了...，結果是...
3.  **根本原因 (Root Cause):** ...
4.  **最終解決方案 (Final Solution):** ...


## 💡 總結與延伸 (Key Takeaways & Next Steps)
> **這次經驗給我最大的啟示是什麼？** 未來如何避免？還有什麼可以深入研究的？

* **關鍵啟示 (Key Takeaways):**
    * *範例：CloudFront 的 `/*` 失效路徑只會匹配單層目錄，不會遞迴。*
    * *範例：修改 Git 遠端倉庫地址要用 `git remote set-url` 而非 `add`。*
* **待辦事項 (Action Items):**
    * `[ ]` 修改 CI/CD Pipeline 的部署腳本。
    * `[ ]` 安排一次關於 HPA 設定的團隊分享。

---