import 'dotenv/config';

import AppDataSource from '../src/database/data-source.js';
import { Role } from '../src/database/entities/index.js';

const ROLE_NAMES = ['ADMIN', 'USER'];

async function seedRoles() {
  await AppDataSource.initialize();

  try {
    const roleRepository = AppDataSource.getRepository(Role);

    for (const name of ROLE_NAMES) {
      const existingRole = await roleRepository.findOne({
        where: { name },
      });

      if (existingRole) {
        console.log(`Role ${name} already exists`);
        continue;
      }

      const role = roleRepository.create({ name });
      await roleRepository.save(role);

      console.log(`Role ${name} created`);
    }

    console.log('Roles seed completed');
  } finally {
    await AppDataSource.destroy();
  }
}

seedRoles().catch((error) => {
  console.error('Error seeding roles:', error);
  process.exit(1);
});