
let tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
let moves = 0;

const board = document.getElementById("board");
const moveDisplay = document.getElementById("moves");
const status = document.getElementById("status");

function isSolved() {
    return tiles.every((tile, index) => tile === (index + 1) % 9);
}

function renderBoard() {
    board.innerHTML = "";

    tiles.forEach((number, index) => {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = number === 0 ? "tile empty" : "tile";
        tile.textContent = number === 0 ? "" : number;
        tile.disabled = number === 0;
        tile.setAttribute(
            "aria-label",
            number === 0 ? "Empty space" : `Tile ${number}`,
        );

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
        Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;

    if (!adjacent) return;

    [tiles[index], tiles[emptyIndex]] =
        [tiles[emptyIndex], tiles[index]];

    moves += 1;
    renderBoard();

    if (isSolved()) {
        status.textContent = "Congratulations! Puzzle solved!";
        return;
    }

    status.textContent = "Arrange the tiles!";
}

function shuffleBoard() {
    const directions = [-3, 3, -1, 1];

    do {
        tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
        moves = 0;

        for (let i = 0; i < 1000; i += 1) {
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
    } while (isSolved());

    status.textContent = "Arrange the tiles!";
    renderBoard();
}

document.getElementById("shuffle")
    .addEventListener("click", shuffleBoard);

renderBoard();
shuffleBoard();
