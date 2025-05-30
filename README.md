# Nocturna

## GitHub repo

https://github.com/dbaldassi/nocturna.git

## Hosted Website

https://nocturna.dabaldassi.fr

## Authors

* Mateus Lopes
* David Baldassin

## Game Description

A broken dream. An infinite cube. An impossible awakening.

When sleep becomes a trap, the dream turns into a labyrinth. In Nocturna, you are a wanderer lost in a decomposed dream world, suspended between memory and oblivion. Each level is a face of a gigantic cube, a floating wall where fragments of dreams, moving traps, and hostile entities mix.

### Solo Mode — The Dreamer's Wandering

You progress through landscapes sculpted in the night, with a 2D view on a 3D scene. Some platforms are fixed, others rotate around the heart of the cube, opening new paths or revealing unexpected threats. You must avoid nightmares, collect as many dream shards (coins) as possible, and reach the crystal to wake up... or fall deeper.

### Multiplayer Mode — The Dreamers' War

Up to 4 players, each trapped in a sub-cube of this fractured space. Each dream shard collected lets you activate special actions: rotate platforms, disrupt enemy cubes, send entities, or create traps. To win, reach the portal... or eliminate the other dreamers. In this shared dream, nothing is stable—not the walls, nor the alliances.

### Nocturna is:

* A 2D platformer on 3D cube faces
* Rotating and dynamic platforms that modify the environment
* A dark, shifting dream world at the edge of the subconscious
* A solo mode focused on speed and collection, and a strategic, competitive multiplayer mode

Every dream has a price. And the price of awakening... could be your fall.

---

## Description du jeu

Un rêve brisé. Un cube infini. Un éveil impossible.

Lorsque le sommeil devient piège, le rêve se transforme en labyrinthe. Dans Nocturna, vous êtes un voyageur égaré dans un monde onirique décomposé, suspendu entre la mémoire et l’oubli. Chaque niveau est une face d’un cube gigantesque, une paroi flottante où se mêlent fragments de rêve, pièges mouvants et entités hostiles.

### Mode solo — L’Errance du Rêveur

Vous progressez à travers des paysages sculptés dans la nuit, avec une vue en 2D sur une scène en 3D. Certaines plateformes sont fixes, d’autres pivotent autour du cœur du cube, ouvrant de nouveaux chemins ou révélant des menaces inattendues. Il vous faudra éviter les cauchemars, collecter un maximum d’éclats de rêve (les pièces), et atteindre le cristal pour vous réveiller… ou plonger plus profondément.

### Mode multijoueur — La Guerre des Rêveurs

Jusqu’à 4 joueurs, chacun enfermé dans un sous-cube de cet espace fracturé. Chaque éclat de rêve ramassé vous permet d’activer des actions spéciales : faire pivoter des plateformes, perturber les cubes ennemis, y envoyer des entités, ou créer des pièges. Pour gagner, il faut atteindre le portail… ou éliminer les autres rêveurs. Dans ce rêve partagé, rien n’est stable, ni les murs, ni les alliances.

### Nocturna, c’est :

* Un platformer 2D sur parois 3D, à structure cubique
* Des plateformes rotatives et dynamiques qui modifient l’environnement
* Un monde onirique, sombre et changeant, à la frontière du subconscient
* Un mode solo de vitesse et de collecte, et un mode multijoueur stratégique et compétitif

Chaque rêve a un prix. Et celui du réveil… pourrait être votre chute.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

### Running in local, for dev with vite

```bash
git clone https://github.com/dbaldassi/nocturna.git
npm install
cd nocturna
npm install
npm run dev
```

### Build for prod 

```bash
git clone https://github.com/dbaldassi/nocturna.git
npm install
cd nocturna
npm install
npm run build
npm run docs
```

You can use the dockerfile to build a docker container to serve the static site.

```bash
docker build . -t nocturna # build image
docker run -d --name nocturna -p 5173:5173 nocturn # run container on port 5173
```

Otherwise, you can use the node server in nocturna/server

```bash
cd server
ln -s ../dist www # create symlink to have www folder in same directory server index
node . # run server
```
---

## Documentation

- [Project Documentation (features, architecture, editor, etc.)](./Documentation.md)
- [API & Code Documentation (TypeDoc)](https://nocturna.dabaldassi.fr/docs)

---

## Gameplay Video

Watch a gameplay demo on YouTube:  
[Youtube](https://www.youtube.com/watch?v=R8ayotSKBW4) <!-- Replace with your actual video link -->

---

## Credits

- **3D Meshes:** Generated using [AI tools](https://www.tripo3d.ai/).
- **HUD Assets:** Open source/free-to-use assets (UI and sounds). [kenney](https://kenney.nl/assets) [opengameart](https://opengameart.org/)
- **Music** [lobby](https://freemusicarchive.org/music/Soularflair/cc-by-free-to-use-for-anything-1/the-wound-that-cannot-scar-dark-ambient-intense-emotive/), [level](https://freemusicarchive.org/music/nul-tiel-records/techno/jeopardy-1/)

