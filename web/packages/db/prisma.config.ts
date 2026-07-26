import { PrismaPg } from '@prisma/adapter-pg';
import { defineConfig } from 'prisma/config';

/**
 * Configuration de la CLI Prisma (migrations, studio).
 *
 * L'exécution applicative, elle, ne passe pas par ici : le client reçoit son
 * adaptateur depuis `createDb()`, avec l'URL fournie par le Worker. Deux
 * chemins, une seule variable d'environnement.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  adapter: async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL manquante (cf. .env.example)');
    return new PrismaPg({ connectionString });
  },
});
