Git 的黃金準則
首先，請記住這個黃金準則：不要改寫公開歷史 (Do not rewrite public history)。

私人歷史 (Private History)：在你本機上，但你還沒有 push 到 GitHub 的 commit。

公開歷史 (Public History)：你已經 push 到一個共享分支（例如 main）的 commit。

當你需要撤銷一個已經被推送到遠端的 commit 時，安全且專業的工具是 git revert。

# Git 錯誤修正的心智模型

這份筆記使用「Why-What-How」框架，並搭配 Mermaid User Story 圖表，來釐清開發中最常見的問題之一：當我不小心提交了錯誤的程式碼時，該如何安全地修正它？

---

## 🌍 WHY - 核心故事

**身為** 一個開發者，
**我想要** 修正我不小心提交的錯誤，
**以便於** 維護一個乾淨且正確的程式碼歷史紀錄，並且不影響團隊協作。

---

## 🧩 WHAT - 兩種場景與對應工具

在 Git 的世界裡，錯誤可以分為兩大類：

1.  **私人錯誤 (Private Mistake)**: 錯誤的提交**還只存在**於我的本地電腦上，尚未推送到共享的遠端倉庫。
2.  **公開錯誤 (Public Mistake)**: 錯誤的提交**已經被推送**到遠端的共享分支（例如 `main`），團隊成員可能已經看到了。

針對這兩種截然不同的場景，Git 提供了兩種核心工具來應對：

- `git reset --hard`: 一個強力的**「時光機」**，用來改寫和抹除**私人歷史**。
- `git revert`: 一個安全的**「修正紀錄簿」**，用來沖銷**公開歷史**中的錯誤。

---

## 🛠️ HOW - Mermaid User Story 視覺化流程

這張圖描繪了開發者在遇到錯誤時的決策路徑。

```mermaid
journey
    title Git 錯誤修正的決策之旅

    section 🌍 Why: The Story
        User(開發者): 我想要修正我的 Git 提交錯誤！

    section 🧩 What: 兩種場景
        User: 我需要先判斷，這個錯誤是「私人的」還是「公開的」？
        IsPushed{錯誤是否<br>已經 Push 出去？}

    section 🛠️ How: 兩種解決方案
        IsPushed -- No (私人錯誤) --> ResetPath
        IsPushed -- Yes (公開錯誤) --> RevertPath

        subgraph ResetPath [場景一：修正私人錯誤]
            direction LR
            A["<b>工具: git reset --hard</b><br><i>(時光機 / 撕毀帳本)</i>"]
            B["<b>步驟:</b><br>1. 建立備份分支<br>2. 將 main 重置回遠端狀態<br>3. 切換到新分支繼續工作"]
            C["<b>結果:</b><br>錯誤歷史被徹底抹除<br><i>(適合還沒公開的草稿)</i>"]
            A --> B --> C
        end

        subgraph RevertPath [場景二：修正公開錯誤]
            direction LR
            D["<b>工具: git revert</b><br><i>(修正紀錄簿 / 沖銷分錄)</i>"]
            E["<b>步驟:</b><br>1. Revert 錯誤的 Commit<br>2. Push 修正紀錄<br>3. (選) Cherry-pick 工作到新分支"]
            F["<b>結果:</b><br>新增一筆修正紀錄，保留完整歷史<br><i>(確保團隊協作的透明與安全)</i>"]
            D --> E --> F
        end

    section ✅ 總結
        Goal: 根據錯誤的公開性，選擇正確的工具，最終達成一個乾淨且安全的版本歷史。

```

---

### 筆記摘要

- **學習流程**: 先理解 **Why**（你想達成的目標），再釐清 **What**（你面對的不同場景），最後才去學習 **How**（解決每個場景的具體指令）。
- **核心決策點**: 判斷錯誤是否已經被 `push`。
- **私人錯誤 (`reset`)**: 追求**乾淨**。因為還沒有人看到，你可以大膽地改寫歷史，讓最終結果看起來完美無瑕。
- **公開錯誤 (`revert`)**: 追求**安全**與**透明**。因為歷史已經被共享，你不能假裝它沒發生過，而是要新增一筆新的「更正紀錄」，告訴所有人發生了什麼事。

把這張圖和筆記存起來，下次再遇到提交錯誤時，你就可以依照這個清晰的決策地圖，充滿信心地選擇最正確的工具來解決問題。

![**開發者視角**: git revert 與 git reset觀念](../assets/assets\mermaid-diagram-2025-10-06-git-revert-and-git-reset.png)

```
---
config:
  look: classic
  layout: elk
---
graph TD
    %% --- WHY ---
    subgraph " "
        Why["🌍 <b>WHY: The Goal</b><br>我想要修正我的 Git 提交錯誤<br>以便維護一個乾淨且安全的版本歷史"]
    end

    Why --> What

    %% --- WHAT ---
    subgraph " "
        What{🧩 <b>WHAT: The Core Question</b><br>這個錯誤是否已經 Push 出去了？}
    end

    What -- "<b>No</b><br>(私人錯誤)" --> ResetPath
    What -- "<b>Yes</b><br>(公開錯誤)" --> RevertPath

    %% --- HOW ---
    subgraph ResetPath [🛠️ <b>HOW: Solution for Local Mistakes</b>]
        Tool1["<b>工具: git reset --hard</b><br><i>(時光機 / 撕毀帳本)</i>"]
        Result1["<b>結果:</b><br>錯誤歷史被徹底抹除"]
    end

    subgraph RevertPath [🛠️ <b>HOW: Solution for Public Mistake</b>s]
        Tool2["<b>工具: git revert</b><br><i>(修正紀錄簿 / 用來沖銷公開歷史中的錯誤)</i>"]
        Result2["<b>結果:</b><br>新增一筆修正紀錄<br>保留完整歷史"]
    end

    ResetPath --> Goal
    RevertPath --> Goal

    %% --- CONCLUSION ---
    subgraph " "
     Goal["✅ <b>總結</b><br>根據錯誤的公開性，選擇了正確的工具"]
    end

    %% --- STYLING ---
    style Why fill,stroke:#333,stroke-width:2px
    style What fill,stroke:#333,stroke-width:2px
    style Goal fill,stroke:#333,stroke-width:2px
```

![**非工程師比喻**：使用 Google Docs 的操作來類比 Git 的行為](../assets/assets\mermaid-diagram-2025-10-06-git-revert-and-git-reset-v2.png)

```

```
