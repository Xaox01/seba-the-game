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

function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    "test1",
    "test2",
    "test3"
  ]);
  const animal = randomFromArray([
    "wspaniały",
    "magiczny",
    "mądry"
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x, y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
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
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}

(function () {
  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");

  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({ x, y });

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({ coins: players[playerId].coins + 1 });
    }
  }

  function handleKeyPress(xChange = 0, yChange = 0) {
    // Sprawdzamy, czy pole input czatu jest aktualnie aktywne
    if (document.activeElement !== chatInput) {
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
        playerRef.set(players[playerId]); // Aktualizacja danych gracza w bazie danych Firebase
        attemptGrabCoin(newX, newY);
    
        // Zapisz stan gry w bazie danych Firebase
        firebase.database().ref(`gameState/${playerId}`).set({
          x: newX,
          y: newY,
          direction: players[playerId].direction,
          color: players[playerId].color,
          coins: players[playerId].coins
        });
      }
    }
  }
  
  // Wczytaj stan gry z bazy danych Firebase
firebase.database().ref(`gameState/${playerId}`).once('value').then((snapshot) => {
  const data = snapshot.val();
  if (data) {
    players[playerId].x = data.x;
    players[playerId].y = data.y;
    players[playerId].direction = data.direction;
    players[playerId].color = data.color;
    players[playerId].coins = data.coins;
  }
});

placeCoin();

  

  function initGame() {
    new KeyPressListener("w", () => handleKeyPress(0, -1));
    new KeyPressListener("s", () => handleKeyPress(0, 1));
    new KeyPressListener("a", () => handleKeyPress(-1, 0));
    new KeyPressListener("d", () => handleKeyPress(1, 0));

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);

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

    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;
      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    });

    allCoinsRef.on("child_removed", (snapshot) => {
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

    placeCoin();
  }

const chatMessages = document.querySelector("#chat-messages");
const chatInput = document.querySelector("#chat-input");
const chatSend = document.querySelector("#chat-send");



// Tworzymy referencję do czatu w bazie danych Firebase
const chatRef = firebase.database().ref('chat');

// Nasłuchujemy na nowe wiadomości w czacie
chatRef.on('child_added', snapshot => {
  const data = snapshot.val();
  const messageElement = document.createElement("p");
  messageElement.textContent = `${data.name}: ${data.message}`;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatSend.addEventListener("click", sendMessage);

// Dodajemy nasłuchiwacz zdarzeń 'keypress' do pola input czatu
chatInput.addEventListener("keypress", function (e) {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = chatInput.value;
  // Sprawdzamy, czy wiadomość nie jest pusta
  if (message.trim() === "") {
    alert("Wiadomość nie może być pusta!");
    return;
  }
  // Sprawdzamy, czy wiadomość nie przekracza 30 znaków
  if (message.length > 30) {
    alert("Wiadomość nie może przekraczać 30 znaków!");
    return;
  }
  chatInput.value = "";
  chatRef.push({
    name: players[playerId].name,
    message: message
  });
}


const maxMessages = 18;


chatRef.limitToLast(maxMessages).on('value', snapshot => {
  // Najpierw usuwamy wszystkie istniejące wiadomości
  chatMessages.innerHTML = '';

  // Następnie dodajemy każdą wiadomość do czatu
  snapshot.forEach(childSnapshot => {
    const data = childSnapshot.val();
    const messageElement = document.createElement("p");
    messageElement.textContent = `${data.name}: ${data.message}`;
    chatMessages.appendChild(messageElement);
  });

  // Przewijamy na dół, aby zobaczyć najnowsze wiadomości
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);
      const gameStateRef = firebase.database().ref(`gameState/${playerId}`);
  
      // Wczytaj stan gry z bazy danych Firebase
      gameStateRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
          const { x, y, direction, color, coins } = data;
          playerRef.set({
            id: playerId,
            name: createName(),
            direction,
            color,
            x,
            y,
            coins
          });
        } else {
          const { x, y } = getRandomSafeSpot();
          playerRef.set({
            id: playerId,
            name: createName(),
            direction: "right",
            color: randomFromArray(playerColors),
            x,
            y,
            coins: 0,
          });
        }
      });
  
      playerRef.onDisconnect().remove();
      initGame();
    } else {
      // You're logged out.
    }
  });
  

  firebase.auth().signInAnonymously().catch((error) => {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorCode, errorMessage);
  });
})();
