import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // SuperAdmin yaratish
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Super Admin',
      username: 'admin',
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  })
  console.log('SuperAdmin:', admin.username)

  // Region yaratish
  const region = await prisma.region.upsert({
    where: { id: 'region-tashkent' },
    update: {},
    create: {
      id: 'region-tashkent',
      name: 'Toshkent',
    },
  })
  console.log('Region:', region.name)

  // Parking yaratish
  const parking = await prisma.parking.upsert({
    where: { id: 'parking-demo' },
    update: {},
    create: {
      id: 'parking-demo',
      name: 'Demo Parking',
      address: 'Toshkent, Chilonzor',
      regionId: region.id,
    },
  })
  console.log('Parking:', parking.name)

  // Narx jadvali
  await prisma.pricingTier.deleteMany({ where: { parkingId: parking.id } })
  await prisma.pricingTier.createMany({
    data: [
      { parkingId: parking.id, fromMinutes: 0, toMinutes: 60, price: 5000 },
      { parkingId: parking.id, fromMinutes: 60, toMinutes: 180, price: 10000 },
      { parkingId: parking.id, fromMinutes: 180, toMinutes: 360, price: 15000 },
      { parkingId: parking.id, fromMinutes: 360, toMinutes: null, price: 20000 },
    ],
  })
  console.log('Pricing tiers created')

  // Kameralar
  await prisma.camera.createMany({
    data: [
      { parkingId: parking.id, name: 'Kirish kamerasi', type: 'ENTRY', ipAddress: '192.168.1.100' },
      { parkingId: parking.id, name: 'Chiqish kamerasi', type: 'EXIT', ipAddress: '192.168.1.101' },
    ],
    skipDuplicates: true,
  })
  console.log('Cameras created')

  console.log('\nSeed muvaffaqiyatli tugadi!')
  console.log('Login: admin / admin123')
  console.log('Parking ID:', parking.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
