# 🧭 L2–L7 網路排查練功筆記

> 📘 檔案名稱：`practice-L2toL7.md`  
> 🎯 目標：即使沒有雲端環境（AWS、GCP、K8s），也能在本機練出網路排查與 SRE Debug 直覺。  
> 🧱 方法：從模擬環境 → 挑戰實戰 → 內化思維。

---

## 一、打造「本地小型網路世界」

### 🧰 練功工具箱（全開源、免費）

| 類別 | 推薦工具 | 功能 |
|------|-----------|------|
| 容器平台 | **Docker / Podman / Colima** | 快速建立多主機模擬環境 |
| 網路拓樸 | **Docker Compose Network / Mininet / kind** | 模擬不同網段、VPC、K8s |
| Web / DNS | **nginx + bind9** | 練反向代理與 DNS 查詢 |
| 封包分析 | **tcpdump + Wireshark** | 練抓封包、觀察 handshake |
| 負載測試 | **hey / wrk / k6** | 模擬壓力、觀察效能瓶頸 |
| 應用服務 | **Flask / Node.js / Go http.Server** | 練 API、session、TLS |

---

## 🧱 實作 1：Docker Compose 網路沙盒

> 🎯 練習 L2–L4：網段、路由、封包連線。

**`docker-compose.yml` 範例**

```yaml
version: '3.8'
services:
  web:
    image: nginx
    ports:
      - "8080:80"
    networks:
      - netA

  api:
    image: kennethreitz/httpbin
    networks:
      - netA

  client:
    image: curlimages/curl
    command: tail -f /dev/null
    networks:
      - netA

networks:
  netA:
    driver: bridge
```

## 練習指令
docker exec -it <client容器ID> sh

```
## L3 測通
ping api

## L4 測 Port
nc -vz api 80

## L7 測 HTTP
curl -v http://api/get

## L2~L4 抓封包
tcpdump -i eth0 host api
```

學到：
> Docker network = mini VPC

> ping 檢查 L3，nc 檢查 L4，tcpdump 看實際封包流。

## 實作 2：建一個「TLS 世界」

練習 L6：HTTPS、TLS、憑證。

```
# 1. 建立自簽憑證
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365

# 2. 啟動 HTTPS server
python3 -m http.server 8443 --bind 0.0.0.0 --directory . --certfile cert.pem --keyfile key.pem

# 3. 測試
curl -vk https://localhost:8443
openssl s_client -connect localhost:8443
```
學到：

> TLS handshake 流程與錯誤訊息。

> openssl s_client 可看憑證鏈與 cipher。

> tcpdump port 8443 看 TLS 加密封包。

# 實作 3：Session / Cookie / CSRF 實戰

練習 L5–L7：session、登入、cookie 傳遞。
```
# 啟動 httpbin
docker run -d -p 8081:80 kennethreitz/httpbin

# 登入模擬
curl -v -c cookies.txt -X POST http://localhost:8081/cookies/set?session=abc123

# 用 cookie 再次請求
curl -v -b cookies.txt http://localhost:8081/cookies
```

學到：

> -c 寫 cookie 檔，-b 帶 cookie 模擬登入狀態。

> 檢查 header 裡的 Set-Cookie / Cookie 行為。

> 模擬 CSRF / Session sticky 問題。

## 模擬 Incident（實戰挑戰）

每次只練一層，訓練「排查肌肉」。

| 層級 | 狀況            | 練習工具                               |
| -- | ------------- | ---------------------------------- |
| L3 | ping 不通       | `ip route`, `traceroute`, `mtr`    |
| L4 | port timeout  | `ss`, `nc`, `iptables`             |
| L5 | session 掉線    | `curl -b`, `redis-cli`             |
| L6 | HTTPS 錯誤      | `openssl s_client`, `curl -vk`     |
| L7 | API 502 / 504 | `curl -v`, `kubectl logs`, `ngrep` |


## 💣 範例挑戰

刻意在容器裡封掉 80 port → 模擬 Connection refused

刪掉中間憑證 → 模擬 TLS 錯誤

改 nginx proxy_pass 指錯 upstream → 模擬 502

清掉 redis session → 模擬登入掉線

然後練：「猜是哪一層 → 用對的工具驗證 → 記錄觀察結果」。

## 內化思維：養成 Debug Reflex
### 🧭 1. 3 句自我檢查法
| 問題     | 層級    | 檢查工具                          |
| ------ | ----- | ----------------------------- |
| 有沒有回？  | L3–L4 | `ping`, `nc`, `tcpdump`       |
| 回的對不對？ | L6–L7 | `curl -v`, `openssl s_client` |
| 回的穩不穩？ | L2–L4 | `mtr`, `ss`, `tcpdump`        |


## 抓封包像醫生看 X 光
```
sudo tcpdump -i eth0 host 1.2.3.4 and port 443 -w capture.pcap
```
打開 Wireshark → 看三次握手、TLS 握手、HTTP Request/Response。
久了會形成直覺：

Timeout ≠ DNS 問題；
RST = Port 拒絕；
Handshake fail ≈ 憑證鏈錯誤。

## ⚔️ 3. 每週 1 題 Challenge 題
| 題目                    | 練習層級  |
| --------------------- | ----- |
| 網站開不起來                | L3–L4 |
| curl timeout 但 ping 通 | L4–L7 |
| HTTPS fail 但 HTTP OK  | L6    |
| 登入後跳出                 | L5    |
| DNS 解析錯誤              | L7    |


## 練習資源（免費）

| 類別         | 網站                                                                       |
| ---------- | ------------------------------------------------------------------------ |
| 網路模擬       | [Cisco Packet Tracer](https://www.netacad.com/courses/packet-tracer)     |
| Linux 網路入門 | [Linux Journey – Networking](https://linuxjourney.com/lesson/networking) |
| HTTP 測試    | [https://httpbin.org](https://httpbin.org)                               |
| TLS 測試     | [https://badssl.com](https://badssl.com)                                 |
| 抓封包樣本      | [Wireshark Sample Captures](https://wiki.wireshark.org/SampleCaptures)   |

## 打造個人觀測實驗室
## 小結：練功三步曲
| 階段      | 目標          | 工具 / 方法                            |
| ------- | ----------- | ---------------------------------- |
| 🧱 模擬環境 | 自建小網路       | Docker / tcpdump / curl            |
| ⚙️ 實戰挑戰 | 重現 incident | mtr / nc / openssl                 |
| 🧩 內化思維 | 建立排查直覺      | Wireshark / Runbook / 每週 Challenge |
