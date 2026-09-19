# NexusTalent — Frontend

Interface web de NexusTalent : recherche de candidats en langage naturel, ingestion et validation de CV, exploration du graphe de relations, gestion des demandes RGPD, des utilisateurs et des notifications.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives)
- **Zustand** — état global léger (session, thème, préférences UI)
- **TanStack Query** — fetching, cache et polling côté serveur
- **React Hook Form + Zod** — formulaires et validation
- **react-force-graph-2d** — visualisation du graphe de candidats

## Architecture

```
app/
  (auth)/          pages publiques : login, mot de passe oublié
  (app)/            pages protégées (layout avec sidebar + rehydratation de session)
    search/          recherche de candidats en langage naturel
    ingestion/        upload et validation des CV
    graph/             exploration du graphe de relations
    gdpr/              registre des demandes RGPD (admin)
    users/             gestion des collaborateurs (admin)
    settings/          préférences utilisateur et notifications
components/
  layout/           sidebar (fixe desktop / drawer mobile), topbar, dropdown notifications
  search/ shared/ ui/  composants métier et primitives shadcn
lib/
  api/               un module par domaine, tous les appels HTTP vers le backend FastAPI
  store.ts           état global Zustand (session, thème, densité d'affichage)
types/                types partagés (Candidat, CV, User, Notification)
```

### Couche API (`lib/api/`)

Chaque module (`auth`, `candidats`, `ingestion`, `gdpr`, `users`, `notifications`) expose des fonctions typées qui appellent l'API FastAPI via le client partagé `lib/api/client.ts` :

- injection automatique du header `Authorization: Bearer <token>`,
- rafraîchissement automatique du token à l'expiration (401 → `/auth/refresh` → nouvelle tentative, une seule fois),
- upload avec suivi de progression réel (XHR) pour les CV,
- mapping des rôles backend (`rh_interne`) ↔ frontend (`rh`).

Les tokens sont stockés en `localStorage` (pas de cookies — cohérent avec un backend Bearer-only sans session serveur).

### Session

`app/(app)/layout.tsx` réhydrate la session au chargement : si un token est présent en `localStorage`, l'utilisateur courant est récupéré via `GET /auth/me` avant toute redirection vers `/login`.

## Prérequis

- Node.js 20+
- Le backend NexusTalent (`nexus-talent-back`) lancé et accessible (voir son README)

## Démarrage en local

```bash
npm install
cp .env.example .env.local
# éditer .env.local si le backend ne tourne pas sur http://localhost:8000
npm run dev
```

L'application est servie sur `http://localhost:3000`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (hot reload) |
| `npm run build` | Build de production (`next build`) |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm run clean` | Nettoie le cache `.next` |

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de base de l'API FastAPI (défaut : `http://localhost:8000`) |

## Responsive

L'interface est utilisable de mobile à desktop :

- **Sidebar** : fixe et rétractable (`w-16`/`w-60`) à partir de `lg` (1024px) ; en dessous, elle devient un drawer (`Sheet` shadcn) ouvert via le bouton hamburger du header et fermé automatiquement à la navigation.
- **Tableaux back-office** (`users`, `gdpr`, `ingestion`) : tableau complet à partir de `md` (768px), liste de cartes empilées en dessous — le tableau brut n'est pas praticable sur petit écran dès qu'il contient des contrôles interactifs (select, boutons d'action).
- Formulaires et grilles de statistiques passent en colonne unique ou réduite sous `sm`/`md` selon leur densité.

## Rôles et accès

Trois rôles alignés sur le backend : `recruteur`, `rh`, `admin`. Les pages `/gdpr` et `/users` sont réservées aux administrateurs côté backend (l'UI les affiche mais toute action est validée/rejetée par l'API selon le rôle réel de l'utilisateur connecté).

## Build & déploiement

```bash
npm run build
npm run start
```

Le build produit une sortie `standalone` (`next.config.ts`), déployable telle quelle avec Node.js sans dépendre du reste du repo (`node .next/standalone/server.js`).

## Limites connues

- Certaines données affichées en liste (ex. CV en attente) sont enrichies via un second appel API à l'ouverture du détail, car l'endpoint de liste backend ne renvoie pas tous les champs.
- Le score de pertinence des candidats est normalisé côté client par une heuristique simple (le backend ne garantit pas une échelle 0–100).
