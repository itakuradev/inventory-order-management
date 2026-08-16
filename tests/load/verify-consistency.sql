-- 同時実行試験後のDB整合性確認。
--
-- 実行:
--   pnpm load:verify
-- 対象SKUを変える場合:
--   docker compose exec -T db psql -U logimaster -d logimaster -v sku=BV-2001 < tests/load/verify-consistency.sql

\if :{?sku}
\else
\set sku 'FD-1001'
\endif

\echo '===== 対象商品 ====='
SELECT p.sku, p.name
FROM products p
WHERE p.sku = :'sku';

\echo '===== ① 出荷オーダー件数（ステータス別） ====='
SELECT o.status, count(DISTINCT o.id) AS orders
FROM orders o
JOIN order_items oi ON oi."orderId" = o.id
JOIN products p ON p.id = oi."productId"
WHERE p.sku = :'sku'
GROUP BY o.status
ORDER BY o.status;

\echo '===== ②〜⑥ 在庫とAllocationの整合性 ====='
SELECT
  i."onHandQuantity"                                        AS "② onHand",
  i."allocatedQuantity"                                     AS "③ allocated",
  i."onHandQuantity" - i."allocatedQuantity"                AS "④ available",
  COALESCE(active.allocation_count, 0)                      AS "⑤ 有効Allocation件数",
  COALESCE(active.quantity_total, 0)                        AS "⑥ 有効Allocation数量合計",
  i."allocatedQuantity" - COALESCE(active.quantity_total, 0) AS "③-⑥ の差分",
  CASE
    WHEN i."allocatedQuantity" <> COALESCE(active.quantity_total, 0)
      THEN 'NG: allocatedQuantity と有効Allocation合計が不一致'
    ELSE 'OK'
  END                                                       AS "整合性",
  CASE
    WHEN COALESCE(active.quantity_total, 0) > i."onHandQuantity"
      THEN 'NG: 実在庫を超える引当が存在する'
    ELSE 'OK'
  END                                                       AS "実在庫超過",
  CASE
    WHEN i."allocatedQuantity" > i."onHandQuantity"
      THEN 'NG: allocatedQuantity が onHandQuantity を超えている'
    ELSE 'OK'
  END                                                       AS "不変条件"
FROM inventories i
JOIN products p ON p.id = i."productId"
LEFT JOIN (
  SELECT a."inventoryId",
         count(*)         AS allocation_count,
         sum(a.quantity)  AS quantity_total
  FROM allocations a
  WHERE a."releasedAt" IS NULL
  GROUP BY a."inventoryId"
) active ON active."inventoryId" = i.id
WHERE p.sku = :'sku';

\echo '===== 参考: 全体のAllocation内訳 ====='
SELECT
  count(*) FILTER (WHERE a."releasedAt" IS NULL)     AS active_allocations,
  count(*) FILTER (WHERE a."releasedAt" IS NOT NULL) AS released_allocations,
  count(*)                                           AS total_allocations
FROM allocations a
JOIN inventories i ON i.id = a."inventoryId"
JOIN products p ON p.id = i."productId"
WHERE p.sku = :'sku';
