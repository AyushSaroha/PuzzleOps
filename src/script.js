
let tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
let moves = 0;

const board = document.getElementById("board");
const moveDisplay = document.getElementById("moves");
const status = document.getElementById("status");

function renderBoard() {
    board.innerHTML = "";

    tiles.forEach((number, index) => {
        const tile = document.createElement("div");

        tile.className = number === 0
            ? "tile empty"
            : "tile";

        tile.textContent = number === 0 ? "" : number;

        tile.addEventListener("click", () => {
            moveTile(index);
        });

        board.appendChild(tile);
    });

    moveDisplay.textContent = `Moves: ${moves}`;
}

function moveTile(index) {
    const emptyIndex = tiles.indexOf(0);

    const row = Math.floor(index / 3);
    const emptyRow = Math.floor(emptyIndex / 3);

    const col = index % 3;
    const emptyCol = emptyIndex % 3;

    const adjacent =
        Math.abs(row - emptyRow) +
        Math.abs(col - emptyCol) === 1;

    if (!adjacent) return;

    [tiles[index], tiles[emptyIndex]] =
        [tiles[emptyIndex], tiles[index]];

    moves++;

    renderBoard();

    if (tiles.every((tile, i) => tile === (i + 1) % 9)) {
        status.textContent = "Congratulations! Puzzle Solved!";
    }
}

function shuffleBoard() {
    const directions = [
        -3, 3, -1, 1
    ];

    for (let i = 0; i < 1000; i++) {
        const empty = tiles.indexOf(0);

        const validMoves = directions.filter(direction => {
            const next = empty + direction;

            if (next < 0 || next > 8) return false;

            if (direction === -1 && empty % 3 === 0) return false;
            if (direction === 1 && empty % 3 === 2) return false;

            return true;
        });

        const selected = validMoves[
            Math.floor(Math.random() * validMoves.length)
        ];

        [tiles[empty], tiles[empty + selected]] =
            [tiles[empty + selected], tiles[empty]];
    }

    moves = 0;
    status.textContent = "Arrange the tiles!";
    renderBoard();
}

document.getElementById("shuffle")
    .addEventListener("click", shuffleBoard);

renderBoard();
shuffleBoard();
