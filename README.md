Documentation de la Syntaxe YAML pour la Génération de Diagrammes
Ce document décrit la syntaxe YAML utilisée pour générer des diagrammes SVG interactifs. Un fichier de diagramme est structuré autour de deux sections principales : elements (les nœuds) et relations (les liens entre les nœuds).

1. Structure Globale
Le fichier YAML doit contenir deux listes à la racine :

# Liste de tous les nœuds (boîtes, objets, etc.) du diagramme.
elements:
  - id: element_1
    # ... configuration de l'élément 1 ...
  - id: element_2
    # ... configuration de l'élément 2 ...

# Liste de toutes les connexions entre les éléments.
relations:
  - from: element_1
    to: element_2
    # ... configuration de la relation ...

2. La section elements
La section elements définit chaque "boîte" ou nœud visible sur le diagramme. Chaque élément est un objet dans la liste.

2.1. Attributs principaux d'un élément
Attribut

Type

Obligatoire

Description

id

Chaîne

Oui

Identifiant unique de l'élément. Utilisé pour créer les relations.

title

Chaîne

Non

Le titre principal affiché en haut de l'élément.

subtitle

Chaîne

Non

Un sous-titre affiché sous le titre principal.

type

Chaîne

Non

Définit la couleur de fond et/ou l'icône de l'élément. Valeurs communes : person, database, api, system, tableau, default.

width

Nombre

Non

Largeur de l'élément en pixels.

height

Nombre

Non

Hauteur de l'élément en pixels.

group

Chaîne

Non

Si spécifié, l'élément sera placé dans un conteneur (cluster) portant ce nom.

shape

Objet

Non

Permet de changer la forme du conteneur du noeud (voir annexe).

2.2. Contenu d'un élément
Il existe trois manières de définir le contenu d'un élément.

A. content_list (Contenu structuré et détaillé)
C'est la méthode la plus complète. Elle permet de créer des listes d'items groupés par sections, avec des icônes, des sous-titres et des modales interactives.

La structure est une liste de sections. Chaque section contient :

label: Le titre de la section.

symbol: (Optionnel) Le nom d'une icône à afficher à côté du titre de la section.

values: Une liste d'items.

Chaque item dans values peut contenir :

label: Le texte principal de l'item.

subtitle: (Optionnel) Un texte secondaire en plus petit, supporte les balises HTML simples comme <b> ou <i>.

symbol: (Optionnel) Le nom d'une icône à afficher à côté de l'item.

url: (Optionnel) Une URL qui sera ouverte dans un nouvel onglet au clic.

modal: (Optionnel) Un objet pour configurer une fenêtre modale qui apparaît au survol ou au clic.

Exemple avec content_list :

- id: account
  type: person
  title: "Table: Account"
  subtitle: "Objet central pour les candidats"
  width: 500
  height: 450
  content_list:
    - label: "Champs Modifiés"
      symbol: "edit" # Icône pour la section
      values:
        - label: "APB Student Key → Current Year Parcoursup Number"
          subtitle: "<b>Nouvelle valeur:</b> [année]_[num_parcoursup]"
          symbol: "edit" # Icône pour l'item
          modal:
            on: "hover" # ou "click"
            title: "Exemples de Valeurs"
            html_content: "Ancienne valeur : `APB2024-ADV-123456`<br/>Nouvelle valeur : `2025_123456`"

B. html_content (Contenu HTML simple)
Pour un contrôle total mais simple du contenu, vous pouvez directement injecter un bloc de HTML.

Exemple avec html_content :

- id: contest_score
  type: default
  width: 250
  height: 50
  html_content: |
    <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
      <h2 style="margin: 0; font-size: 16px; color: #c0392b;">ContestScore__c</h2>
    </div>

C. tableau (Nouveau type pour les données tabulaires)
Un type spécial d'élément pour afficher des données sous forme de tableau.

Exemple avec tableau :

- id: ma_table
  type: tableau
  title: "Exemple de Tableau"
  width: 500
  height: 260
  columns: ["ID Utilisateur", "Nom", "Date d'inscription"]
  rows:
    - ["usr_123", "Alice", "2023-01-15"]
    - ["usr_124", "Bob", "2023-02-20"]
    # ... autres lignes

3. La section relations
La section relations définit chaque flèche (arête) connectant deux éléments.

3.1. Attributs d'une relation
Attribut

Type

Obligatoire

Description

from

Chaîne

Oui

L'id de l'élément de départ.

to

Chaîne

Oui

L'id de l'élément d'arrivée.

title

Chaîne

Non

Titre affiché dans une boîte sur la relation.

subtitle

Chaîne

Non

Sous-titre affiché dans la boîte de la relation.

content_list

Liste

Non

Similaire à celle des éléments, permet d'ajouter une liste à puces dans la boîte de la relation.

style

Chaîne

Non

Style du trait de la flèche. Valeurs : dashed (tirets), dotted (points).

color

Chaîne

Non

Couleur du trait au format hexadécimal (ex: #ff0000).

width

Nombre

Non

Largeur de la boîte de label.

height

Nombre

Non

Hauteur de la boîte de label.

Exemple de relation avec contenu :

relations:
  - from: account
    to: contest
    width: 240
    height: 120
    title: "Relation Master-Detail"
    content_list:
      - label: "Empêche les orphelins"
        symbol: "check"
      - label: "Suppression en cascade"
        symbol: "check"

4. Annexe
4.1. Symboles disponibles
Voici la liste des symbol que vous pouvez utiliser dans content_list :

new: ➕ Icône verte pour les ajouts.

edit: ✏️ Icône orange pour les modifications.

delete: 🗑️ Icône rouge pour les suppressions.

check: ✔️ Icône verte pour les confirmations/validations.

module: 📦 Icône générique pour un module.

info: ℹ️ Icône bleue pour l'information.

link: 🔗 Icône de lien externe.

user: 👤 Icône d'utilisateur.

database: 🗄️ Icône de base de données.

api: ↔️ Icône d'API.

warning: ⚠️ Icône d'avertissement.

4.2. Formes (shape) disponibles
Vous pouvez modifier la forme d'un élément avec l'attribut shape.

elements:
  - id: my_diamond
    shape:
      type: diamond # ou hexagon, triangle, parallelogram, etc.
    # ...

Types de base : rect, rounded (par défaut), diamond, hexagon, triangle.

Flèches : arrow-right, arrow-left, arrow-up, arrow-down.

Polygones :

regular-polygon avec sides: <nombre>.

custom-polygon avec une liste de points normalisés [[x,y], ...].

Options :

rotation: <degrés> pour faire pivoter la forme.

orientation: 'up' | 'down' | 'left' | 'right' pour les triangles.