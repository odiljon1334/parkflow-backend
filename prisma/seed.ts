import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding boshlandi...')

  // ─── SuperAdmin ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where:  { username: 'admin' },
    update: {},
    create: {
      fullName:     'Super Admin',
      username:     'admin',
      passwordHash,
      role:         Role.SUPER_ADMIN,
    },
  })
  console.log('✅ SuperAdmin:', admin.username)

  // ─── Region ───────────────────────────────────────────────────────────────
  const region = await prisma.region.upsert({
    where:  { id: 'region-tashkent' },
    update: {},
    create: {
      id:   'region-tashkent',
      name: 'Toshkent',
      code: 'TSH',
    },
  })
  console.log('✅ Region:', region.name)

  // ─── TariffPlan ───────────────────────────────────────────────────────────
  const tariffPlan = await prisma.tariffPlan.upsert({
    where:  { id: 'tariff-default' },
    update: {},
    create: {
      id:          'tariff-default',
      name:        'Standart tarif',
      description: 'Toshkent uchun standart narx jadvali',
      rules: {
        create: [
          { fromMinutes: 0,    toMinutes: 180,  price: 5000,  label: '0–3 soat',     sortOrder: 0 },
          { fromMinutes: 180,  toMinutes: 360,  price: 10000, label: '3–6 soat',     sortOrder: 1 },
          { fromMinutes: 360,  toMinutes: 1440, price: 15000, label: '6–24 soat',    sortOrder: 2 },
          { fromMinutes: 1440, toMinutes: null, price: 15000, label: '1 sutkadan ko\'p', sortOrder: 3 },
        ],
      },
    },
    include: { rules: true },
  })
  console.log('✅ TariffPlan:', tariffPlan.name, `(${tariffPlan.rules.length} ta qoida)`)

  // ─── Parking ──────────────────────────────────────────────────────────────
  const parking = await prisma.parking.upsert({
    where:  { id: 'parking-demo' },
    update: {},
    create: {
      id:           'parking-demo',
      name:         'Demo Parking',
      address:      'Toshkent, Chilonzor tumani',
      capacity:     100,
      regionId:     region.id,
      tariffPlanId: tariffPlan.id,
    },
  })
  console.log('✅ Parking:', parking.name)

  // ─── Kameralar ────────────────────────────────────────────────────────────
  await prisma.camera.createMany({
    data: [
      {
        parkingId:  parking.id,
        name:       'Kirish kamerasi #1',
        type:       'ENTRY',
        ipAddress:  '192.168.1.100',
        webhookKey: 'entry-cam-secret-key',
      },
      {
        parkingId:  parking.id,
        name:       'Chiqish kamerasi #1',
        type:       'EXIT',
        ipAddress:  '192.168.1.101',
        webhookKey: 'exit-cam-secret-key',
      },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Kameralar yaratildi')

  console.log('\n🎉 Seed muvaffaqiyatli tugadi!')
  console.log('─────────────────────────────')
  console.log('Login:      admin / admin123')
  console.log('Parking ID: parking-demo')
  console.log('Region ID:  region-tashkent')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
