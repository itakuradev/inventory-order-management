-- 試験を繰り返すためのリセット。
-- Order / OrderItem / Allocation を削除し、引当済数量を0へ戻す。
-- マスタと実在庫（onHandQuantity）は変更しないため、Seedの再実行は不要。
--
-- 実行:
--   pnpm load:reset
--
-- 注意: 出荷オーダーの全データを削除する。開発用DBでのみ使用すること。

BEGIN;

DELETE FROM allocations;
DELETE FROM order_items;
DELETE FROM orders;

UPDATE inventories SET "allocatedQuantity" = 0 WHERE "allocatedQuantity" <> 0;

COMMIT;

\echo '===== リセット後の状態 ====='
SELECT
  (SELECT count(*) FROM orders)      AS orders,
  (SELECT count(*) FROM order_items) AS order_items,
  (SELECT count(*) FROM allocations) AS allocations;

SELECT p.sku, p.name, i."onHandQuantity", i."allocatedQuantity"
FROM inventories i
JOIN products p ON p.id = i."productId"
WHERE i."allocatedQuantity" <> 0
   OR p.sku IN ('FD-1001', 'BV-2001', 'BV-2002')
ORDER BY p.sku;
