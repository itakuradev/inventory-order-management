# 在庫・出荷オーダー管理システム 設計書

## 1. システム構成

本システムはモノレポ構成とする。

```text
inventory-order-management/
├─ apps/
│  ├─ web/                 # Next.js
│  └─ api/                 # NestJS
├─ packages/
│  └─ contracts/           # API契約。必要な範囲のみ共有
├─ tests/
│  └─ load/                # k6
├─ docs/
│  ├─ 01-design-principles.md
│  ├─ 02-requirements.md
│  └─ 03-system-design.md
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ package.json
```

`packages/contracts` はAPI境界で共有する型・Schemaのみを対象とする。
Domain Model、Prisma Model、Repository等は共有しない。

---

## 2. 技術スタック

| 区分 | 技術 |
|---|---|
| Frontend | Next.js / TypeScript |
| Backend | NestJS / TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Server State | TanStack Query |
| Validation | Zod |
| Monorepo | pnpm workspace |
| Local Database | Docker Compose |
| Unit / Integration Test | Jest |
| Load Test | k6 |

---

## 3. Frontend / Backend責務

### 3.1 Next.js

担当範囲：

- 画面表示
- ユーザー操作
- Demo Login
- OPERATOR / ADMINによる表示制御
- TanStack QueryによるAPI通信
- フォーム入力検証
- ローディング・最低限のエラー表示

Next.jsからDBへ直接アクセスしない。

以下はNestJS側へ集約する。

- 業務ルール
- 在庫引当
- 状態遷移
- Transaction
- Authorization
- Prisma / PostgreSQLアクセス

Next.js Route Handlersは原則使用せず、NestJS REST APIへ直接HTTP通信する。

### 3.2 NestJS

担当範囲：

- REST API
- Demo Userの解決
- Authorization
- Application UseCase
- Domain Model
- 業務ルール
- 状態遷移
- Transaction
- Repository
- Prisma
- PostgreSQL
- API入力検証
- HTTPエラー変換

---

## 4. Demo Authentication

初期版では本認証を実装しない。

Next.jsログイン画面に以下を配置する。

- 担当者としてログイン
- 管理者としてログイン

Demo UserはSeedデータとして用意する。

```text
demo-operator → OPERATOR
demo-admin    → ADMIN
```

Next.jsからDemo User識別子をAPIへ渡し、NestJS側でUser・Organization・Roleを解決する。

Authenticationは将来差し替え可能とし、Application / Domainは認証方式へ依存させない。

AuthorizationはNestJS側で実装する。

---

## 5. NestJS構成

feature単位でmoduleを分割し、その内部を責務ごとに分離する。

```text
apps/api/src/
├─ modules/
│  ├─ orders/
│  │  ├─ presentation/
│  │  ├─ application/
│  │  ├─ domain/
│  │  └─ infrastructure/
│  │
│  ├─ inventory/
│  │  ├─ presentation/
│  │  ├─ application/
│  │  ├─ domain/
│  │  └─ infrastructure/
│  │
│  └─ auth/
│
├─ prisma/
├─ common/
├─ app.module.ts
└─ main.ts
```

### presentation

- Controller
- HTTP Request / Response
- API境界

### application

- UseCase
- 処理の進行
- Transaction境界
- Domain / Repositoryの調整

### domain

- Entity
- 状態遷移
- 業務ルール
- 不変条件
- Repository interface

主な対象：

- Order
- OrderStatus
- Inventory
- Allocation

Value Object等は業務ルールを守る必要性が高い箇所に限定する。

### infrastructure

- Prisma
- PostgreSQL
- Repository実装

Generic Repository等の過剰な抽象化は行わない。

---

## 6. Domain Model

```text
Organization
 ├─ User
 ├─ Shipper
 │   └─ Product
 ├─ Warehouse
 │   └─ Inventory
 └─ Order
     └─ OrderItem
         └─ Allocation
```

### Order

1つのOrderに複数のOrderItemを持つ。

ステータス：

- `ALLOCATED`
- `HANDED_OVER`
- `CANCELLED`

許可する遷移：

```text
ALLOCATED → HANDED_OVER
ALLOCATED → CANCELLED
```

`HANDED_OVER → CANCELLED` は許可しない。

### Inventory

以下を保持する。

```text
onHandQuantity
allocatedQuantity
```

引当可能在庫は保持せず算出する。

```text
availableQuantity = onHandQuantity - allocatedQuantity
```

不変条件：

```text
onHandQuantity >= 0
allocatedQuantity >= 0
allocatedQuantity <= onHandQuantity
```

### Allocation

Allocationは独立Entityとして保持する。

引当履歴は削除せず、解除日時を記録する。

```text
releasedAt = null      # 有効
releasedAt != null     # 解除済み
```

---

## 7. DB設計

### 7.1 organizations

| カラム | 概要 |
|---|---|
| id | PK |
| name | 物流会社名 |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

初期版では1Organization固定。

---

### 7.2 users

| カラム | 概要 |
|---|---|
| id | PK |
| organizationId | FK |
| name | 表示名 |
| role | OPERATOR / ADMIN |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

パスワード等の認証情報は保持しない。

---

### 7.3 shippers

| カラム | 概要 |
|---|---|
| id | PK |
| organizationId | FK |
| code | 荷主コード |
| name | 荷主名 |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

制約：

```text
UNIQUE (organizationId, code)
```

---

### 7.4 warehouses

| カラム | 概要 |
|---|---|
| id | PK |
| organizationId | FK |
| code | 倉庫コード |
| name | 倉庫名 |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

初期Seed：

```text
八王子物流センター
```

初期版では1Warehouse固定。

---

### 7.5 products

| カラム | 概要 |
|---|---|
| id | PK |
| shipperId | FK |
| sku | 商品No |
| name | 商品名 |
| unit | 単位 |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

制約：

```text
UNIQUE (shipperId, sku)
```

商品は荷主に所属する。

初期版の`unit`は「個」固定とする。

---

### 7.6 inventories

| カラム | 概要 |
|---|---|
| id | PK |
| warehouseId | FK |
| productId | FK |
| onHandQuantity | 実在庫 |
| allocatedQuantity | 引当済在庫 |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

制約：

```text
UNIQUE (warehouseId, productId)

onHandQuantity >= 0
allocatedQuantity >= 0
allocatedQuantity <= onHandQuantity
```

`shipperId`は保持せずProduct経由で特定する。

---

### 7.7 orders

| カラム | 概要 |
|---|---|
| id | PK |
| organizationId | FK |
| shipperId | FK |
| orderNumber | オーダー番号 |
| destinationName | 出荷先名称 |
| destinationAddress | 出荷先住所 |
| requestedShipDate | 希望出荷日 |
| status | OrderStatus |
| createdByUserId | FK |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

制約：

```text
UNIQUE (organizationId, orderNumber)
```

---

### 7.8 order_items

| カラム | 概要 |
|---|---|
| id | PK |
| orderId | FK |
| productId | FK |
| quantity | 注文数量 |
| createdAt | 作成日時 |

制約：

```text
quantity > 0
```

正の整数をDB上の不変条件とする。
具体的な制約実装方法は実装時に決定する。

---

### 7.9 allocations

| カラム | 概要 |
|---|---|
| id | PK |
| orderItemId | FK |
| inventoryId | FK |
| quantity | 引当数量 |
| releasedAt | 引当解除日時 nullable |
| createdAt | 引当日時 |

Allocationは削除せず履歴を保持する。

有効なAllocationの合計と`Inventory.allocatedQuantity`の整合性をTransaction内で保証する。

---

## 8. Transaction設計

### 8.1 出荷オーダー登録

以下を1Transactionとして扱う。

```text
在庫確認
  ↓
Order作成
  ↓
OrderItem作成
  ↓
Allocation作成
  ↓
Inventory.allocatedQuantity更新
```

1商品でも引当不可の場合は全体をRollbackする。

部分引当は行わない。

### 8.2 キャンセル

以下を1Transactionとして扱う。

```text
Order
ALLOCATED → CANCELLED

Allocation
releasedAt更新

Inventory
allocatedQuantity減算
```

途中状態を残さない。

### 8.3 HANDED_OVER

```text
Order
ALLOCATED → HANDED_OVER
```

Allocationは維持する。

`onHandQuantity`、`allocatedQuantity`は変更しない。

実際の出荷完了処理は対象外。

---

## 9. API契約共有

`packages/contracts`にはNext.js / NestJS間のAPI契約のみを配置する。

対象例：

- CreateOrder request
- Order response
- Inventory response
- OrderStatus
- Zod Schema

Domain ModelやRepositoryは共有しない。

---

## 10. Frontend State

TanStack Queryをサーバー状態管理に使用する。

対象例：

- Order一覧
- Order詳細
- Inventory一覧
- Create Order Mutation
- Cancel Order Mutation
- Hand Over Mutation
- Inventory Adjustment Mutation

React local stateは画面内の一時的なUI状態へ限定する。

---

## 11. Test

テストは最低限とする。

### Jest

優先対象：

- 在庫引当の業務ルール
- Order状態遷移
- キャンセル
- Transactionを含む主要処理
- ADMIN / OPERATOR認可

### k6

同一商品への同時100リクエストを実行する。

基準：

```text
onHandQuantity = 100
1オーダーあたりquantity = 10
```

最終的に以下を保証する。

```text
成功オーダー <= 10
allocatedQuantity <= 100
availableQuantity >= 0
```

初期実装では同時実行制御方式を固定せず、負荷試験結果を基に設計を見直す。

---

## 12. Seed

最低限以下を投入する。

- Organization × 1
- Warehouse × 1
  - 八王子物流センター
- Demo OPERATOR
- Demo ADMIN
- 複数のShipper
- 複数のProduct
- Inventory

商品は食品・日用品を想定する。

---

## 13. 初期版の設計範囲

以下は設計・実装対象外とする。

- 本認証
- Cognito
- 入荷
- ロケーション管理
- ロット・賞味期限
- ピッキング
- 梱包
- 出荷完了
- 配送・配車
- 請求
- 生成AI
- RPA
- AWSデプロイ

設計・実装上必要な補助クラス、補助カラム、共通処理は追加可能とする。ただし、主要な業務ルールとレイヤー責務は本設計を基準とする。
