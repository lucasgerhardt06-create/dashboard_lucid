# Refonte du dashboard LUCID

## Architecture

Le dashboard utilise des Server Components dynamiques. `src/lib/views.ts` contient une interface TypeScript pour chaque vue analytics et `readView`, la porte d’entrée unique pour les lire. Cette fonction vérifie la session puis utilise le client Supabase `service_role`. Une erreur de vue est journalisée côté serveur et devient un état lisible dans l’interface.

La session est un cookie HMAC SHA-256 de sept jours. Le middleware le vérifie et les actions serveur le vérifient à nouveau. Le mot de passe vient de `DASHBOARD_PASSWORD` et est comparé en temps constant.

## Pages

La navigation contient Le matin, Rétention et usage, Entonnoir, Services scolaires, Moteur IA, Banque de questions, Rituel, Amis, Élèves, Courrier, Support, Erreurs et Configuration. Chaque bloc affiche sa vue source, sa fenêtre donnée par la vue et un état honnête quand aucune donnée de production n’existe.

Les actions d’écriture autorisées sont limitées aux quotas IA de `profiles.usage_limits`, au courrier, à `app_config` et à `app_banners`. La configuration écrit un journal dans les logs serveur. Les changements maintenance et kill switch demandent deux confirmations.

## Retiré

Les pages de partage de notes, feed vidéo, classement, quêtes, géographie, analyste IA et leurs dépendances ont été retirées. Elles se fondaient sur des tables ou fonctionnalités abandonnées. L’analyste IA n’est pas remis en place car ses sources précédentes ne correspondent pas aux nouvelles vues.

## Reste à faire

L’envoi push du courrier reste déclenché depuis l’app car l’Edge Function exige le JWT d’un membre `lucid_staff`. Les gestes de correction de la banque IA restent en SQL. Les écrans Courrier peuvent encore être enrichis avec les compteurs de lecture, votes et réponses et avec l’aperçu d’audience avant publication.

## Vérifier

Copier `.env.example` vers `.env.local`, définir les quatre variables obligatoires, puis lancer `npx eslint .`, `npx next build` et `rg -n '[\\u2013\\u2014]' src/`. Vérifier aussi qu’aucune clé n’apparaît dans `.next/static` après le build.
