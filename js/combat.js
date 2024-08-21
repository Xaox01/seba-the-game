function handleAttack(players, playerId, playerRef) {
  const player = players[playerId];

  if (!player) {
    console.error("Player not found in players object.");
    return;
  }

  // Iterujemy przez wszystkich graczy
  Object.keys(players).forEach((otherPlayerId) => {
    if (otherPlayerId !== playerId) {
      const otherPlayer = players[otherPlayerId];

      if (!otherPlayer) {
        console.error(`Other player ${otherPlayerId} not found.`);
        return;
      }

      // Sprawdzamy, czy inny gracz jest w zasięgu jednego bloku
      const inRange = Math.abs(player.x - otherPlayer.x) <= 1 && Math.abs(player.y - otherPlayer.y) <= 1;

      if (inRange) {
        // Odejmujemy 1 punkt zdrowia, ale nie pozwalamy zejść poniżej zera
        otherPlayer.health = Math.max(otherPlayer.health - 1, 0);

        // Natychmiast aktualizujemy pasek zdrowia przeciwnika w DOM
        updateGlobalHealthBarForPlayer(otherPlayerId, otherPlayer);

        // Aktualizacja zdrowia przeciwnika w Firebase
        firebase.database().ref(`players/${otherPlayerId}`).update({
          health: otherPlayer.health
        }).catch((error) => {
          console.error("Firebase update failed: ", error);
        });
      }
    }
  });
}

function updateGlobalHealthBarForPlayer(playerId, player) {
  // Znalezienie elementu paska zdrowia dla konkretnego gracza
  const healthBarFill = document.getElementById(`health-bar-fill-${playerId}`);

  if (!healthBarFill) {
    console.warn(`Health bar for player ${playerId} not found!`);
    return;
  }

  // Ustawienie procentowego zdrowia na podstawie aktualnego zdrowia
  const healthPercentage = (player.health / 10) * 100;
  healthBarFill.style.width = `${healthPercentage}%`;

  // Upewnienie się, że kolor paska zdrowia jest czerwony
  healthBarFill.style.backgroundColor = 'yellow';
}

