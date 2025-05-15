import { Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, InputText, StackPanel, TextBlock } from "@babylonjs/gui";

export interface LobbyObserver {
    onRoomCreation(playerId: string) : void;
    onRoomJoin(roomId: string, playerId) : void;
    onReady() : void;
}

export class Lobby {
    private scene: Scene;
    private observer: LobbyObserver;
    private guiTexture: AdvancedDynamicTexture;

    constructor(scene: Scene, observer: LobbyObserver) {
        this.observer = observer;
        this.scene = scene;
    }

    public showStartMenu(): void {
        // Créer une texture GUI pour afficher le menu
        const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
    
        // Créer un panneau vertical pour organiser les éléments du menu
        const panel = new StackPanel();
        panel.width = "50%";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiTexture.addControl(panel);
    
        // Ajouter un titre
        const title = new TextBlock();
        title.text = "Multiplayer Lobby";
        title.color = "white";
        title.fontSize = 32;
        title.height = "50px";
        panel.addControl(title);

        // Ajouter un champ de texte pour entrer le nom du joueur
        const playerNameInput = new InputText();
        playerNameInput.width = "100%";
        playerNameInput.height = "50px";
        playerNameInput.color = "white";
        playerNameInput.background = "gray";
        playerNameInput.placeholderText = "Enter Player Name";
        playerNameInput.placeholderColor = "white";
        panel.addControl(playerNameInput);
    
        // Ajouter un bouton pour créer une nouvelle room
        const createRoomButton = Button.CreateSimpleButton("createRoom", "Create New Room");
        createRoomButton.width = "100%";
        createRoomButton.height = "50px";
        createRoomButton.color = "white";
        createRoomButton.background = "green";
        createRoomButton.onPointerClickObservable.add(() => {
            const playerId = playerNameInput.text;
            this.observer.onRoomCreation(playerId);
        });
        panel.addControl(createRoomButton);
    
        // Ajouter un champ de texte pour entrer l'ID de la room
        const roomIdInput = new InputText();
        roomIdInput.width = "100%";
        roomIdInput.height = "50px";
        roomIdInput.color = "white";
        roomIdInput.background = "gray";
        roomIdInput.placeholderText = "Enter Room ID";
        roomIdInput.placeholderColor = "white";
        panel.addControl(roomIdInput);
    
        // Ajouter un bouton pour rejoindre une room existante
        const joinRoomButton = Button.CreateSimpleButton("joinRoom", "Join Room");
        joinRoomButton.width = "100%";
        joinRoomButton.height = "50px";
        joinRoomButton.color = "white";
        joinRoomButton.background = "blue";
        joinRoomButton.onPointerClickObservable.add(async () => {
            const roomId = roomIdInput.text;
            const playerId = playerNameInput.text;
            this.observer.onRoomJoin(roomId, playerId);
        });
        panel.addControl(joinRoomButton);

        this.guiTexture = guiTexture;
    }

    public showPlayerList(roomId: string, playerId: string, players: string[]): void {
        // Créer une texture GUI pour afficher la liste des joueurs
        const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

        // Créer un panneau principal pour organiser les sous-panneaux
        const mainPanel = new StackPanel();
        mainPanel.width = "50%";
        mainPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        mainPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiTexture.addControl(mainPanel);

        this.guiTexture = guiTexture;

        // Panneau pour l'ID de la room
        const roomPanel = new StackPanel();
        roomPanel.width = "100%";
        roomPanel.height = "100px";
        roomPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        roomPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        mainPanel.addControl(roomPanel);

        // Ajouter l'ID de la room
        const roomIdText = new TextBlock();
        roomIdText.text = "Room ID: " + roomId;
        roomIdText.color = "white";
        roomIdText.fontSize = 32;
        roomIdText.height = "50px";
        roomPanel.addControl(roomIdText);

        // Ajouter un bouton pour copier l'ID de la room dans le presse-papiers
        const copyButton = Button.CreateSimpleButton("copyRoomId", "Copy Room ID");
        copyButton.width = "100%";
        copyButton.height = "50px";
        copyButton.color = "white";
        copyButton.background = "blue";
        copyButton.onPointerClickObservable.add(() => {
            navigator.clipboard.writeText(roomId).then(() => {
                console.log("Room ID copied to clipboard: " + roomId);
            }).catch((err) => {
                console.error("Failed to copy Room ID: ", err);
            });
        });
        roomPanel.addControl(copyButton);

        // Panneau pour la liste des joueurs
        const playerPanel = new StackPanel("playerListPanel");
        playerPanel.width = "100%";
        playerPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        playerPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        mainPanel.addControl(playerPanel);

        // Ajouter un titre pour la liste des joueurs
        const title = new TextBlock();
        title.text = "Player List:";
        title.color = "white";
        title.fontSize = 32;
        title.height = "50px";
        playerPanel.addControl(title);

        this.addPlayer(playerId);
        // Ajouter un conteneur horizontal pour chaque joueur
        players.forEach((player) => { this.addPlayer(player); });

        // Ajouter un bouton pour indiquer que le joueur est prêt
        const readyButton = Button.CreateSimpleButton("ready", "Ready");
        readyButton.width = "100%";
        readyButton.height = "50px";
        readyButton.color = "white";
        readyButton.background = "green";
        readyButton.onPointerClickObservable.add(() => {
            // Envoyer un message au serveur pour indiquer que le joueur est prêt
            this.observer.onReady();
            this.setPlayerReady(playerId);
        });
        mainPanel.addControl(readyButton);
    }

    public addPlayer(playerId: string): void {
        const playerPanel = this.guiTexture.getControlByName("playerListPanel") as StackPanel;
        if (!playerPanel) {
            console.error("Player panel not found");
            return;
        }

        const playerContainer = new StackPanel(`${playerId}Container`);
        playerContainer.isVertical = false; // Conteneur horizontal
        playerContainer.width = "100%";
        playerContainer.height = "30px";
        playerContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        playerPanel.addControl(playerContainer);

        // Ajouter le nom du joueur
        const playerText = new TextBlock(`${playerId}Text`);
        playerText.text = playerId;
        playerText.color = "white";
        playerText.fontSize = 24;
        playerText.width = "70%"; // Largeur relative
        playerContainer.addControl(playerText);

        // Ajouter l'indicateur de statut (Ready / Not Ready)
        const statusText = new TextBlock(`${playerId}Status`);
        statusText.text = "Not Ready";
        statusText.color = "red";
        statusText.fontSize = 24;
        statusText.width = "30%"; // Largeur relative
        playerContainer.addControl(statusText);
    }

    public removePlayer(playerId: string): void {
        const playerPanel = this.guiTexture.getControlByName("playerListPanel") as StackPanel;
        if (!playerPanel) {
            console.error("Player panel not found");
            return;
        }

        const playerContainer = this.guiTexture.getControlByName(`${playerId}Container`) as StackPanel;
        if (!playerContainer) {
            console.error("Player container not found");
            return;
        }

        playerPanel.removeControl(playerContainer);
        playerContainer.dispose();
    }

    public setPlayerReady(playerId: string): void {
        const playerText = this.guiTexture.getControlByName(`${playerId}Text`) as TextBlock;
        if (!playerText) {
            console.error("Player text not found");
            return;
        }

        const statusText = this.guiTexture.getControlByName(`${playerId}Status`) as TextBlock;
        if (!statusText) {
            console.error("Status text not found");
            return;
        }

        statusText.text = "Ready";
        statusText.color = "green";
    }
        
    public eraseMenu(): void {
        // Effacer le menu de la scène
        if (this.guiTexture) {
            this.guiTexture.dispose();
            this.guiTexture = null;
        }
    }

    public showError(message: string): void {
        // Créer une texture GUI pour afficher le message d'erreur
        const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
        // Créer un panneau vertical pour organiser les éléments du message
        const panel = new StackPanel();
        panel.width = "50%";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiTexture.addControl(panel);
        // Ajouter un titre
        const title = new TextBlock();
        title.text = "Error : ";
        title.color = "red";
        title.fontSize = 32;
        title.height = "50px";
        panel.addControl(title);
        // Ajouter un block de texte pour le message d'erreur
        const errorText = new TextBlock();
        errorText.text = message;
        errorText.color = "red";
        errorText.fontSize = 24;
        errorText.height = "50px";
        panel.addControl(errorText);
        // Ajouter un bouton pour fermer le message
        const closeButton = Button.CreateSimpleButton("closeError", "Close");
        closeButton.width = "100%";
        closeButton.height = "50px";
        closeButton.color = "white";
        closeButton.background = "red";
        closeButton.onPointerClickObservable.add(() => {
            this.eraseMenu();
            this.showStartMenu();
        });
        
        panel.addControl(closeButton);

        this.guiTexture = guiTexture;
    }
}