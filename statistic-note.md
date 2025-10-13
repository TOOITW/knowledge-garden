Average (平均值) ⭐ 最常用
意義：時間段內所有數據點的平均值
適用場景：
✅ 監控穩定的流量趨勢
✅ 計算平均 throughput
✅ 容量規劃的基準值

❌ 不適合有突發流量的場景（會被平滑掉）
例子：

每 5 分鐘平均寫入 100MB logs
適合看「一般情況下」的負載


Minimum (最小值)
意義：時間段內的最低值
適用場景：
✅ 檢測服務是否完全停止（min = 0）
✅ 找出離峰時段

❌ 對 capacity planning 幫助不大

Maximum (最大值) ⭐ 重要
意義：時間段內的峰值
適用場景：
✅ 找出流量尖峰
✅ 設定 ingestion rate limit
✅ 確保系統能承受最壞情況

⚠️ 可能被單一異常事件影響
例子：

某 5 分鐘內最高寫入 500MB
用來規劃 ingester buffer 大小


Sum (總和) ⭐⭐⭐ 最適合算 log 量
意義：時間段內所有數據點加總
適用場景：
✅✅ 計算總 log volume（這是你要的！）
✅✅ 計算成本（S3 storage, data transfer）
✅ 統計總請求數

這是計算「一天多少 GB」的正確方式
例子：
sql-- CloudWatch Logs Insights
fields @timestamp
| stats sum(@billedBytes) / 1024 / 1024 / 1024 as total_GB 
  by bin(@timestamp, 1h)

Sample count (樣本數)
意義：該時間段內有多少個數據點
適用場景：
✅ 檢查 metrics 是否正常上報
✅ 計算資料密度

❌ 對 log volume 分析用處不大

📈 Percentile 統計指標
p99 (99th Percentile) ⭐⭐ 非常重要
意義：99% 的數據點都小於等於這個值
適用場景：
✅✅ 找出「通常最壞情況」（排除極端異常）
✅ 設定 SLA/SLO
✅ Capacity planning 的安全閥值

比 Maximum 更可靠（不會被單一 spike 誤導）
為什麼重要：

Maximum: 可能是一次性異常（部署時的 burst）
p99: 代表「99% 時間都能應付的流量」
更適合設定 auto scaling threshold

例子：

p99 = 200MB/5min → 設定 ingester 能處理 250MB/5min
只有 1% 的時間會超過這個值


p95, p90, p50 (其他 percentiles)

p95: 95% 數據點以下
p90: 90% 數據點以下
p50: 中位數 (median)

使用建議：

p99: 用於 critical services
p95: 用於一般 capacity planning
p50: 看典型值（比 average 更能代表「正常情況」）



| 統計方式            | 全名 / 意義                          | 數學描述               | 何時使用（場景）                                                                      |
| --------------- | -------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| **Average**     | 平均值                              | `(Σ sample) / N`   | 最常用。用來看長期趨勢或平均負載，例如 CPUUtilization、IncomingBytes 的平均流量。<br>缺點：可能掩蓋尖峰（平均掉高峰值）。 |
| **Minimum**     | 最小值                              | 期間內所有樣本的最小值        | 看「最低表現」或「閒置狀況」。例如磁碟剩餘空間最低點、ELB Target 最低 Latency。                             |
| **Maximum**     | 最大值                              | 期間內所有樣本的最大值        | 抓尖峰、異常、瞬間過載。<br>常用於 CPU/Latency/5xx 等「看爆點」的指標。                                |
| **Sum**         | 總和                               | 所有樣本相加             | 適合看「累積量」。<br>例如：S3 Request 數量、ALB ProcessedBytes、CloudWatch IncomingBytes。    |
| **SampleCount** | 樣本數量                             | N（這段時間內多少資料點）      | 用來確認取樣頻率是否正常，或估算平均請求率。                                                        |
| **IQM**         | Inter-Quartile Mean（四分位平均）       | 排除最高/最低 25% 樣本後取平均 | 去除極端值的平均。<br>適合有雜訊或突刺的指標，例如延遲（latency）波動大時用。                                  |
| **p99**         | 99 百分位（Percentile 99）            | 99% 的樣本低於此值        | 用來觀察「最差 1% 使用者體驗」的延遲或錯誤。<br>例如 API Latency、ResponseTime。                      |
| **tm99**        | Trimmed Mean 99（去除前後極端 0.5% 的平均） | 去除極端值的加權平均         | 平衡平均與 p99，常用於系統性能監控。                                                          |
| **tc99**        | Trimmed Count 99                 | 計算去除極端樣本後的樣本數      | 很少單用，多與 tm99、ts99 搭配。                                                         |
| **ts99**        | Trimmed Sum 99                   | 去除極端樣本後的加總         | 看「排除 outlier 後的總量」。適合觀察穩態流量。                                                  |



💡 簡單理解方式
| 目標              | 推薦統計          | 原因                  |
| --------------- | ------------- | ------------------- |
| 想知道**平均情況**     | Average       | 看趨勢或一般狀態            |
| 想知道**是否有爆峰**    | Maximum 或 p99 | 看最壞狀況               |
| 想知道**整體負載或傳輸量** | Sum           | 估算成本、頻寬、寫入量         |
| 想知道**資料穩定區間**   | IQM / tm99    | 把極端值濾掉，觀察「大多數時間」的狀況 |
| 想知道**取樣是否正常**   | SampleCount   | 確認指標收集沒漏點           |


在決定「你要以多粗的粒度，去觀察一小時內的總量」。
CloudWatch 的設定邏輯

CloudWatch 的圖表其實是：

將原始樣本 → 按 period 分桶 → 再套用 Statistic。

所以：

Period = 5 minutes → 每 5 分鐘為一個桶。

Statistic = Sum → 算出這 5 分鐘內所有樣本的總量。

如果你畫出 1 小時的圖，就會看到 12 個點（每 5 分鐘一個 sum）。

若你再在報表上「時間範圍 = 1 小時」，那就等於看每小時的總 bytes。