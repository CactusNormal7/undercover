import { PrismaPg } from '@prisma/adapter-pg';
import { defineConfig } from 'prisma/config';

/**
 * Configuration de la CLI Prisma (migrations, studio).
 *
 * L'exécution applicative, elle, ne passe pas par ici : le client reçoit son
 * adaptateur depuis `createDb()`, avec l'URL fournie par le Worker. Deux
 * chemins, une seule variable d'environnement.
 */
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquante (cf. .env.example)');
  return url;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `migrate` a besoin de l'URL en clair (il ouvre sa propre connexion, et une
  // shadow database) ; l'adaptateur sert au reste de la CLI, `studio` compris.
  datasource: { url: connectionString() },
  adapter: async () => new PrismaPg({ connectionString: connectionString() }),
});
