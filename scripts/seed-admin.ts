import 'dotenv/config';

import bcrypt from 'bcrypt';

import AppDataSource from '../src/database/data-source.js';
import { Role, User } from '../src/database/entities/index.js';
import { UserStatus } from '../src/database/enums.js';

async function seedAdmin() {
  await AppDataSource.initialize();

  try {
    const roleRepository = AppDataSource.getRepository(Role);
    const userRepository = AppDataSource.getRepository(User);

    const adminName = process.env.ADMIN_NAME;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminName || !adminEmail || !adminPassword) {
      throw new Error(
        'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required',
      );
    }

    const adminRole = await roleRepository.findOne({
      where: { name: 'ADMIN' },
    });

    if (!adminRole) {
      throw new Error(
        'ADMIN role not found. Run the roles seed first.',
      );
    }

    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`Admin ${adminEmail} already exists`);
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = userRepository.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
    });

    await userRepository.save(admin);

    console.log(`Admin ${adminEmail} created`);
  } finally {
    await AppDataSource.destroy();
  }
}

seedAdmin().catch((error) => {
  console.error('Error seeding admin:', error);
  process.exit(1);
});