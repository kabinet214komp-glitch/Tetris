const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");

const COLS = 10;
const ROWS = 20;

let blockSize;

function resizeCanvas() {

    const maxWidth = Math.min(window.innerWidth - 36, 360);
    const maxHeight = window.innerHeight - 260;

    blockSize = Math.floor(
        Math.min(maxWidth / COLS, maxHeight / ROWS)
    );

    canvas.width = COLS * blockSize;
    canvas.height = ROWS * blockSize;
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

const pieces = [
    {
        shape: [
            [1, 1, 1, 1]
        ],
        type: "I"
    },
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        type: "O"
    },
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        type: "T"
    },
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        type: "S"
    },
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        type: "Z"
    },
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        type: "J"
    },
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        type: "L"
    }
];

const colors = {
    I: "#27e6ff",
    O: "#ffe14a",
    T: "#bd58ff",
    S: "#48e07a",
    Z: "#ff506e",
    J: "#4f83ff",
    L: "#ff9a45"
};

let board;
let current;
let nextPiece;

let score = 0;
let lines = 0;
let level = 1;

let running = false;
let paused = false;

let dropCounter = 0;
let lastTime = 0;

let particles = [];

function createBoard() {

    return Array.from(
        { length: ROWS },
        () => Array(COLS).fill(null)
    );
}

function randomPiece() {

    const p = pieces[
        Math.floor(Math.random() * pieces.length)
    ];

    return {
        matrix: p.shape.map(row => [...row]),
        type: p.type,
        x: Math.floor(
            (COLS - p.shape[0].length) / 2
        ),
        y: 0
    };
}

function startGame() {

    board = createBoard();

    score = 0;
    lines = 0;
    level = 1;

    updateStats();

    current = randomPiece();
    nextPiece = randomPiece();

    running = true;
    paused = false;

    overlay.classList.add("hidden");

    lastTime = performance.now();

    requestAnimationFrame(update);

    drawNext();
}

function collide(piece, board) {

    for (let y = 0; y < piece.matrix.length; y++) {

        for (let x = 0; x < piece.matrix[y].length; x++) {

            if (
                piece.matrix[y][x] &&
                (
                    board[y + piece.y] === undefined ||
                    board[y + piece.y][x + piece.x] === undefined ||
                    board[y + piece.y][x + piece.x]
                )
            ) {
                return true;
            }
        }
    }

    return false;
}

function merge() {

    current.matrix.forEach((row, y) => {

        row.forEach((value, x) => {

            if (value) {
                board[y + current.y][x + current.x] =
                    current.type;
            }

        });

    });
}

function rotate(matrix) {

    return matrix[0].map(
        (_, index) =>
            matrix.map(row => row[index]).reverse()
    );
}

function playerRotate() {

    const oldMatrix = current.matrix;

    current.matrix = rotate(current.matrix);

    if (collide(current, board)) {

        current.matrix = oldMatrix;

    } else {

        vibrate(15);
    }
}

function playerMove(dir) {

    current.x += dir;

    if (collide(current, board)) {
        current.x -= dir;
    } else {
        vibrate(8);
    }
}

function playerDrop() {

    current.y++;

    if (collide(current, board)) {

        current.y--;

        merge();

        clearLines();

        current = nextPiece;
        current.x =
            Math.floor(
                (COLS - current.matrix[0].length) / 2
            );

        current.y = 0;

        nextPiece = randomPiece();

        if (collide(current, board)) {
            gameOver();
        }

        drawNext();
    }

    dropCounter = 0;
}

function hardDrop() {

    while (!collide(current, board)) {
        current.y++;
    }

    current.y--;

    playerDrop();
}

function clearLines() {

    let cleared = 0;

    outer:
    for (let y = ROWS - 1; y >= 0; y--) {

        for (let x = 0; x < COLS; x++) {

            if (!board[y][x]) {
                continue outer;
            }
        }

        particles.push({
            y,
            time: 0
        });

        board.splice(y, 1);

        board.unshift(
            Array(COLS).fill(null)
        );

        y++;

        cleared++;
    }

    if (cleared > 0) {

        const points = [0, 100, 300, 500, 800];

        score += points[cleared] * level;

        lines += cleared;

        level =
            Math.floor(lines / 10) + 1;

        updateStats();

        vibrate(40);
    }
}

function updateStats() {

    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
}

function getSpeed() {

    return Math.max(
        90,
        800 - (level - 1) * 65
    );
}

function drawCell(ctx, x, y, size, type) {

    const color = colors[type];

    const px = x * size;
    const py = y * size;

    const gradient =
        ctx.createLinearGradient(
            px,
            py,
            px + size,
            py + size
        );

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "#ffffff");

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.roundRect(
        px + 2,
        py + 2,
        size - 4,
        size - 4,
        Math.max(3, size * .12)
    );

    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.25)";

    ctx.beginPath();

    ctx.roundRect(
        px + size * .16,
        py + size * .13,
        size * .68,
        size * .18,
        4
    );

    ctx.fill();
}

function drawBoard() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "rgba(0,0,0,.35)";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= COLS; x++) {

        ctx.beginPath();

        ctx.moveTo(
            x * blockSize,
            0
        );

        ctx.lineTo(
            x * blockSize,
            canvas.height
        );

        ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y * blockSize
        );

        ctx.lineTo(
            canvas.width,
            y * blockSize
        );

        ctx.stroke();
    }

    board.forEach((row, y) => {

        row.forEach((type, x) => {

            if (type) {
                drawCell(
                    ctx,
                    x,
                    y,
                    blockSize,
                    type
                );
            }

        });

    });

    if (current) {

        current.matrix.forEach((row, y) => {

            row.forEach((value, x) => {

                if (value) {

                    drawCell(
                        ctx,
                        x + current.x,
                        y + current.y,
                        blockSize,
                        current.type
                    );

                }

            });

        });

    }
}

function drawNext() {

    nextCanvas.width = 75;
    nextCanvas.height = 55;

    nextCtx.clearRect(
        0,
        0,
        75,
        55
    );

    if (!nextPiece) return;

    const size = 13;

    const width = nextPiece.matrix[0].length * size;
    const height = nextPiece.matrix.length * size;

    const offsetX = (75 - width) / 2;
    const offsetY = (55 - height) / 2;

    nextPiece.matrix.forEach((row, y) => {

        row.forEach((value, x) => {

            if (value) {

                drawCell(
                    nextCtx,
                    x + offsetX / size,
                    y + offsetY / size,
                    size,
                    nextPiece.type
                );

            }

        });

    });
}

function update(time = 0) {

    if (!running) return;

    const delta = time - lastTime;

    lastTime = time;

    if (!paused) {

        dropCounter += delta;

        if (dropCounter > getSpeed()) {
            playerDrop();
        }

        drawBoard();
        updateParticles(delta);
    }

    requestAnimationFrame(update);
}

function updateParticles(delta) {

    particles.forEach(p => {
        p.time += delta;
    });

    particles =
        particles.filter(
            p => p.time < 300
        );
}

function gameOver() {

    running = false;

    overlayTitle.textContent = "GAME OVER";

    overlayText.textContent =
        `Счёт: ${score} • Линии: ${lines}`;

    startBtn.textContent =
        "↻ ИГРАТЬ СНОВА";

    overlay.classList.remove("hidden");

    sendScore();

    vibrate([100, 50, 100]);
}

function togglePause() {

    if (!running) return;

    paused = !paused;

    pauseBtn.textContent =
        paused ? "▶" : "Ⅱ";
}

function vibrate(pattern) {

    try {

        if (tg?.HapticFeedback) {

            tg.HapticFeedback.impactOccurred(
                "light"
            );

        } else if (navigator.vibrate) {

            navigator.vibrate(pattern);
        }

    } catch {}
}

function sendScore() {

    if (!tg) return;

    try {

        tg.sendData(
            JSON.stringify({
                game: "tetris",
                score,
                lines,
                level
            })
        );

    } catch (e) {

        console.log(e);
    }
}

document.addEventListener(
    "keydown",
    e => {

        if (!running || paused) return;

        if (e.key === "ArrowLeft") {
            playerMove(-1);
        }

        if (e.key === "ArrowRight") {
            playerMove(1);
        }

        if (e.key === "ArrowDown") {
            playerDrop();
        }

        if (e.key === "ArrowUp") {
            playerRotate();
        }

        if (e.key === " ") {
            hardDrop();
        }
    }
);

document
    .querySelectorAll(".controls button")
    .forEach(button => {

        const key = button.dataset.key;

        button.addEventListener(
            "pointerdown",
            e => {

                e.preventDefault();

                if (!running || paused) return;

                if (key === "left") {
                    playerMove(-1);
                }

                if (key === "right") {
                    playerMove(1);
                }

                if (key === "down") {
                    playerDrop();
                }

                if (key === "rotate") {
                    playerRotate();
                }
            }
        );
    });

startBtn.addEventListener(
    "click",
    startGame
);

pauseBtn.addEventListener(
    "click",
    togglePause
);

drawBoard();
