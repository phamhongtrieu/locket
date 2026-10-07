const bcrypt = require('bcryptjs');
const prisma = require('./config/db');
const config = require('./config/config');

async function main() {
  console.log('🌱 Đang khởi tạo dữ liệu mẫu (Seeding Database)...');

  // 1. Chỉ giữ lại duy nhất 1 gói Locket Gold 1 Năm (100.000 VNĐ)
  const singlePackage = {
    name: 'Locket Gold - Gói 1 Năm',
    duration: '1 Năm (12 Tháng)',
    price: 100000,
    originalPrice: 299000,
    description: 'Sử dụng trọn vẹn 12 tháng • Bảo hành full 100%. Hỗ trợ thiết bị iOS.',
    isBestSeller: true,
    active: true,
  };

  // Xóa hoặc ẩn các gói khác ngoài Gói 1 Năm
  await prisma.package.deleteMany({
    where: {
      name: { not: singlePackage.name }
    }
  });

  const existingPkg = await prisma.package.findFirst({
    where: { name: singlePackage.name },
  });

  if (!existingPkg) {
    await prisma.package.create({ data: singlePackage });
    console.log(`+ Đã tạo gói duy nhất: ${singlePackage.name}`);
  } else {
    await prisma.package.update({
      where: { id: existingPkg.id },
      data: singlePackage,
    });
    console.log(`= Đã cập nhật gói duy nhất: ${singlePackage.name} (${singlePackage.price} VNĐ)`);
  }

  // 2. Tạo tài khoản Admin mặc định
  const adminEmail = config.admin.email.toLowerCase().trim();
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(config.admin.password, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        balance: 1000000.0,
        role: 'ADMIN',
      },
    });
    console.log(`+ Đã tạo tài khoản Admin thành công: ${adminEmail}`);
  } else {
    console.log(`= Tài khoản Admin (${adminEmail}) đã tồn tại.`);
  }

  console.log('✅ Khởi tạo dữ liệu mẫu hoàn tất!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
