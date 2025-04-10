# Idées jeu

## Idées 1

Le principe du jeu est un fez-like.

Vue en 2D type Mario, platformer, enigme.
L'idée est de faire tourner la scène selon a un axe lorsque le joueur appuie sur un bouton. Ce serait bien de faire les 3 axes idéealement, mais on commencer par l'axe Y pour le moment.
On va utiliser havok pour gérer la gravité je pense.
Est-ce qu'on ajoute une option pour passer de vue 2d de coté, a une vue 3D FPS ? Si on a le temps

faudrait surement faire un éditeur de niveau

En mode solo, suite de niveaux, on va partir sur au moins 3, le but étant de finir le jeu. 
Pas de sauvegarde, en mode die and retry :)


En mode réseau,
L'idée est de conserver le mécanismes du pivotage de scène, mais faire une basto entre deux joueur. Chacun des joueurs peut faire pivoter la scène, mais il y a un cool down, pour eviter de faire vomir l'autre IRL.
Si > 2 joueurs, on fait un système de tournoi, ou chacun dispute son match parallèlement.
On va essayer d'utiliser les WebRTC datachannels pour pour la communication réseau. Et puis si on a une peerconnection, ça permettre aux autres joueurs de regarde la game. (ou pas, ça dépend de si on peut capturer les frames)
Websocket server requit pour établir la connexion entre les joueurs, il faut créer une room/un lobby pour organiser le tournoi.

## Idées 2

Faire un portal like

Possible en solo et multi coop

# Idées 3

Faire un jeu de rythme avec WebAudio
Avec du métal bien évidemment.