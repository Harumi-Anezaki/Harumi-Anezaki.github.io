// game.js

// Canvasの取得
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 入力オブジェクト
const input = {
    left: false,
    right: false,
    up: false,
    down: false,
};

// キーボードイベントのリスナーを追加
window.addEventListener('keydown', function(e) {
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            input.left = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            input.right = true;
            break;
        case 'ArrowUp':
        case 'KeyW':
            input.up = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            input.down = true;
            break;
        case 'Space':
            // 攻撃処理
            shootBullet();
            break;
    }
});

window.addEventListener('keyup', function(e) {
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            input.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            input.right = false;
            break;
        case 'ArrowUp':
        case 'KeyW':
            input.up = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            input.down = false;
            break;
    }
});

// プレイヤークラス
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 200; // ピクセル/秒
        this.size = 20;
    }

    update(deltaTime) {
        // 入力に応じて位置を更新
        if (input.left) this.x -= this.speed * deltaTime / 1000;
        if (input.right) this.x += this.speed * deltaTime / 1000;
        if (input.up) this.y -= this.speed * deltaTime / 1000;
        if (input.down) this.y += this.speed * deltaTime / 1000;

        // 画面外に出ないように制限
        this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));
    }

    draw(ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// 敵クラス
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 100;
        this.size = 20;
    }

    update(deltaTime, player) {
        // プレイヤーに向かって移動
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0) {
            this.x += (dx / distance) * this.speed * deltaTime / 1000;
            this.y += (dy / distance) * this.speed * deltaTime / 1000;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// 弾クラス
class Bullet {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.speed = 400;
        this.size = 5;
        this.direction = direction;
    }

    update(deltaTime) {
        this.x += this.direction.x * this.speed * deltaTime / 1000;
        this.y += this.direction.y * this.speed * deltaTime / 1000;
    }

    draw(ctx) {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// パワーアップクラス
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
    }

    draw(ctx) {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// ゲームオブジェクトの生成
const player = new Player(canvas.width / 2, canvas.height / 2);
const enemies = [];
const bullets = [];
const powerUps = [];
let score = 0;
let life = 3;

// 最初に敵を生成
spawnEnemies();

// ゲームループの開始
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

function update(deltaTime) {
    player.update(deltaTime);

    bullets.forEach((bullet, index) => {
        bullet.update(deltaTime);

        if (
            bullet.x < 0 ||
            bullet.x > canvas.width ||
            bullet.y < 0 ||
            bullet.y > canvas.height
        ) {
            bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, enemyIndex) => {
        enemy.update(deltaTime, player);

        bullets.forEach((bullet, bulletIndex) => {
            if (isColliding(bullet, enemy)) {
                enemies.splice(enemyIndex, 1);
                bullets.splice(bulletIndex, 1);

                // スコアを加算
                score += 100;
                document.getElementById('score').textContent = score;
            }
        });

        if (isColliding(player, enemy)) {
            life -= 1;
            document.getElementById('life').textContent = life;

            if (life <= 0) {
                alert('ゲームオーバー');
                resetGame();
            }
        }
    });

    powerUps.forEach((powerUp, index) => {
        if (isColliding(player, powerUp)) {
            powerUps.splice(index, 1);

            // パワーアップ効果を適用（例：スピードアップ）
            player.speed += 50;
            setTimeout(() => {
                // 効果が切れる
                player.speed -= 50;
            }, 5000); // 5秒間効果持続
        }
    });

    // 敵がいなくなったら新たに生成
    if (enemies.length === 0) {
        spawnEnemies();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.draw(ctx);

    bullets.forEach(bullet => {
        bullet.draw(ctx);
    });

    enemies.forEach(enemy => {
        enemy.draw(ctx);
    });

    powerUps.forEach(powerUp => {
        powerUp.draw(ctx);
    });
}

function isColliding(a, b) {
    return a.x < b.x + b.size &&
           a.x + a.size > b.x &&
           a.y < b.y + b.size &&
           a.y + a.size > b.y;
}

// 敵をランダムな位置に生成する関数
function spawnEnemies() {
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * (canvas.width - 20);
        const y = Math.random() * (canvas.height - 20);
        enemies.push(new Enemy(x, y));
    }
}

// 弾を発射する関数
function shootBullet() {
    // プレイヤーの向きに応じて弾を発射（今回は上方向に固定）
    const direction = { x: 0, y: -1 };
    const bullet = new Bullet(
        player.x + player.size / 2 - 2.5,
        player.y,
        direction
    );
    bullets.push(bullet);
}

// パワーアップをランダムに生成
setInterval(() => {
    const x = Math.random() * (canvas.width - 15);
    const y = Math.random() * (canvas.height - 15);
    powerUps.push(new PowerUp(x, y));
}, 5000); // 5秒ごとに生成

// ゲームをリセットする関数
function resetGame() {
    // 変数の初期化
    score = 0;
    life = 3;
    document.getElementById('score').textContent = score;
    document.getElementById('life').textContent = life;

    // 配列のクリア
    enemies.length = 0;
    bullets.length = 0;
    powerUps.length = 0;

    // プレイヤーの位置をリセット
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;

    // 敵を再生成
    spawnEnemies();
}