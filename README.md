# Lucid · Tableau de bord

Cockpit interne de LUCID, construit avec Next.js 16 et le socle analytics Supabase.

## Lancer en local

1. Copier `.env.example` vers `.env.local`.
2. Renseigner les quatre variables obligatoires : l’URL Supabase, la clé `service_role`, le mot de passe du dashboard et un secret long et aléatoire.
3. Installer les dépendances avec `npm install`.
4. Lancer `npm run dev` puis ouvrir `http://localhost:3000`.

Les lectures Supabase sont exclusivement faites par le serveur. Ne jamais rendre publique la clé `SUPABASE_SERVICE_ROLE_KEY`.

## Vérifier

```sh
npx eslint .
npx next build
rg -n '[\\u2013\\u2014]' src/
```

## Déployer sur Infomaniak

Utiliser le mode Node.js avec Node 20 ou 24. Définir les variables d’environnement dans l’interface Infomaniak, installer avec `npm install`, construire avec `npm run build`, puis démarrer avec `npm start`. Les variables nécessaires sont `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DASHBOARD_PASSWORD` et `DASHBOARD_SECRET`.

Le guide pas à pas (créer le site Node dans le Manager, poser les variables, envoyer le code, construire) est dans `DEPLOIEMENT.md` à la racine du workspace. Paquet prêt à envoyer : `release/lucid-dashboard-2026-09-10.zip`, à régénérer avec :

```sh
rm -f release/*.zip
zip -qr release/lucid-dashboard-$(date +%Y-%m-%d).zip . -x 'node_modules/*' '.next/*' 'release/*' '.env.local' '*.DS_Store'
```

## Pièges connus

- Le `node_modules` du workspace n'embarque pas le binaire SWC natif : sur un Mac Apple Silicon, lancer `npm install --no-save @next/swc-darwin-arm64@16.1.5` à la racine du workspace avant `npx next build`. Sur le serveur Linux, `npm install` le résout tout seul.
- Le client Supabase est créé paresseusement dans `src/lib/supabase-admin.ts` : sans cela, `next build` échoue sur `supabaseUrl is required`, faute de variables au moment de la collecte des pages.
- `middleware.ts` est déprécié en Next 16 (à renommer `proxy.ts` un jour) mais fonctionne encore.
