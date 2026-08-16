import http from 'k6/http';
import { Counter } from 'k6/metrics';

/**
 * 同一在庫に対する同時出荷オーダー登録の負荷試験。
 *
 * 目的は「現状の実装がどう壊れるか」を観測することなので、Thresholdは設定しない。
 * 判定は k6 のカウンタとテスト後のDB整合性確認（verify-consistency.sql）で行う。
 */

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001/api';
const DEMO_USER_KEY = __ENV.DEMO_USER_KEY || 'demo-operator';
const PRODUCT_SKU = __ENV.PRODUCT_SKU || 'FD-1001';
const QUANTITY = Number(__ENV.QUANTITY || 10);
const VUS = Number(__ENV.VUS || 100);
const REQUESTED_SHIP_DATE = __ENV.REQUESTED_SHIP_DATE || '2026-08-20';

export const options = {
  scenarios: {
    concurrent_orders: {
      // 各VUが必ず1回ずつ実行するため、VUS件のリクエストが確定する。
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '30s',
    },
  },
};

const orderSuccess = new Counter('order_success');
const orderInsufficientStock = new Counter('order_conflict_insufficient_stock');
const orderConflictOther = new Counter('order_conflict_other');
const orderUnexpected = new Counter('order_unexpected');

const HEADERS = {
  'Content-Type': 'application/json',
  'x-demo-user-key': DEMO_USER_KEY,
};

function getJson(path) {
  const response = http.get(`${API_BASE_URL}${path}`, { headers: HEADERS });
  if (response.status !== 200) {
    throw new Error(`GET ${path} に失敗しました: status=${response.status} body=${response.body}`);
  }
  return response.json();
}

/** 在庫一覧のレスポンスには商品IDと荷主IDが含まれるため、SKUだけで対象を特定できる。 */
function findInventoryBySku() {
  const page = getJson(`/inventories?keyword=${encodeURIComponent(PRODUCT_SKU)}&pageSize=100`);
  const inventory = page.items.find((item) => item.product.sku === PRODUCT_SKU);

  if (!inventory) {
    throw new Error(`SKU ${PRODUCT_SKU} の在庫が見つかりません`);
  }

  return inventory;
}

function readErrorCode(response) {
  try {
    return response.json('code');
  } catch (error) {
    return `(JSONではないレスポンス: ${error})`;
  }
}

export function setup() {
  const inventory = findInventoryBySku();
  const theoreticalMaxSuccess = Math.floor(inventory.availableQuantity / QUANTITY);

  console.log(
    [
      '',
      '===== 試験条件 =====',
      `商品            : ${inventory.product.sku} ${inventory.product.name}`,
      `荷主            : ${inventory.shipper.code} ${inventory.shipper.name}`,
      `同時リクエスト数: ${VUS}`,
      `1オーダー数量   : ${QUANTITY}`,
      '',
      '----- 実行前の在庫 -----',
      `onHandQuantity    : ${inventory.onHandQuantity}`,
      `allocatedQuantity : ${inventory.allocatedQuantity}`,
      `availableQuantity : ${inventory.availableQuantity}`,
      '',
      `理論上の最大成功数: ${theoreticalMaxSuccess} 件`,
      '====================',
      '',
    ].join('\n'),
  );

  if (theoreticalMaxSuccess >= VUS) {
    console.warn(
      `警告: 引当可能在庫が十分にあるため全リクエストが成功します。QUANTITY を増やすか在庫の少ない商品を指定してください。`,
    );
  }

  return {
    // 環境変数で明示された場合はそちらを優先する。
    shipperId: __ENV.SHIPPER_ID || inventory.shipper.id,
    productId: __ENV.PRODUCT_ID || inventory.product.id,
    before: {
      onHandQuantity: inventory.onHandQuantity,
      allocatedQuantity: inventory.allocatedQuantity,
      availableQuantity: inventory.availableQuantity,
    },
    theoreticalMaxSuccess,
  };
}

export default function (data) {
  const payload = JSON.stringify({
    shipperId: data.shipperId,
    destinationName: `負荷試験出荷先 VU${__VU}`,
    destinationAddress: '東京都八王子市',
    requestedShipDate: REQUESTED_SHIP_DATE,
    items: [{ productId: data.productId, quantity: QUANTITY }],
  });

  const response = http.post(`${API_BASE_URL}/orders`, payload, {
    headers: HEADERS,
    tags: { name: 'POST /orders' },
  });

  if (response.status >= 200 && response.status < 300) {
    orderSuccess.add(1);
    return;
  }

  if (response.status === 409) {
    const code = readErrorCode(response);
    if (code === 'INSUFFICIENT_STOCK') {
      orderInsufficientStock.add(1);
    } else {
      orderConflictOther.add(1);
      console.log(`409(在庫不足以外): code=${code} body=${response.body}`);
    }
    return;
  }

  orderUnexpected.add(1);
  console.log(`想定外: status=${response.status} body=${response.body}`);
}

export function teardown(data) {
  const inventory = findInventoryBySku();

  console.log(
    [
      '',
      '===== 実行後の在庫 =====',
      `onHandQuantity    : ${data.before.onHandQuantity} -> ${inventory.onHandQuantity}`,
      `allocatedQuantity : ${data.before.allocatedQuantity} -> ${inventory.allocatedQuantity}`,
      `availableQuantity : ${data.before.availableQuantity} -> ${inventory.availableQuantity}`,
      '',
      `理論上の最大成功数: ${data.theoreticalMaxSuccess} 件`,
      '（実際の成功数は下のサマリの order_success を参照）',
      '',
      'Allocationとの整合性は次で確認してください:',
      '  pnpm load:verify',
      '========================',
      '',
    ].join('\n'),
  );
}
