// game.js

// --- Libraries ---
// jQuery (for DOM manipulation, not strictly necessary with PixiJS, but can be helpful)
// PixiJS (for rendering)
// Howler.js (for audio)

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const ENEMY_SPEED = 2;
const FIRE_RATE = 200; // milliseconds between shots
const ENEMY_SPAWN_RATE = 1000; // milliseconds

// --- Game State ---
let player;
let bullets = [];
let enemies = [];
let lastFireTime = 0;
let lastEnemySpawnTime = 0;
let score = 0;
let gameOver = false;
let keys = {}; // Keep track of pressed keys



// --- PixiJS Setup ---
const app = new PIXI.Application({
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  view: document.getElementById('gameCanvas'),
  backgroundColor: 0x000000, // Black background
});

// --- Sound Effects (Howler.js) ---
const shootSound = new Howl({
  src: ['shoot.wav'], // Replace with your sound file
});

const explosionSound = new Howl({
    src: ['explosion.wav'], // Replace
});

const hitSound = new Howl({
    src: ['hit.wav'] //Replace
});




// --- Game Object Creation ---

function createPlayer() {
  player = new PIXI.Sprite(PIXI.Texture.WHITE); // Use a simple white square for now
  player.tint = 0x00FF00; // Green player
  player.width = 30;
  player.height = 30;
  player.anchor.set(0.5); // Set anchor to the center
  player.x = CANVAS_WIDTH / 2;
  player.y = CANVAS_HEIGHT - 50;
  app.stage.addChild(player);
}

function createBullet(x, y) {
  const bullet = new PIXI.Sprite(PIXI.Texture.WHITE);
  bullet.tint = 0xFFFFFF; // white
  bullet.width = 5;
  bullet.height = 15;
  bullet.anchor.set(0.5);
  bullet.x = x;
  bullet.y = y;
  app.stage.addChild(bullet);
  bullets.push(bullet);
  shootSound.play();
}

function createEnemy() {
    const enemy = new PIXI.Sprite(PIXI.Texture.WHITE);
    enemy.tint = 0xFF0000; // Red
    enemy.width = 30;
    enemy.height = 30;
    enemy.anchor.set(0.5);
    enemy.x = Math.random() * CANVAS_WIDTH;
    enemy.y = 0;
    app.stage.addChild(enemy);
    enemies.push(enemy);
}



// --- Input Handling ---

$(document).keydown(function(event) {
  keys[event.key] = true;
});

$(document).keyup(function(event) {
  keys[event.key] = false;
});



// --- Collision Detection ---

function checkCollision(obj1, obj2) {
    const bounds1 = obj1.getBounds();
    const bounds2 = obj2.getBounds();
    return bounds1.x < bounds2.x + bounds2.width &&
           bounds1.x + bounds1.width > bounds2.x &&
           bounds1.y < bounds2.y + bounds2.height &&
           bounds1.y + bounds1.height > bounds2.y;
}


// --- Game Logic ---

function playerControls(delta) {
  if (keys['ArrowLeft'] || keys['a']) {
    player.x -= PLAYER_SPEED * delta;
  }
  if (keys['ArrowRight'] || keys['d']) {
    player.x += PLAYER_SPEED * delta;
  }
  if (keys['ArrowUp'] || keys['w']) {
      player.y -= PLAYER_SPEED * delta;
  }
  if(keys['ArrowDown'] || keys['s']){
      player.y += PLAYER_SPEED * delta;
  }

  // Keep player within bounds
  player.x = Math.max(player.x, player.width / 2);
  player.x = Math.min(player.x, CANVAS_WIDTH - player.width / 2);
  player.y = Math.max(player.y, player.height/2);
  player.y = Math.min(player.y, CANVAS_HEIGHT - player.height / 2);


  if (keys[' '] && (Date.now() - lastFireTime > FIRE_RATE)) { // Spacebar to fire
    createBullet(player.x, player.y - player.height / 2);
    lastFireTime = Date.now();
  }
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= BULLET_SPEED * delta;

    // Remove bullets that go off-screen
    if (bullets[i].y < 0) {
      app.stage.removeChild(bullets[i]);
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += ENEMY_SPEED * delta;

        if (enemies[i].y > CANVAS_HEIGHT) {
            app.stage.removeChild(enemies[i]);
            enemies.splice(i, 1);
        }
    }
}

function handleCollisions(){
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {

                explosionSound.play();

                app.stage.removeChild(bullets[i]);
                bullets.splice(i, 1);

                app.stage.removeChild(enemies[j]);
                enemies.splice(j, 1);

                score += 10;
                updateScoreDisplay();
                break; // Important:  Exit inner loop after a collision
            }
        }
    }

    //Player enemy collision
    for(let i = enemies.length-1; i>=0; i--){
        if(checkCollision(player, enemies[i])){
             hitSound.play();
             gameOver = true;
             endGame();
             return; // Exit update() immediately if game over
        }
    }
}

function spawnEnemies(){
    if(Date.now() - lastEnemySpawnTime > ENEMY_SPAWN_RATE){
        createEnemy();
        lastEnemySpawnTime = Date.now();
    }
}

// --- Score Display ---
const scoreText = new PIXI.Text('Score: 0', {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff,
});
scoreText.x = 10;
scoreText.y = 10;
app.stage.addChild(scoreText);

function updateScoreDisplay() {
    scoreText.text = 'Score: ' + score;
}

// --- Game Over ---
function endGame() {
    // Display game over message
    const gameOverText = new PIXI.Text('Game Over!', {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xff0000,
    });
    gameOverText.anchor.set(0.5);
    gameOverText.x = CANVAS_WIDTH / 2;
    gameOverText.y = CANVAS_HEIGHT / 2;
    app.stage.addChild(gameOverText);

    // Stop game updates (optional, but good practice)
     app.ticker.stop();
}


// --- Game Loop ---

function gameLoop(delta) {
  if (gameOver) {
      return;
  }

  playerControls(delta);
  updateBullets(delta);
  updateEnemies(delta);
  handleCollisions();
  spawnEnemies();

}


// --- Initialization ---

function startGame() {
  createPlayer();
 // createEnemy(); // Start with one enemy
  updateScoreDisplay(); // Initialize score display
  app.ticker.add(gameLoop); // Use PixiJS's ticker for smooth updates

}

startGame();