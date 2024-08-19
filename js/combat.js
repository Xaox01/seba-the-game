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

        // Aktualizujemy pasek zdrowia natychmiast w DOM
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
  const healthBarFill = document.getElementById(`health-bar-fill-${playerId}`);

  // Sprawdzamy, czy pasek zdrowia istnieje i czy gracz jest zdefiniowany
  if (!healthBarFill) {
    console.warn(`Health bar for player ${playerId} not found!`);
    return;
  }

  if (player) {
    const healthPercentage = (player.health / 10) * 100;  // Zakładamy, że maksymalne zdrowie to 10
    healthBarFill.style.width = `${healthPercentage}%`;
  }
}
