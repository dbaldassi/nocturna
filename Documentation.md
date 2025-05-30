# Nocturna — Project Documentation

## Table of Contents

- [Repository Structure](#repository-structure)
- [Game Features](#game-features)
- [Code Documentation](#code-documentation)

---

## Repository Structure

```
nocturna/ 
├── src/ # Main TypeScript source code (game logic, UI, multiplayer, etc.) 
│ ├── GameObjects/ # All game entities (Player, Platform, Victory, etc.) 
│ ├── HUD/ # Heads-Up Display and UI components 
│ ├── utils/ # Utility functions and helpers 
│ ├── Network/ # Send and receive data with other player (WebSocket and WebRTC) 
│ ├── Shader/ # Functions to create shader material
│ ├── Scenes/ # All different games scene (singleplayer, multiplayer, tuto, editor)
│ ├── app.ts # entrypoint
├── server/ # Node.js server code (Express, WebSocket, etc.) 
├── public/ # static website files
| ├── assets/ # Game assets (sounds, images, levels, music) 
| ├── models/ # 3D meshes
| ├── shader/ # Shader GLSL code
```
---
 
## Code Documentation

The full API and code documentation is generated with TypeDoc and available online:

👉 [https://nocturna.dabaldassi.fr/docs](https://nocturna.dabaldassi.fr/docs)

---


## Game Features

### Overview

The entry point of the project is `app.ts`, where both the game engine and the audio engine are initialized.  
When the application starts, it displays the main menu, which is built using HTML. This menu allows the player to choose their game mode (singleplayer, multiplayer, tutorial, or editor).

When a mode is selected, the corresponding scene is loaded and initialized in the code.

**Main menu features:**
- **Language selection:** Switch between English and French at any time.
- **Keybindings configuration:** Choose between AZERTY and QWERTY presets, or customize your controls.
- **Audio controls:** Adjust the volume or mute/unmute the game audio.
- **Graphics settings:** Select the graphics quality (Low, Ultra Low, Ultra) to optimize performance or visual quality.

All these options are accessible directly from the menu before starting the game, ensuring a personalized experience for every player.
There are also accessible later in the game.

After initializing the game and displaying the menu, the environment cube is created. At the center of the scene, a Babylon.js `TransformNode` is placed, which acts as the parent for all objects that can rotate (such as platforms, obstacles, and interactive elements).

When a rotation is triggered (for example, by using a special power), all child objects of this central `TransformNode` rotate together around the origin `(0, 0, 0)`. This allows for synchronized and consistent movement of the environment.

To ensure smooth and visually appealing transitions, we use a Babylon.js `Animation` to animate the rotation of the parent node by 90 degrees along the chosen axis.

We use havok plugin for the physic engine.

The player hae the ability to double jump. We use a ray cast downside to detect if we are falling.

### Architecture

### Architecture

All game objects in Nocturna implement a common interface, allowing them to be manipulated generically within the scene (for updates, rendering, collisions, etc.).  
Each type of game object has its own **factory** class responsible for creating instances of that object. This factory pattern makes it easy to instantiate objects based on their type and configuration.

**Level Loading:**  
To load a level, the game fetches a JSON file describing all objects in the scene. For each object, the appropriate factory is used to create it according to its type and properties. The Babylon.js `AssetsManager` is used to load meshes and sounds for these objects, and a loading screen is displayed while assets are being fetched.

**Collisions:**  
Some objects have collision detection enabled. This is done by calling `setCollisionCallbackEnabled` on the relevant mesh or physics body. The scene registers a global collision callback, and when a collision occurs, a **visitor pattern** is used to inspect the colliding object. For example, if a player collides with another object, the visitor pattern allows the code to determine the type of the object and trigger the appropriate action (such as collecting a coin, taking damage, etc.).

**State Machines:**  
Certain objects, such as the player and the scenes themselves, use a **state machine** to manage their behavior. This allows for clear separation of logic for different states (e.g., idle, jumping, falling, dead for the player; loading, playing, paused for the scene).

**Audio Management:**  
The audio module is implemented as a **singleton**, allowing background music to be controlled from anywhere in the codebase. This ensures consistent audio behavior and easy access to audio controls.

**Game Loop:**  
On each update (game tick), all game objects are updated with the time delta since the last frame and the current input state. This ensures smooth animations, physics, and gameplay logic.

**Input Handling:**  
Inputs are managed using a boolean table that tracks which keys are currently pressed. Additionally, the input system allows registering "actions"—callbacks that are triggered when a configured key is pressed. This makes it easy to customize controls and add new gameplay actions.

This modular and extensible architecture makes Nocturna easy to maintain, extend, and adapt for new features or game modes.

### Singleplayer

Nocturna features a campaign mode with multiple levels to progress through. Each level presents unique challenges and environments.

- **Score Multiplier:**  
  The faster you collect all the dream shards (coins) in a level, the higher your score multiplier will be. Speed and efficiency are rewarded, encouraging players to optimize their routes and actions for the best possible score.

### Multiplayer

#### Gameplay

In multiplayer mode, each player is confined to their own sub-space of the cube (the cube is divided into 4 zones, for up to 4 players). The main objectives and mechanics are:

- **Collecting Dream Shards (Coins):**  
  Players collect coins scattered throughout their area. Each coin collected grants a special power that can be used strategically.

- **Inventory of Powers:**  
  Each player has an inventory of up to 3 powers. When a player collects a coin, the corresponding power is added to their inventory (up to the limit).

- **Special Powers:**  
  Powers include:
  - **Platform Rotation:** Rotate platforms (global cube) to change the environment.
  - **Spikes:** Spawn spikes to create traps for other players.
  - **Rocket:** Launch a rocket to disrupt or eliminate opponents.

- **Using Enemy Powers:**  
  When using a power that targets an enemy (for example, spawning an enemy or trap in another player's zone), the player is switched to a universal camera view. This allows them to freely move around the scene and select the platform where the enemy or trap will appear.

- **Spectator Cameras:**  
  When spectating (after being eliminated), players can view the action using either a follow camera (which follows a specific player) or a wide universal camera. During gameplay, players can also switch between these two camera views (wide or follow) for a different perspective on the action.

- **Victory Conditions:**  
  - **Touch the Crystal:** Reach and touch the crystal in your zone to win the game.
  - **Last Survivor:** Eliminate other players by making them fall off the platforms; if you are the last one standing, you win.

Each player is limited to their own quarter of the cube and cannot directly enter another player's space, but powers can affect other zones.

> **Note:**  
> We considered implementing a cooperative mode where players would have to work together to reach the victory crystal, but this feature was not developed in the current version. It remains a possible direction for future work.

#### Network

For multiplayer, Nocturna uses a WebSocket connection to the server to create and manage game lobbies.

- **Lobby Creation:**  
  A player can create a new lobby. An ID is generated randomly by the server for this lobby. The player who creates the lobby must share this ID with other players who want to join.

- **Joining a Lobby:**  
  Each player chooses a nickname, which is sent to the lobby upon joining. When a player enters a lobby, they receive the list of all currently connected players. At the same time, all existing players in the lobby are notified of the new player's ID and nickname.

- **Leaving a Lobby:**  
  When a player leaves the lobby, all remaining players are notified of the departing player's ID, so the UI can update accordingly.

This system ensures that all players in a lobby are always aware of who is present, and can react in real time to new arrivals or departures.

The Websocket server uses the HTTP server that serve the website (therefore same host:port). It uses a sub protocol to handle our multiplayer protocol. We modified the vite configuration (vite.config.ts) to use the vite server for the websocket server during development (when runnin, npm run dev). We use a "handleUpdgrade" to avoid overwriting on the existing vite websocket used to hot reload on modifications.

The WebSocket server is also used to exchange connection information (signaling) for each player in order to establish a WebRTC connection.  
WebRTC is used in the game to create direct peer-to-peer connections between players, optimizing latency and improving real-time communication during multiplayer sessions.

We use WebRTC datachannel to exchange game objects information (position, creation, collision, ...)

#### Synchronizing Objects

Each player has authority over their own sub-cube: they are responsible for detecting collisions and updating the positions of all objects within their zone. When an object moves, is created, destroyed, or interacts (e.g., collision, score, health), the owning player sends updates to all other players via the WebRTC datachannel. This ensures that every client can visually update the state of remote objects in real time.

On each client, objects that are not locally owned are represented as **RemoteObjects**. These are proxy classes that mirror the real game objects but are updated only through network messages. Each proxy object stores the `ownerId` (the player who has authority over it) and uses interpolation to smoothly update its position and state between network updates.  
**Interpolation** is used to avoid visual stutter and make movements appear smooth, even if network updates are infrequent or arrive with latency.

When a player creates a new object (for example, spawning a trap or a projectile in another player's sub-cube), the message includes the `ownerId`. If a client receives a creation message for an object in its own zone and sees that it is the designated owner, it instantiates the object as a local (authoritative) object. Otherwise, it creates a RemoteObject and updates it only based on network messages.

Updates sent between players include:
- **Object creation** (with ownerId)
- **Position and state updates** (for movement, animation, etc.)
- **Collision events** (to trigger animations or effects)
- **Destruction/removal of objects**
- **Score and health changes**

This distributed authority model ensures that each sub-cube is simulated authoritatively by its owning player, while all other players maintain a synchronized and visually smooth representation of the entire game state.

### Editor

Nocturna includes a built-in level editor to create, modify levels directly within the game environment.

**Key features of the editor:**
- **Visual Placement:**  
  Place, move, rotate, and delete platforms, obstacles, coins, and other game objects using an intuitive visual interface.
- **Object Properties:**  
  Edit properties of each object (such as size, position, rotation, type, and behavior) through dedicated UI panels.
- **Scene Navigation:**  
  Navigate the level using camera controls similar to those in gameplay, making it easy to view and edit any part of the cube.
- **Save & Load:**  
  Serialize all the game objects and scene into a json file that is downloaded on your computer. (Download because nothing is saved on our server).

When adding a new object in the editor, the object is placed at the coordinates where the mouse is pointing on the face of the cube in front of the player. This is achieved using Babylon.js's picking system (`scene.pick` and `pickedMesh`), which allows us to determine exactly which face of the cube is under the cursor and the precise 3D coordinates for placement.

To ensure that the object appears correctly aligned in the local reference frame—especially when the parent is rotated—we perform calculations to convert the picked world position and rotation into the local coordinates of the parent.  
If we did not do these calculations, the object could appear on the wrong wall or with inverted axes, depending on the parent's rotation.

This is handled by the following utility functions (see [`Utils` in `src/types/index.ts`]):

- [`calculatePositionRelativeToParent`](#):  
  Converts a world position to the local coordinates of the parent, taking into account the parent's rotation.  
  *If not used, the object may appear on an unintended face or at an incorrect position.*

- [`calculateRotationRelativeToParent`](#):  
  Computes the local rotation of the object relative to its parent, so that the object's orientation matches the intended direction on the rotated parent.  
  *Without this, the object's axes may be flipped or misaligned.*

These functions ensure that, regardless of how the parent node is rotated in the scene, newly placed objects will always appear exactly where and how the user expects.

### Graphics and Visual Effects

- **HUD System:**  
  We use Babylon.js's in-game GUI system to create the HUD (heads-up display), including score, inventory, and other interface elements. The HUD uses custom assets for icons and UI components.

- **Shaders:**  
  A custom shader material is applied to the bottom face of the cube to create a unique visual effect for the ground. The shader code comes from [ShaderToy](https://www.shadertoy.com/view/lslXRS).

- **Particle Effects:**  
  Several objects in the game feature particle effects (such as sparks, glows, or explosions) to enhance visual feedback and immersion.

- **Sound Effects:**  
  Most interactive objects have associated sound effects to provide audio feedback for actions like collecting coins, activating powers, or triggering traps.

- **3D Meshes:**  
  The 3D models used for platforms, obstacles, and other game elements are generated using [AI tools](https://www.tripo3d.ai/).
  

- **HUD Assets:**  
  All HUD assets (icons, UI graphics) and sounds are open and free to use. [kenney](https://kenney.nl/assets) [opengameart](https://opengameart.org/)


### Cookies

To enhance user experience and personalization, Nocturna uses cookies to save various settings and progress, including:

- **Volume and audio settings**
- **Score and level progression**
- **Selected language (English/French)**
- **Keybindings and control presets (AZERTY/QWERTY/custom)**
- **Graphics quality preferences**

These cookies allow the game to remember your preferences and progress between sessions, so you can pick up right where you left off with your chosen settings.

---

## Contact & Links

- **GitHub Repository**: [https://github.com/dbaldassi/nocturna](https://github.com/dbaldassi/nocturna)
- **Live Demo**: [https://nocturna.dabaldassi.fr](https://nocturna.dabaldassi.fr)
- **Authors**: Mateus Lopes, David Baldassin

---