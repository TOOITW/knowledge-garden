# 2025-10-13 - Loki 生產環境準備策略與配置規劃

**Tags:** \#loki \#grafana \#eks \#sre \#capacity-planning \#aws \#troubleshooting
**Status:** \#Evergreen
**Related:** [[MOC SRE 可靠性工程]]

-----

## 🎯 情境 (Context / Goal)

> **為什麼我要寫這則筆記？**
> 由於近期要將內部使用的 `EKS + Grafana + Loki` 日誌監控系統正式推上生產環境。需要系統性地評估現有日誌量、規劃架構、計算所需資源，並提出一份穩定、可擴展且成本合理的配置方案，同時這份筆記也希望可以成為我之後重複參考的指南。

## 🔍 核心問題 (Core Problem)

在將 Loki 推向生產環境的過程中，面臨以下幾個核心未知數：

1.  **日誌總量未知：** 不清楚全部 30+ 個服務每天實際產生的日誌量有多大，特別是高峰時段的流量。
2.  **架構模式選擇：** 不確定是該沿用現有的 `Simple Scalable` 模式，還是升級到更複雜的 `Microservices` 模式。
3.  **擴縮容策略：** 對於 Loki 的各個組件（`write`, `read`, `backend`），不清楚哪些可以/應該自動擴縮容（Auto Scaling），哪些不行。
4.  **資源配置：** 不知道該為每個組件分配多少 CPU、Memory 和 PVC 儲存空間才能確保穩定性。

## 🛠️ 分析與解決方案 (Analysis & Solution)

整個分析過程遵循「數據驅動、概念釐清、最終配置」的邏輯路徑。

### 第 1 步：數據收集與流量估算

最初試圖手動分析每個服務，但因服務數量太多（30+）而效率低下。最終採用 **80/20 法則**，專注於找出流量大戶。

  * **方法：** 使用 AWS CLI 或 Python 腳本批量查詢 CloudWatch Metrics 的 `IncomingBytes` 指標，統計過去 7 天的數據。
  * **關鍵指標選擇：**
      * `Sum`：用來計算 **總流量** (例如：GB/天)。
      * `p99` / `Maximum`：用來識別 **流量高峰 (Spike)**，對於規劃緩衝區至關重要。

#### **最終流量估算 (Tiered Breakdown):**

| 層級 (Tier) | 包含服務 | 特徵 (每 5 分鐘) | 估算日流量 |
| :--- | :--- | :--- | :--- |
| **A 層 (高流量)** | 1 個服務 | 60–100 MB | **\~24 GB/天** |
| **B 層 (中流量)** | 10 個服務 | 5–20 MB | **\~58 GB/天** |
| **C 層 (低流量)** | 25 個服務 | 0–3 MB | **\~22 GB/天** |
| **總計** | **36 個服務** | - | **\~104 GB/天** |

> **結論：** 每日總流量約 `104 GB`，平均每小時 `4.2 GB`。這個量級處於 Simple Scalable 模式的臨界點，需要謹慎配置。

### 第 2 步：核心概念學習 (Feynman Deep Dive)

#### 概念 1：Spike Buffer (突發流量緩衝區)

> **TL;DR:** 為了防止系統被突然的流量高峰沖垮，我們需要預留比平時更多的處理能力，這就是 Spike Buffer。

  * **🌍 WHY - 核心問題:**
    系統的日誌流量不是一條平線。在服務部署、重啟或遇到錯誤循環時，日誌量可能會在短時間內暴增 5 到 10 倍。如果我們的系統只設計了處理「平均」流量的能力，這些高峰就會導致服務過載、拒絕接收日誌，最終造成 **日誌丟失**。

  * **💡 THE BIG IDEA - 核心類比:**
    把 Loki Ingester 想像成一家 **餐廳的廚房**。

      * **平均流量**：平日晚上的 50 位客人。
      * **Spike 流量**：週五晚上突然湧入的 120 位客人。
      * **沒有 Buffer**：廚房只有 50 個座位的備餐能力，結果週五晚上廚房爆單、客人排隊、最後生氣走人 (日誌被拒絕)。
      * **有 Buffer**：廚房設計了 120 個座位的備餐能力 (2x Buffer)。雖然平日有些浪費，但週五晚上能從容應對，所有客人都很滿意 (日誌都被成功接收)。

  * **🛠️ HOW - 如何應用:**
    我們的正常高峰流量約為 `4.5 GB/hour`。考慮到部署等因素，我們採用 **2x Buffer** 策略。

      * **設計目標** = `4.5 GB/hour` \* `2` = `9 GB/hour`
      * 這意味著我們的 Ingester (Write Target) 必須有能力在短時間內處理 `9 GB/hour` 的寫入速率。所有 Memory 和 CPU 的配置都應基於這個峰值來計算。

#### 概念 2：組件的擴縮容天性 (Stateful vs. Stateless)

> **TL;DR:** 無狀態 (Stateless) 的組件像外場服務生，可以隨時增減；有狀態 (Stateful) 的組件像廚師，不能隨意替換，否則手上的菜就毀了。

  * **🌍 WHY - 核心問題:**
    為什麼 Loki 的某些組件（如 `read`）可以輕易地 Auto Scaling，而某些組件（如 `write`, `backend`）卻不行或需要非常謹慎？

  * **💡 THE BIG IDEA - 核心類比:**

      * `Distributor` / `Querier` (**Stateless**): 他們是 **餐廳外場服務生** 和 **櫃檯人員**。他們不儲存核心數據（菜餚/書籍），只是負責傳遞和查詢。人手不夠時，隨時可以多找幾個臨時工來幫忙；人少時，讓他們下班也沒關係。
      * `Ingester` / `Compactor` (**Stateful**): 他們是 **廚師** 和 **倉庫管理員**。廚師手裡有正在烹飪的半成品（記憶體中的日誌塊）；倉庫管理員需要維護庫存清單（合併和刪除舊日誌）。如果隨意替換他們，手上的工作沒完成就會造成食材浪費（日誌丟失）或庫存混亂（數據不一致）。

  * **🧩 WHAT - 核心概念拆解:**

      * **Stateless (無狀態):** 每次請求都是獨立的，不依賴之前的狀態。可以隨意銷毀和創建。
          * `Read Target (Querier)`: 負責查詢，本身不存日誌。可以 Auto Scale。
      * **Stateful (有狀態):** 需要保存數據或狀態才能正常工作。
          * `Write Target (Ingester)`: 在記憶體和本地磁碟 (WAL) 中緩存了尚未持久化到 S3 的日誌。頻繁增減會導致 Ring Rebalancing 和數據沖刷 (Flush) 風險，**不建議頻繁 Auto Scale**。
          * `Backend Target (Compactor)`: 需要維護一個全局鎖（Leader Election）來確保同一時間只有一個實例在工作，以避免數據衝突。**完全不能 Auto Scale**。

  * **🛠️ HOW - Mermaid 視覺化:**

    ```mermaid
    graph TD
        subgraph "✅ 可以 Auto Scale (Stateless)"
            A[Read Target<br>(Querier)]
        end

        subgraph "❌ 謹慎/不建議 Auto Scale (Stateful)"
            B[Write Target<br>(Ingester)]
            C[Backend Target<br>(Compactor)]
        end

        D(流量高峰) --> A & B
        A -- 彈性應對 --> D
        B -- 固定資源 + Buffer應對 --> D
    ```

### 第 3 步：最終配置方案 (基於 Simple Scalable 模式)

綜合流量估算和對核心概念的理解，最終決定沿用 `Simple Scalable` 模式，但大幅提升資源配置。

#### **配置調整對比表:**

| 組件 | Staging (現有) | Production (建議) | 關鍵調整 & 理由 |
| :--- | :--- | :--- | :--- |
| **Write Target** | 2 pods, 512Mi Mem | **3 pods, 10Gi Mem** | 🔴 **Memory x20**: Ingester 需要大量內存緩存日誌。 |
| (Ingester) | 50Gi PVC | **150Gi PVC** | 🟢 **PVC x3**: 為 WAL 和暫存提供充足空間。 |
| | Auto Scale: ✅ | **Auto Scale: ❌ (關閉)** | 🔴 **穩定性優先**: 固定副本數避免 Ring Rebalancing。 |
| **Read Target** | 3 pods, 1Gi Mem | **3 pods, 3Gi Mem** | 🟡 **Memory x3**: Querier 處理大範圍查詢需要更多內存。 |
| (Querier) | Auto Scale: ✅ | **Auto Scale: ✅ (保留)** | 🟢 **成本效益**: 根據查詢負載彈性擴縮。 |
| **Backend Target**| 2 pods, 256Mi Mem| **2 pods, 1Gi Mem** | 🟡 **Memory x4**: 為 Compactor 合併任務提供資源。|
| (Compactor) | Auto Scale: ✅ | **Auto Scale: ❌ (關閉)** | 🔴 **架構限制**: Compactor 只能單一工作，Scale 無意義。|
| | | | 🟢 **高可用**: 設置 2 個副本實現 1 主 1 備 (Leader/Standby)。 |

#### **預估成本:**

  * **計算資源 (EKS):** \~$496/月
  * **儲存資源 (EBS+S3):** \~$94/月
  * **總計:** **\~$590/月**

## 💡 總結與延伸 (Key Takeaways & Next Steps)

* **關鍵啟示 (Key Takeaways):**
    1.  數據先行：容量規劃必須基於實際的日誌流量數據...
    2.  模式決定一切：必須先釐清 Loki 是 `Simple Scalable` 還是 `Microservices` 模式...
    3.  狀態決定擴縮容：Stateless 組件為彈性，Stateful 組件為穩定...
    4.  Buffer 是穩定的保險：2x 的 Spike Buffer 是...的關鍵。
    5.  **監控系統自身也是被監控對象：** 必須建立 Loki 自身的健康狀況監控與告警，否則日誌系統會成為整個維運體系的「盲點」。
    6.  **日誌規範至關重要：** 必須從源頭規範日誌標籤（Label）的使用，防止「高基數」問題拖垮整個叢集。這是一個架構問題，而非單純的工具問題。

* **待辦事項 (Action Items):**
    * 核心問題： 誰可以查詢哪些服務的日誌？
    * **知識盲點**
        * 多租戶 (Multi-tenancy):  Loki 可以通過 X-Scope-OrgID 這個 HTTP Header 來隔離不同團隊/專案的日誌。
        * 認證與授權： Grafana 如何與身份驗證系統（如 LDAP, OAuth）整合？如何在 Grafana 中設定權限，讓 A 團隊只能看到 A 服務的日誌？

    * 核心問題： 如果 Loki 自己掛了，要如何第一時間知道？
    * **知識盲點**
        * Loki 會曝露大量自身的 Prometheus 指標 (/metrics)。需要建立一個專門的 Grafana Dashboard 來監控這些指標。
        * 關鍵告警指標： loki_panic_total (Loki 是否崩潰)、Ingester 的內存使用率、Flush Queue 的長度、429 (請求過多) 和 500 (伺服器錯誤) 的 HTTP 錯誤率等。

    * **長期維運**
        * `[ ]` **建立 Loki 自身健康狀況的 Grafana 儀表板與 Prometheus 告警**（監控指標如 `loki_panic_total`, Ingester Memory, `429/500` 錯誤率）。
        * `[ ]` **規劃 Loki 的多租戶 (Multi-tenancy) 策略**，以實現日誌的權限隔離。
        * `[ ]` **撰寫一份《日誌發送最佳實踐》**，學習如何使用 Label，並連結到這份筆記 [[Loki 標籤基數的最佳實踐]]。
        * `[ ]` **將 Grafana 的核心儀表板導出為 JSON**，一併納入 Git 版控，實現災難恢復（已實作）。