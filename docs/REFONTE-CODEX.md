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

## Passe 3 : analyse et visualisations

### Résultat

Les treize pages sont conservées, avec une fiche individuelle. Chaque page commence par des constats français calculés dans les modules purs de `src/lib/insights/`. L’accueil en comporte cinq. Les tableaux sont réservés aux inventaires, aux diagnostics et aux données qui doivent être relues ligne par ligne.

| Page | Lecture principale |
| --- | --- |
| Le matin | Bande d’alertes avec valeurs et seuils, cinq constats, quatre tuiles, sparklines disponibles, effort quotidien, santé IA, marches d’onboarding, contrôles « doit rester vide » |
| Rétention et usage | Heatmap J1/J7/J30, écrans et sorties triés, découverte et conversion, versions, démarrage P95 par appareil/version/plateforme |
| Entonnoir | Cinq marches, pertes en nombre et pourcentage, abandons sans comptes ajoutés, motifs de connexion, activation J0 |
| Services scolaires | Actifs, échecs de synchronisation, médianes, premières données ; seuils 5 % et 20 % |
| Moteur IA | Requêtes, pannes, refus, coût, moyenne mobile, routes empilées, jauges de qualité, IA locale/client, dénominateur des options, cache et rebonds |
| Banque de questions | Qualité avec votes et quiz servis, signalements par contenu/question, alias inconnus en tête, inventaire |
| Rituel | Journées validées, élèves ayant fait un effort, séries rompues, efforts, notifications et comparaison pondérée des horaires |
| Amis | Graphe SVG de force, filtre établissement, recentrage, plus grand groupe par défaut, « Tout afficher », statistiques du réseau |
| Élèves | Choroplèthe France, cinq pastilles DROM, non localisés, établissements/effectifs, noms affichés et recherche |
| Fiche élève | XP quotidienne, efforts, constats et quotas conservés |
| Courrier / Support / Configuration | Fonctions conservées, constats, aperçu cohérent et formulaires désactivés dans l’aperçu |
| Erreurs | Familles, motifs, arrêts brutaux dans le temps et santé de l’instrumentation |

Les séries utilisent la palette Nuit, des titres, légendes, libellés accessibles et états vides. Les courbes mettent en évidence les sept derniers jours ; les moyennes mobiles exigent sept jours calendaires renseignés. Les jours absents restent nuls et interrompent la courbe. La heatmap distingue les cohortes non mesurées des vrais zéros. Les blocs affichent source, fenêtre et réserves. Les polices et le fond de carte de l’application n’ont pas été modifiés.

### Honnêteté des mesures

Le socle ne contient **aucun historique quotidien des actifs ou des nouveaux**, ni de snapshot antérieur de `v_pouls`. Le graphique de l’accueil affiche donc uniquement les deux points d’aujourd’hui et laisse les vingt-neuf jours précédents vides, avec une explication. Les tuiles d’actifs et d’étoile polaire signalent l’absence d’historique et de comparaison. Les sparklines et différences du coût IA et des journées validées sont calculées depuis leurs vraies séries. Fournir une vue quotidienne et un historique de pouls est nécessaire pour compléter ces deux premières tuiles ; aucun schéma Supabase n’a été inventé.

`v_crashs` est agrégée sur quatorze jours : `dernier` ne permet pas de redistribuer le total par date. La série temporelle porte donc sur `v_morts_brutales`, avec une réserve explicite. Les pannes IA sont distinctes des refus attendus. Le coût par actif utilise `v_pouls.actifs_7j`, jamais la somme des élèves quotidiens. Les pourcentages sont formatés en français, avec arrondi d’affichage ; les effectifs restent entiers. Les états vides des vues de surveillance sont verts uniquement après une lecture réussie, rouges si une ligne est retournée et indéterminés en cas d’erreur.

La carte utilise uniquement `school_name`, avec normalisation des accents, villes des académies demandées et indices d’établissements fournis. Un nom correspondant à plusieurs régions reste non localisé. Les homonymes nationaux comme Jules Verne restent des **hypothèses non vérifiées**, signalées dans l’interface. Les comptes démo / Science Factor sont exclus ; les non localisés sont comptés et listés. Le GeoJSON original reste intact, les anneaux sont orientés sur une copie en mémoire pour d3-geo.

Le graphe déduplique les amitiés réciproques, ignore les liens non acceptés, les auto-liens, les profils absents et les comptes de test. Avant passage au client, les identifiants sont remplacés par des clés numériques propres au rendu ; les noms viennent de `profiles_public.display_name`. Les groupes ont au moins deux élèves, les isolés sont séparés. Le filtre recalcule les degrés sur le sous-réseau. La simulation se charge et calcule côté client, se termine avant affichage et est nettoyée au démontage ; pas d’animation permanente.

### Accès et mode aperçu

`readView` centralise maintenant toutes les lectures des pages, y compris les tables de gestion et la fiche individuelle. Les tables ont une liste explicite de colonnes. `profiles` reste limité aux champs utiles ; `full_name` et `usage_limits` ne sont accessibles que via `profile_detail`, avec un identifiant individuel obligatoire. La relation d’amitié utilise bien `user_id`, corrigé dans la fiche. Les actions d’écriture existantes conservent leur vérification de session.

`?apercu=1` est lu explicitement par chaque page et passé à toutes ses lectures. Aucun cookie, état global ou repli automatique ne choisit les fixtures. La navigation écrit explicitement le paramètre dans les liens ; le bouton « Quitter l’aperçu fictif » le retire. Le bandeau « Aperçu avec des données fictives, rien ici n’est réel » apparaît sur chaque page. La session HMAC est requise **avant** le choix des fixtures, aussi en production. Les formulaires sont désactivés et transmettent un marqueur rejeté par les actions serveur.

`src/lib/fixtures/index.ts` contient une fonction typée par vue ou table, sans aléatoire : scénario figé au 10 septembre 2026, 60 installations, 40 comptes/élèves, 30 jours, deux groupes de 18 et 12 élèves et 10 isolés. Cinq élèves restent non localisés. Les tests recoupent installations, comptes, abandons, démos, efforts et notifications.

### Vérification effectuée et limites de l’environnement

- `npx eslint .` : vert.
- `npx tsc --noEmit` : vert, TypeScript strict. Les contrats ciblés des API d3 utilisées sont déclarés dans `src/types/d3-contracts.d.ts`, car les nouveaux paquets DefinitelyTyped ne sont pas disponibles hors ligne. Leurs dépendances officielles restent déclarées et verrouillées pour l’installation normale.
- `npm run test:insights` : neuf tests verts, incluant fenêtres calendaires, dénominateurs nuls, ambiguïtés géographiques, confidentialité du graphe, doublons et réseau de 500 élèves.
- `npm run verify:preview` : rendu serveur des treize pages et de la fiche, avec les vrais composants Recharts, la carte SVG et les fixtures. Cookie HMAC de test, refus sans session et **zéro lecture Supabase réelle** vérifiés. Les textes de chaque page ont été relus ; les avertissements React sur les titres SVG ont été corrigés.
- `grep -rn "—\|–" src/` : aucune occurrence.
- `npx next build` : **non vert, bloqué par l’environnement**. Le registre npm est inaccessible (`ENOTFOUND`), `d3-force` ne peut pas être installé et les trois polices `next/font/google` ne peuvent pas être téléchargées. Next signale aussi une tentative de correction du lockfile SWC dans le workspace parent. Le module d3-geo a pu être récupéré dans le cache npm local existant ; aucun substitut de simulation n’a été ajouté.
- `npm run dev` : bloqué par `listen EPERM` sur le port 3000. L’outil Node REPL du navigateur intégré est également indisponible. La vérification est donc statique : **pas de validation visuelle interactive ni de mesure de fluidité du graphe** dans cette session.

Les binaires ont été lancés avec le Node Homebrew disponible (25.7.0), car le Node `/usr/local/bin/node` échoue avec `SecItemCopyMatching failed -50`. Le code applicatif n’utilise aucune API exigeant Node 22 ; un passage effectif sur Node 20 reste à effectuer avec le build de déploiement.

Le `package-lock.json` autonome a été reconstruit depuis les résolutions du workspace puis normalisé avec `npm install --package-lock-only --workspaces=false --offline`. Les seules nouvelles dépendances applicatives sont d3-geo, d3-force, d3-scale et d3-shape, accompagnées de leurs types. L’installation complète des nouveaux modules n’a pas abouti dans le bac à sable.

Les fichiers [de vérification statique](verification-apercu/index.html) contiennent uniquement des données fictives, avec CSS compilée et polices déjà présentes dans le cache de développement. [Le résultat détaillé](verification-apercu/resultats.json) liste les pages et leurs SVG. Le graphe y montre son état avant calcul client ; les contrôles n’y sont pas interactifs.

### Reprendre la vérification hors du bac à sable

```sh
npm install --include=dev
npm run test:insights
npx eslint .
npx tsc --noEmit
npx next build
npm run dev
```

Se connecter puis ouvrir `http://localhost:3000/dashboard?apercu=1`. Parcourir les treize pages et une fiche, sur desktop et mobile. Tester le focus/survol de la carte, les DROM, le filtre d’établissement, « Tout afficher » et le recentrage du graphe, puis la sortie de l’aperçu. Vérifier après installation que les types officiels d3 et le build Node 20 passent. Confirmer les schémas des lectures individuelles sur la base réelle et les noms d’établissements à mesure qu’ils arrivent. Aucun changement de configuration, courrier envoyé, migration ou déploiement n’a été effectué.
