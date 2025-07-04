function startGame(gameName) {
    document.getElementById('game-frame').src = gameName + '.html';
    document.getElementById('game-modal').style.display = 'block';
}

function closeGame() {
    document.getElementById('game-modal').style.display = 'none';
    document.getElementById('game-frame').src = '';
}