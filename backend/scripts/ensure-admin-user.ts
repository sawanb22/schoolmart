import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[INFO] Checking admin users in Neon PostgreSQL...');
  
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@schoolmart.in';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminPassword123!';

  console.log(`[INFO] Desired Admin Email: ${adminEmail}`);

  // Check if admin user exists
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { email: 'admin@campusmart.in' },
        { role: 'admin' }
      ]
    }
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  if (existing) {
    console.log(`[INFO] Found existing user ID=${existing.id}, email=${existing.email}, role=${existing.role}`);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: adminEmail,
        role: 'admin',
        passwordHash: passwordHash,
        name: 'SchoolMart Admin'
      }
    });
    console.log(`[PASS] Admin user updated successfully: ID=${updated.id}, email=${updated.email}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash,
        name: 'SchoolMart Admin',
        role: 'admin',
        phone: '+919966109191'
      }
    });
    console.log(`[PASS] Admin user created successfully: ID=${created.id}, email=${created.email}`);
  }

  // Also create a fallback admin: admin@campusmart.in if distinct, so either works!
  const fallbackEmail = 'admin@campusmart.in';
  if (fallbackEmail !== adminEmail) {
    const fallbackUser = await prisma.user.findUnique({ where: { email: fallbackEmail } });
    if (!fallbackUser) {
      await prisma.user.create({
        data: {
          email: fallbackEmail,
          passwordHash: passwordHash,
          name: 'CampusMart Admin Fallback',
          role: 'admin'
        }
      });
      console.log(`[PASS] Fallback admin ${fallbackEmail} also provisioned.`);
    } else {
      await prisma.user.update({
        where: { id: fallbackUser.id },
        data: { passwordHash: passwordHash, role: 'admin' }
      });
      console.log(`[PASS] Fallback admin ${fallbackEmail} password updated.`);
    }
  }

  const allAdmins = await prisma.user.findMany({ where: { role: 'admin' } });
  console.log('[ALL ADMINS IN DATABASE]:', allAdmins.map(u => ({ id: u.id, email: u.email, role: u.role })));
  console.log(`[CREDENTIALS TO USE]:`);
  console.log(`  Email: ${adminEmail} (or admin@campusmart.in)`);
  console.log(`  Password: ${adminPassword}`);
}

main()
  .catch(err => {
    console.error('[ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
