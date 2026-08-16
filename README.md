# LogiMaster - 在庫・出荷オーダー管理システム

食品・日用品を取り扱う総合物流会社を想定した、在庫管理と出荷オーダー管理の初期版です。

複数の法人荷主から預かった商品を1つの物流センターで管理し、荷主から受けた出荷依頼を
出荷オーダーとして登録・在庫引当し、後続の出荷工程へ引き渡すまでを対象とします。

要件・設計の詳細は [docs/](docs/) を参照してください。

- [設計原則](docs/01-design-principles.md)
- [要件定義書](docs/02-requirements.md)
- [設計書](docs/03-system-design.md)

---

## 技術構成

| 区分 | 技術 |
|---|---|
| Monorepo | pnpm workspace |
| Frontend | Next.js 15 (App Router) / React 19 / TypeScript |
| Backend | NestJS 11 / TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Server State | TanStack Query 5 |
| Validation | Zod 4 |
| Styling | Tailwind CSS 4 |
| Test | Jest |
| Local Database | Docker Compose |

```text
apps/
├─ web/        # Next.js
└─ api/        # NestJS
packages/
└─ contracts/  # Next.js / NestJS間で共有するAPI契約のみ
```

---

## 前提

- Node.js 20以上（動作確認は v24.15.0）
- pnpm 11以上
- Docker / Docker Compose

pnpmが未インストールの場合：

```bash
npm install -g pnpm
```

---

## セットアップ

### 1. 環境変数ファイルを作成する

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 2. 依存関係をインストールし、共有パッケージをビルドする

```bash
pnpm setup
```

`pnpm setup` は以下をまとめて実行します。

- `pnpm install`
- `packages/contracts` のビルド
- Prisma Clientの生成

### 3. PostgreSQLを起動する

```bash
pnpm db:up
```

### 4. マイグレーションとSeedを実行する

```bash
pnpm db:migrate
pnpm db:seed
```

Seedで投入されるデータ：

- Organization × 1（ロジマスター物流株式会社）
- Warehouse × 1（八王子物流センター）
- Demo User × 2（`demo-operator` / `demo-admin`）
- Shipper × 4（食品・飲料・日用品）
- Product × 15、および各商品のInventory

出荷オーダーはSeedへ含めていません。画面から登録してください。

---

## 起動

```bash
pnpm dev
```

| アプリ | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001/api |

個別に起動する場合は `pnpm dev:api` / `pnpm dev:web` を使用します。

### Demo Login

ログイン画面のボタンでDemo Userを選択します。本認証は実装していません。

| ボタン | Demo User | Role |
|---|---|---|
| 担当者としてログイン | `demo-operator` | OPERATOR |
| 管理者としてログイン | `demo-admin` | ADMIN |

選択したDemo Userの識別子はHTTPヘッダー `x-demo-user-key` としてAPIへ送信され、
NestJS側でUser・Organization・Roleを解決します。

実在庫の調整はADMINのみ実行できます。OPERATORが在庫調整APIを直接呼び出した場合も
バックエンドのGuardが403で拒否します。

---

## 業務フロー

```text
Demo Login
  ↓
出荷オーダー一覧
  ↓
出荷オーダー登録（在庫確認・在庫引当を含む）
  ↓
出荷オーダー詳細
  ↓
キャンセル または 後続工程への引き渡し
```

- 1つのOrderに複数のOrderItemを持てます。
- 登録時に在庫を引き当てます。1商品でも不足する場合はオーダー全体を失敗させ、部分引当は行いません。
- 許可する状態遷移は `ALLOCATED → HANDED_OVER` と `ALLOCATED → CANCELLED` のみです。
- キャンセル時はAllocationを削除せず `releasedAt` を記録し、引当済数量を戻します。
- `availableQuantity` はDBへ保存せず `onHandQuantity - allocatedQuantity` で算出します。

---

## API

すべてのエンドポイントに `x-demo-user-key` ヘッダーが必要です。

| Method | Path | 権限 |
|---|---|---|
| GET | `/api/me` | 認証済 |
| GET | `/api/shippers` | 認証済 |
| GET | `/api/products?shipperId=` | 認証済 |
| GET | `/api/orders` | 認証済 |
| POST | `/api/orders` | 認証済 |
| GET | `/api/orders/:orderId` | 認証済 |
| POST | `/api/orders/:orderId/cancel` | 認証済 |
| POST | `/api/orders/:orderId/hand-over` | 認証済 |
| GET | `/api/inventories` | 認証済 |
| POST | `/api/inventories/:inventoryId/adjustments` | **ADMINのみ** |

一覧APIは `page` / `pageSize` / `sortBy` / `sortOrder` と各種絞り込みに対応します。

### エラー

| Status | Code | 内容 |
|---|---|---|
| 400 | `VALIDATION_FAILED` | 入力形式不正 |
| 401 | `UNAUTHENTICATED` | Demo Userを解決できない |
| 403 | `FORBIDDEN` | 権限不足 |
| 404 | `NOT_FOUND` | 対象データ不存在 |
| 409 | `INSUFFICIENT_STOCK` | 在庫不足（不足商品を `details.shortages` で返す） |
| 409 | `INVALID_ORDER_STATUS_TRANSITION` | 許可されない状態遷移 |
| 409 | `INVENTORY_INVARIANT_VIOLATION` | 在庫の不変条件違反 |
| 409 | `CONFLICT` | その他の業務エラー・競合 |
| 500 | `INTERNAL_ERROR` | 予期しないエラー |

---

## テスト・確認

```bash
pnpm test        # Jest（NestJS）
pnpm typecheck   # 全ワークスペースの型チェック
pnpm lint        # ESLint（monorepo全体）
pnpm lint:fix    # ESLintの自動修正
pnpm build       # contracts / api / web のビルド
```

### ESLint

ルートの `eslint.config.mjs`（Flat Config）でmonorepo全体を一括して検査します。

- `@eslint/js` recommended
- `typescript-eslint` recommended-type-checked（型情報を利用した検査）
- `eslint-plugin-react-hooks` / `@next/eslint-plugin-next`（`apps/web` のみ）

`next build` 時のLintは無効化し、`pnpm lint` に一本化しています。

Jestは主要な業務ルールを対象としています。

- 在庫引当と不変条件（`Inventory`）
- Order状態遷移と注文数量（`Order` / `OrderQuantity`）
- 在庫引当を含む登録Transaction（`CreateOrderUseCase`）
- キャンセル時の引当解除と在庫の戻し（`CancelOrderUseCase`）
- ADMIN / OPERATORの認可（`RolesGuard`）

---

## データベース操作

```bash
pnpm db:up       # PostgreSQL起動
pnpm db:down     # 停止
pnpm db:reset    # ボリュームごと削除して再起動（要 db:migrate / db:seed）
pnpm db:migrate  # マイグレーション適用
pnpm db:seed     # Seed投入（再実行可能）
```

在庫の不変条件はPrisma schemaでは表現できないため、初回マイグレーションのSQLへ
CHECK制約として直接記述しています。

```sql
CHECK ("onHandQuantity" >= 0)
CHECK ("allocatedQuantity" >= 0)
CHECK ("allocatedQuantity" <= "onHandQuantity")
CHECK ("quantity" > 0)  -- order_items / allocations
```

---

## 同時実行負荷試験（k6）

同一在庫への同時出荷オーダー登録を検証します。手順は [tests/load/README.md](tests/load/README.md) を参照してください。

```bash
pnpm load:reset                      # 試験開始状態へ戻す
k6 run tests/load/concurrent-order.js # 100 VU × 1 request
pnpm load:verify                     # DBの整合性を確認
```

---

## 初期版の制約

- 同時実行時の在庫競合対策（悲観ロック・楽観ロック・Serializable等）は実装していません。
  通常のTransactionのみを実装し、負荷試験の結果を基に見直す方針です。
- フロントエンドの `memo` / `useMemo` 等による最適化は、計測前のため導入していません。

## 対象外

本認証（Cognito等）、MFA、入荷、ロケーション管理、ロット・賞味期限、ピッキング、梱包、
出荷完了、配送・配車、請求、荷主向け画面、各種マスタCRUD画面、RPA、生成AI、AWSデプロイ。
