(function () {
  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerColorButton = document.querySelector("#player-color");

  const chatMessages = document.querySelector("#chat-messages");
  const chatInput = document.querySelector("#chat-input");
  const chatSend = document.querySelector("#chat-send");
  

  const mapData = {
    minX: 1,
    maxX: 14,
    minY: 4,
    maxY: 12,
    blockedSpaces: {
      "7x4": true,
      "1x11": true,
      "12x10": true,
      "4x7": true,
      "5x7": true,
      "6x7": true,
      "8x6": true,
      "9x6": true,
      "10x6": true,
      "7x9": true,
      "8x9": true,
      "9x9": true,
    },
  };

  const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];
  const items = ["coin", "gem", "potion"];

  function randomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function getKeyString(x, y) {
    return `${x}x${y}`;
  }

  function createName() {
    if (document.cookie.split(';').some((item) => item.trim().startsWith('playerName='))) {
      return document.cookie.replace(/(?:(?:^|.*;\s*)playerName\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    const prefixes = ["anonymous1", "anonymous2", "anonymous3"];
    const randomPrefix = randomFromArray(prefixes);
    const name = `${randomPrefix}`;

    document.cookie = `playerName=${name}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    return name;
  }

  function isSolid(x, y) {
    const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
    return (
      blockedNextSpace ||
      x >= mapData.maxX ||
      x < mapData.minX ||
      y >= mapData.maxY ||
      y < mapData.minY
    );
  }

  function getRandomSafeSpot() {
    return randomFromArray([
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 6 },
      { x: 2, y: 8 },
      { x: 2, y: 9 },
      { x: 4, y: 8 },
      { x: 5, y: 5 },
      { x: 5, y: 8 },
      { x: 5, y: 10 },
      { x: 5, y: 11 },
      { x: 11, y: 7 },
      { x: 12, y: 7 },
      { x: 13, y: 7 },
      { x: 13, y: 6 },
      { x: 13, y: 8 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 8, y: 8 },
      { x: 10, y: 8 },
      { x: 11, y: 4 },
    ]);
  }

  function handleOffline() {
    alert("Straciłeś połączenie z internetem.");
  }

  function handleOnline() {
    alert("Ponownie jesteś online.");
  }

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  if (!navigator.onLine) {
    handleOffline();
  } else {
    handleOnline();
  }

  function placeItem() {
    const { x, y } = getRandomSafeSpot();
    const itemType = randomFromArray(items);
    const itemRef = firebase.database().ref(`items/${getKeyString(x, y)}`);
    itemRef.set({ x, y, type: itemType });

    const itemTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeItem();
    }, randomFromArray(itemTimeouts));
  }

  function updateInventory() {
    const player = players[playerId];
    document.getElementById('coin-count').innerText = player.coins || 0;
    document.getElementById('gem-count').innerText = player.gems || 0;
    document.getElementById('potion-count').innerText = player.potions || 0;
  }

  function updatePlayerData() {
    playerRef.once('value').then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        players[playerId] = {
          ...data,
          coins: data.coins || 0,
          gems: data.gems || 0,
          potions: data.potions || 0
        };
        updateInventory();
      }
    });
  }

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      playerId = user.uid;
      console.log("Zalogowany użytkownik UID:", playerId);
      playerRef = firebase.database().ref(`players/${playerId}`);
      const gameStateRef = firebase.database().ref(`gameState/${playerId}`);

      gameStateRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
          const { x, y, direction, color, coins, gems, potions, name } = data;
          playerRef.set({
            id: playerId,
            name: name || createName(),
            direction,
            color,
            x,
            y,
            coins: coins || 0,
            gems: gems || 0,
            potions: potions || 0
          });
        } else {
          const { x, y } = getRandomSafeSpot();
          const name = createName();
          playerRef.set({
            id: playerId,
            name,
            direction: "right",
            color: randomFromArray(playerColors),
            x,
            y,
            coins: 0,
            gems: 0,
            potions: 0
          });
          gameStateRef.set({ name });
        }
      });

      playerRef.onDisconnect().remove();
      initGame();
      initChat();  // Inicjalizacja chatu po zalogowaniu
    }
  });

  function attemptGrabItem(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
        const item = coins[key];
        firebase.database().ref(`items/${key}`).remove();

        let updates = {};
        if (item.type === "coin") {
            updates.coins = (players[playerId].coins || 0) + 1;
        } else if (item.type === "gem") {
            updates.gems = (players[playerId].gems || 0) + 1;
        } else if (item.type === "potion") {
            updates.potions = (players[playerId].potions || 0) + 1;
            alert("You collected a potion!");
        }

        playerRef.update(updates);

        players[playerId] = {
            ...players[playerId],
            ...updates
        };

        firebase.database().ref(`gameState/${playerId}`).update({
            coins: players[playerId].coins,
            gems: players[playerId].gems,
            potions: players[playerId].potions
        });

        updateInventory();
    }
}


  function handleKeyPress(xChange = 0, yChange = 0) {
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    if (!isSolid(newX, newY)) {
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      playerRef.set(players[playerId]);
      attemptGrabItem(newX, newY);

      firebase.database().ref(`gameState/${playerId}`).set({
        x: newX,
        y: newY,
        direction: players[playerId].direction,
        color: players[playerId].color,
        coins: players[playerId].coins,
        gems: players[playerId].gems,
        potions: players[playerId].potions
      });
    }
  }

  function initGame() {

    
    new KeyPressListener("w", () => handleKeyPress(0, -1));
    new KeyPressListener("s", () => handleKeyPress(0, 1));
    new KeyPressListener("a", () => handleKeyPress(-1, 0));
    new KeyPressListener("d", () => handleKeyPress(1, 0));

    const allPlayersRef = firebase.database().ref(`players`);
    const allItemsRef = firebase.database().ref(`items`);

    allPlayersRef.on("value", (snapshot) => {
      players = snapshot.val() || {};
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      });
    });

    allPlayersRef.on("child_added", (snapshot) => {
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = `
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `;
      playerElements[addedPlayer.id] = characterElement;

      characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
    });

    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    });

    allItemsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });

    allItemsRef.on("child_added", (snapshot) => {
      const item = snapshot.val();
      const key = getKeyString(item.x, item.y);
      coins[key] = item;
      const itemElement = document.createElement("div");
      itemElement.classList.add("Item", "grid-cell");

      if (item.type === "coin") {
        itemElement.innerHTML = `
          <div class="Coin_shadow grid-cell"></div>
          <div class="Coin_sprite grid-cell"></div>
        `;
      } else if (item.type === "gem") {
        itemElement.innerHTML = `
          <div class="Gem_shadow grid-cell"></div>
          <div class="Gem_sprite grid-cell"></div>
        `;
      } else if (item.type === "potion") {
        itemElement.innerHTML = `
          <div class="Potion_shadow grid-cell"></div>
          <div class="Potion_sprite grid-cell"></div>
        `;
      }

      const left = 16 * item.x + "px";
      const top = 16 * item.y - 4 + "px";
      itemElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      coinElements[key] = itemElement;
      gameContainer.appendChild(itemElement);
    });

    allItemsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      gameContainer.removeChild(coinElements[keyToRemove]);
      delete coinElements[keyToRemove];
    });

    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({ color: nextColor });
    });

    placeItem();
  }

  function initChat() {
    const chatRef = firebase.database().ref('chat');
    const maxMessages = 17;
    let messageCount = 0;
    let messageTimestamp = Date.now();

    // Obsługa wysyłania wiadomości
    function sendMessage() {
      const message = chatInput.value.trim();
      
      if (message.length < 3 || message.length > 20) {
        alert("Wiadomość musi mieć od 3 do 20 znaków!");
        return;
      }

      const currentTimestamp = Date.now();
      if (currentTimestamp - messageTimestamp < 60000) {
        if (messageCount >= 20) {
          alert("Przekroczyłeś limit wiadomości na minutę!");
          return;
        }
        messageCount++;
      } else {
        messageCount = 1;
        messageTimestamp = currentTimestamp;
      }

      chatRef.push({
        name: players[playerId].name,
        message: message,
        time: new Date().toLocaleTimeString()
      });

      chatInput.value = ""; // Wyczyść pole tekstowe po wysłaniu
    }

    // Nasłuchiwanie wiadomości
    chatRef.limitToLast(maxMessages).on('value', (snapshot) => {
      chatMessages.innerHTML = ''; // Czyść przed każdym odświeżeniem
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        const messageElement = document.createElement("p");
        messageElement.textContent = `${data.name}: ${data.message} (${data.time})`;
        chatMessages.appendChild(messageElement);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight; // Przewijanie do najnowszej wiadomości
    });

    // Obsługa kliknięcia przycisku "Send"
    chatSend.addEventListener("click", sendMessage);

    // Obsługa wysłania wiadomości przez Enter
    chatInput.addEventListener("keypress", function (e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  firebase.auth().signInAnonymously().catch((error) => {
    console.log(error.code, error.message);
  });
})();
