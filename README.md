## Diagram Server — Guide d’utilisation (YAML)

### Introduction
Ce serveur génère un diagramme SVG interactif à partir d’un fichier YAML. Il supporte:
- Thèmes (light/dark), layouts (TB/BT/LR/RL)
- Groupes (clusters)
- Icônes, modales (hover/click), liens
- Formes de nœuds (rectangles, polygones, flèches…)
- Reload automatique à chaque sauvegarde (SSE)

### Lancer le serveur
```bash
node index.js chemin/diagramme.yaml --theme light --layout TB --port 3000
# theme: light|dark      layout: TB|BT|LR|RL
# Ouvrir: http://localhost:3000
# Le SVG se régénère et la page se recharge à chaque sauvegarde du YAML
```

---

## Schéma YAML

### Structure minimale
```yaml
elements:
  - id: node_a
    title: "Mon nœud"
    type: system

relations:
  - from: node_a
    to: node_b
    title: "Lien"
```

### Attributs d’un élément
- id (string, requis): identifiant unique
- title (string), subtitle (string)
- type (string): person | database | api | system | tableau | default
- width, height (number): dimensions (px)
- group (string): nom du cluster
- tags (string[]): influence l’icône du titre (ex: ["user"], ["database"], ["api"], ["warning"])
- shape (object): forme du conteneur (cf. Formes)
- content_list (list): contenu structuré (sections/items)
- html_content (string): alternative avec HTML embarqué

### Contenu structuré (content_list)
```yaml
- id: account
  type: person
  title: "Table: Account"
  subtitle: "Objet central pour les candidats"
  width: 500
  height: 450
  content_list:
    - label: "Champs Modifiés"
      symbol: "edit"         # icône pour la section
      values:
        - label: "APB → Parcoursup"
          subtitle: "<b>Détail:</b> APB2024-ADV-123 → 2025_123"
          symbol: "edit"     # icône pour l’item
          url: "https://exemple.com"  # clic = ouvre un onglet
          modal:             # info contextuelle (hover/click)
            on: "hover"      # "hover" ou "click"
            title: "Exemples"
            html_content: "Ancienne: <code>APB2024-ADV-123</code><br/>Nouvelle: <code>2025_123</code>"
```

### Contenu HTML simple (html_content)
```yaml
- id: contest_score
  type: default
  width: 250
  height: 50
  html_content: |
    <div style="display:flex;align-items:center;justify-content:center;height:100%;">
      <h2 style="margin:0;font-size:16px;">ContestScore__c</h2>
    </div>
```

### Type spécial: tableau
```yaml
- id: ma_table
  type: tableau
  title: "Exemple de Tableau"
  width: 500
  height: 260
  columns: ["ID", "Nom", "Date d'inscription"]
  rows:
    - ["usr_123", "Alice", "2023-01-15"]
    - ["usr_124", "Bob", "2023-02-20"]
```

---

## Relations (arêtes)

### Attributs
- from, to (string, requis): id des éléments
- title, subtitle (string): titre/sous-titre dans la boîte de label
- content_list (list): liste à puces dans la boîte de label
- style (string): dashed | dotted
- color (string): couleur hex (ex: "#2980b9")
- width, height (number): requis si label en HTML/content_list

### Exemples
Relation texte simple:
```yaml
- from: A
  to: B
  title: "Master-Detail (1-n)"
```

Relation avec content_list (boîte HTML):
```yaml
- from: account
  to: contest
  width: 240
  height: 120
  title: "Relation Master-Detail"
  content_list:
    - label: "✓ Empêche les orphelins"
    - label: "✓ Suppression en cascade"
    - label: "✓ Rollup Summary Fields"
```

---

## Icônes et tags

### Icône à gauche du titre
- Déterminée par priorité: tags → type
- Mapping par défaut:
  - user: tags ["person","user","people"] ou type "person"
  - database: tags ["database","db","data"] ou type "database"
  - api: tags ["api","service"] ou type "api"
  - warning: tags ["warning","alert","risk"]
  - new/edit/delete: tags ["new","add"] | ["edit","update"] | ["delete","remove"]

### Symboles utilisables dans content_list
- new, edit, delete, check, module, info, link, user, database, api, warning

---

## Formes (shape)

Ajouter à un élément:
```yaml
shape:
  type: diamond  # rect (défaut), rounded, diamond, hexagon, triangle,
                 # parallelogram, arrow-right|left|up|down,
                 # regular-polygon, custom-polygon
  # options selon la forme:
  radius: 10           # rounded
  rotation: 30         # rotation en degrés (regular/custom polygon)
  orientation: up      # triangle: up|down|left|right
  skew: 0.2            # parallelogram (0..0.4 conseillé)
  head: 0.35           # flèches: proportion de la tête (0.2..0.8)
  sides: 6             # regular-polygon
  points:              # custom-polygon (coordonnées normalisées 0..1)
    - [0, 0]
    - [1, 0]
    - [0.8, 1]
    - [0.2, 1]
```

Exemples:
```yaml
- id: diamond_node
  title: "Décision"
  shape: { type: diamond }

- id: arrow_step
  title: "Étape"
  shape: { type: arrow-right, head: 0.4 }

- id: hex
  title: "Hexagone"
  shape: { type: regular-polygon, sides: 6, rotation: 15 }
```

---

## Groupes (clusters)
- Utiliser `group` sur les éléments pour les regrouper visuellement.
- Éviter d’utiliser un `group` identique à un `id` d’élément (sinon cycle).

```yaml
- id: service_a
  group: "GCP"
- id: service_b
  group: "GCP"
```

---

## Bonnes pratiques
- Échapper les caractères XML dans titres/labels: `&` → `&amp;` (ex: "A & B").
- Fournir `width`/`height` pour les labels HTML de relations.
- Préférer `content_list` pour un rendu clair et interactif.
- Utiliser `tags` pour influencer l’icône du titre.

---

## Dépannage
- Erreur XML type “xmlParseEntityRef”: remplacer `&` par `&amp;` dans les chaînes.
- Erreur “create a cycle (cluster)”: ne pas mettre `group` égal à un `id` d’élément.
- Le rechargement auto (SSE) ne marche pas: vérifier que la page est servie via `index.js` et que vous sauvegardez bien le YAML ouvert.

---

## Exemple complet
```yaml
elements:
  - id: A
    title: "Service API"
    type: api
    tags: ["api"]
    group: "Backend"
    width: 360
    height: 180
    shape: { type: rounded, radius: 12 }
    content_list:
      - label: "Endpoints"
        symbol: "module"
        values:
          - label: "GET /users"
            symbol: "info"
          - label: "POST /users"
            symbol: "new"
          - label: "DELETE /users/:id"
            symbol: "delete"

  - id: B
    title: "Base de données"
    type: database
    group: "Backend"
    width: 320
    height: 120

relations:
  - from: A
    to: B
    style: dotted
    color: "#2980b9"
    title: "Persistance"
```

---

## CLI
```bash
node index.js fichier.yaml \
  --theme light   # light | dark
  --layout TB     # TB | BT | LR | RL
  --port 3000
```

Le serveur regénère le SVG et notifie la page de se recharger automatiquement à chaque sauvegarde du YAML.