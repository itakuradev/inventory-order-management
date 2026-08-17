import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const ORGANIZATION_NAME = 'ロジマスター物流株式会社';
const WAREHOUSE_CODE = 'WH-HACHIOJI';
const WAREHOUSE_NAME = 'ロジマスター八王子物流センター';
const UNIT = '個';

type ProductSeed = {
  sku: string;
  name: string;
  onHandQuantity: number;
};

type ShipperSeed = {
  code: string;
  name: string;
  products: ProductSeed[];
};

const SHIPPERS: ShipperSeed[] = [
  {
    code: 'SHP-001',
    name: '株式会社サンプル食品',
    products: [
      { sku: 'FD-1001', name: '特選ロースハム 400g', onHandQuantity: 100 },
      { sku: 'FD-1002', name: '国産カットわかめ 50g', onHandQuantity: 480 },
      { sku: 'FD-1003', name: '減塩しょうゆ 1L', onHandQuantity: 260 },
      { sku: 'FD-1004', name: '有機トマトケチャップ 500g', onHandQuantity: 15 },
    ],
  },
  {
    code: 'SHP-002',
    name: 'サンプル飲料株式会社',
    products: [
      { sku: 'BV-2001', name: '緑茶ペットボトル 500ml', onHandQuantity: 100 },
      { sku: 'BV-2002', name: 'ミネラルウォーター 2L', onHandQuantity: 1200 },
      { sku: 'BV-2003', name: '100%オレンジジュース 1L', onHandQuantity: 340 },
      { sku: 'BV-2004', name: '無糖ブラックコーヒー 900ml', onHandQuantity: 0 },
    ],
  },
  {
    code: 'SHP-003',
    name: '株式会社サンプルライフ',
    products: [
      { sku: 'DG-3001', name: '液体洗濯洗剤 詰替用 1000ml', onHandQuantity: 620 },
      { sku: 'DG-3002', name: 'トイレットペーパー 12ロール', onHandQuantity: 180 },
      { sku: 'DG-3003', name: '台所用スポンジ 5個入', onHandQuantity: 950 },
      { sku: 'DG-3004', name: '除菌ウェットティッシュ 100枚', onHandQuantity: 30 },
    ],
  },
  {
    code: 'SHP-004',
    name: 'サンプル乳業株式会社',
    products: [
      { sku: 'DR-4001', name: '北海道牛乳 1L', onHandQuantity: 210 },
      { sku: 'DR-4002', name: 'プレーンヨーグルト 400g', onHandQuantity: 145 },
      { sku: 'DR-4003', name: '発酵バター 200g', onHandQuantity: 60 },
    ],
  },
];

const USERS = [
  { demoKey: 'demo-operator', name: 'Demo OPERATOR', role: UserRole.OPERATOR },
  { demoKey: 'demo-admin', name: 'Demo ADMIN', role: UserRole.ADMIN },
];

async function main(): Promise<void> {
  const organization =
    (await prisma.organization.findFirst({ where: { name: ORGANIZATION_NAME } })) ??
    (await prisma.organization.create({ data: { name: ORGANIZATION_NAME } }));

  const warehouse = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: WAREHOUSE_CODE } },
    update: { name: WAREHOUSE_NAME },
    create: { organizationId: organization.id, code: WAREHOUSE_CODE, name: WAREHOUSE_NAME },
  });

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { demoKey: user.demoKey },
      update: { name: user.name, role: user.role, organizationId: organization.id },
      create: { ...user, organizationId: organization.id },
    });
  }

  for (const shipperSeed of SHIPPERS) {
    const shipper = await prisma.shipper.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: shipperSeed.code } },
      update: { name: shipperSeed.name },
      create: {
        organizationId: organization.id,
        code: shipperSeed.code,
        name: shipperSeed.name,
      },
    });

    for (const productSeed of shipperSeed.products) {
      const product = await prisma.product.upsert({
        where: { shipperId_sku: { shipperId: shipper.id, sku: productSeed.sku } },
        update: { name: productSeed.name, unit: UNIT },
        create: {
          shipperId: shipper.id,
          sku: productSeed.sku,
          name: productSeed.name,
          unit: UNIT,
        },
      });

      // 再実行時に引当済数量を壊さないよう、既存の在庫は更新しない。
      await prisma.inventory.upsert({
        where: {
          warehouseId_productId: { warehouseId: warehouse.id, productId: product.id },
        },
        update: {},
        create: {
          warehouseId: warehouse.id,
          productId: product.id,
          onHandQuantity: productSeed.onHandQuantity,
          allocatedQuantity: 0,
        },
      });
    }
  }

  const productCount = SHIPPERS.reduce((total, shipper) => total + shipper.products.length, 0);
  console.log(
    `Seed完了: Organization 1 / Warehouse 1 / User ${USERS.length} / Shipper ${SHIPPERS.length} / Product ${productCount}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
