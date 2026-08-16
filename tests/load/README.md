# 同時実行負荷試験（k6）

同一在庫に対して同時に出荷オーダーを登録し、在庫引当の整合性が保たれるかを検証します。

初期実装では同時実行制御を意図的に入れていないため、**この試験はまず「どう壊れるか」を観測すること**が目的です。Thresholdは設定していません。

---

## 前提

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) がインストール済みであること
- PostgreSQLが起動していること（`pnpm db:up`）
- APIが起動していること（`pnpm dev` または `pnpm dev:api`）

---

## 基準データ

| 項目 | 既定値 |
|---|---|
| 対象商品 | `FD-1001` 特選ロースハム 400g |
| `onHandQuantity` | 100 |
| 同時リクエスト数 | 100 VU × 1 iteration |
| 1オーダーあたりの数量 | 10 |
| **理論上の最大成功数** | **10 件** |

要件定義 8.3 の基準と一致します。

---

## 手順

### 1. DBを試験開始状態へ戻す

```bash
pnpm load:reset
```

Order / OrderItem / Allocation を削除し、`allocatedQuantity` を0へ戻します。実在庫とマスタは変更しないため、Seedの再実行は不要です。

初回や完全に作り直したい場合のみ：

```bash
pnpm db:reset && pnpm db:migrate && pnpm db:seed
```

### 2. 負荷試験を実行する

```powershell
k6 run tests/load/concurrent-order.js
```

対象商品や条件を変える場合：

```powershell
k6 run `
  -e PRODUCT_SKU=BV-2001 `
  -e QUANTITY=10 `
  -e VUS=100 `
  tests/load/concurrent-order.js
```

| 環境変数 | 既定値 | 内容 |
|---|---|---|
| `PRODUCT_SKU` | `FD-1001` | 対象商品。SKUから商品IDと荷主IDを自動解決します |
| `QUANTITY` | `10` | 1オーダーあたりの数量 |
| `VUS` | `100` | 同時リクエスト数 |
| `API_BASE_URL` | `http://localhost:3001/api` | APIのベースURL |
| `DEMO_USER_KEY` | `demo-operator` | 実行するDemo User |
| `REQUESTED_SHIP_DATE` | `2026-08-20` | 希望出荷日 |
| `SHIPPER_ID` / `PRODUCT_ID` | （自動解決） | IDを直接指定する場合のみ |

### 3. k6の結果を記録する

サマリから以下を確認します。

| メトリクス | 内容 |
|---|---|
| `order_success` | 登録に成功したオーダー数 |
| `order_conflict_insufficient_stock` | 409（在庫不足）で拒否された数 |
| `order_conflict_other` | 409（在庫不足以外）の数 |
| `order_unexpected` | 想定外のステータス |
| `http_reqs` | 総リクエスト数 |
| `http_req_duration` | 応答時間 |

実行前後の在庫はスクリプトが `setup()` / `teardown()` でコンソールへ出力します。

### 4. DBの整合性を確認する

k6のHTTP結果だけで終わらせないことが重要です。

```bash
pnpm load:verify
```

出力内容：

| 項目 | 内容 |
|---|---|
| ① | 出荷オーダー件数（ステータス別） |
| ② | `onHandQuantity` |
| ③ | `allocatedQuantity` |
| ④ | `availableQuantity` |
| ⑤ | 有効Allocation件数（`releasedAt IS NULL`） |
| ⑥ | 有効Allocationの数量合計 |
| 整合性 | ③ と ⑥ が一致しているか |
| 実在庫超過 | ⑥ が ② を超えていないか |
| 不変条件 | ③ が ② を超えていないか |

対象SKUを変える場合：

```bash
docker compose exec -T db psql -U logimaster -d logimaster -v sku=BV-2001 < tests/load/verify-consistency.sql
```

---

## 判定の目安

### 正常な結果

```text
order_success                       10
order_conflict_insufficient_stock   90

onHandQuantity        100
allocatedQuantity     100
availableQuantity       0
有効Allocation件数      10
有効Allocation数量合計 100

整合性     OK
実在庫超過 OK
不変条件   OK
```

### 壊れている結果の例

```text
order_success                       64

onHandQuantity        100
allocatedQuantity      20   ← 在庫上は「まだ80個ある」ように見える
availableQuantity      80
有効Allocation件数      64
有効Allocation数量合計 640   ← 実際には640個分が引き当てられている

整合性     NG: allocatedQuantity と有効Allocation合計が不一致
実在庫超過 NG: 実在庫を超える引当が存在する
```

`order_success` が理論上の最大成功数を超えた時点で不整合が発生しています。

---

## 記録テンプレート

```text
## Before

Test:
- concurrent requests: 100
- initial onHandQuantity: 100
- quantity per order: 10
- product: FD-1001 特選ロースハム 400g

Result:
- order_success: XX
- order_conflict_insufficient_stock: XX
- order_conflict_other: XX
- order_unexpected: XX
- onHandQuantity: XX
- allocatedQuantity: XX
- availableQuantity: XX
- active Allocation count: XX
- active Allocation quantity total: XX
```

1回で壊れない場合はタイミング依存のため、`pnpm load:reset` → 実行 を5回程度繰り返して記録します。
