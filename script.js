let gameRunning = true;

let playAgainstCPU = true;
let winner = 0; // Current game winner
let score = [0, 0]; // Current score

// Generate row masks
function generateRowMasks() {
    let masks = [];
    // Vertical
    for(let i = 0n; i < 21n; i += 1n) {
        masks.push(0x204081n << i);
    }
    // Horizontal
    for(let y = 0n; y < 6n; y += 1n) {
        for(let i = 0n; i < 4n; i += 1n) {
            masks.push(0xfn << (i + y*7n));
        }
    }
    // Diagonal (downward slope from left to right)
    for(let i = 0n; i < 3; i += 1n) {
        for(let j = 0n; j < 4n; j += 1n) {
            masks.push(0x1010101n << (j + i*7n));
        }
    }
    // Diagonal (upward slope from left to right)
    for(let i = 0n; i < 3; i += 1n) {
        for(let j = 0n; j < 4n; j += 1n) {
            masks.push(0x208208n << (j + i*7n));
        }
    }
    return masks;
}

const rowMasks = generateRowMasks(); // Row mask (4 in a row)

class Board {
    constructor(board1, board2, flags) {
        this.bitboardPlayer1 = board1;
        this.bitboardPlayer2 = board2;
        this.flags = flags;
    }

    // Returns winner (1 = player1, 0 = draw, -1 = player2)
    getWinner() {
        // Apply row masks to bitboards to check for winner
        for(let i = 0; i < rowMasks.length; i++) {
            if((this.bitboardPlayer1 & rowMasks[i]) === rowMasks[i]) {
                return 1;
            }
        }
        for(let i = 0; i < rowMasks.length; i++) {
            if((this.bitboardPlayer2 & rowMasks[i]) === rowMasks[i]) {
                return -1;
            }
        }
        return 0;
    }

    // Returns true if the board is full
    isFull() {
        return (this.bitboardPlayer1 | this.bitboardPlayer2) >= 0x3ffffffffffn;
    }

    // Returns the y coordinate of the top-most disc
    getTop(x) {
        let mask = BigInt(1n << BigInt(x));
        for(let i = 0; i < 6; i++) {
            if((this.bitboardPlayer1 | this.bitboardPlayer2) & mask) {
                mask <<= 7n;
            } else {
                return 6 - i;
            }
        }
    }

    // Places a disk at a column
    placeDisc(x) {
        let mask = BigInt(1n << BigInt(x));
        if(this.flags & 1) {
            for(let i = 0; i < 6; i++) {
                if((this.bitboardPlayer1 | this.bitboardPlayer2) & mask) {
                    mask <<= 7n;
                } else {
                    this.bitboardPlayer1 |= mask;
                    break;
                }
            }
        } else {
            for(let i = 0; i < 6; i++) {
                if((this.bitboardPlayer1 | this.bitboardPlayer2) & mask) {
                    mask <<= 7n;
                } else {
                    this.bitboardPlayer2 |= mask;
                    break;
                }
            }
        }
    }
}

// Evaluations for 
const distributionEval = [
    10, 15, 20, 22, 20, 15, 10,
    10, 15, 20, 22, 20, 15, 10,
    10, 15, 20, 22, 20, 15, 10,
    10, 15, 20, 22, 20, 15, 10,
    10, 15, 20, 22, 20, 15, 10,
    10, 15, 20, 22, 20, 15, 10
];

// Evaluates disc distribution
function evalDiscDistribution(board) {
    let eval = 0;
    for(let i = 0; i < 42; i++) {
        if(board.bitboardPlayer1 & (1n << BigInt(i))) {
            eval += distributionEval[i];
        }
    }
    for(let i = 0; i < 42; i++) {
        if(board.bitboardPlayer2 & (1n << BigInt(i))) {
            eval -= distributionEval[i];
        }
    }
    return eval;
}

// Minimax algorithm
function minimax(board, maximizing, depth, alpha, beta) {
    let bestEval = [0, 0]; // [eval, move]

    // Evaluate if the node is a leaf node, else call minimax recursively
    if(depth === 0 || board.getWinner() != 0 || board.isFull()) {
        return [board.getWinner() * 100 + evalDiscDistribution(board) - (depth * (maximizing ? 1 : -1)), -1];
    } else {
        if(maximizing) {
            bestEval[0] = -Infinity;

            // Create instances of hypothetical positions for each legal move
            for(let i = 6; i >= 0; i--) {
                if(board.getTop(i) > 0) {
                    let hypotheticalBoard = new Board(board.bitboardPlayer1, board.bitboardPlayer2, 1); // Hypothetical board instance
                    hypotheticalBoard.placeDisc(i); // Hypothetical move

                    // Call minimax algorithm on new position
                    const hypotheticalEval = minimax(hypotheticalBoard, false, depth-1, alpha, beta);

                    // Store the best possible outcome
                    if(bestEval[0] < hypotheticalEval[0]) {
                        bestEval[0] = hypotheticalEval[0];
                        bestEval[1] = i;
                    }
                    
                    // Alpha-beta pruning
                    alpha = Math.max(alpha, bestEval[0]);
                    if(beta <= alpha) {
                        break;
                    }
                }
            }
        } else {
            bestEval[0] = Infinity;

            // Create instances of hypothetical positions for each legal move
            for(let i = 6; i >= 0; i--) {
                if(board.getTop(i) > 0) {
                    let hypotheticalBoard = new Board(board.bitboardPlayer1, board.bitboardPlayer2, 0); // Hypothetical board instance
                    hypotheticalBoard.placeDisc(i); // Hypothetical move

                    // Call minimax algorithm on new position
                    const hypotheticalEval = minimax(hypotheticalBoard, true, depth-1, alpha, beta);

                    // Store the best possible outcome
                    if(bestEval[0] > hypotheticalEval[0]) {
                        bestEval[0] = hypotheticalEval[0];
                        bestEval[1] = i;
                    }

                    // Alpha-beta pruning
                    beta = Math.min(beta, bestEval[0]);
                    if(beta <= alpha) {
                        break;
                    }
                }
            }
        }

        // Reutrn the best possible outcome for this position
        return bestEval;
    }
}

// Main game board
let gameBoard = new Board(BigInt(0), BigInt(0), 1);

// HTML canvas and browser context
let canvas = document.getElementById("game");
let context = canvas.getContext("2d");

// Connect 4 disc size
const discRadius = 45;
const distanceBetweenCells = 15;

// Grid X, Y positions relative to the canvas
const gridX = discRadius + (canvas.width - 7*(discRadius*2+distanceBetweenCells))/2;
const gridY = discRadius * 3;

let selectedColumn = 0; // Current selected column on the connect 4 grid

/*
Board reset buttons
*/

document.getElementById("vscpu").onclick = () => {
    gameBoard = new Board(BigInt(0), BigInt(0), 1);
    playAgainstCPU = true;
    winner = 0;
    gameRunning = true;
};

document.getElementById("vsp2").onclick = () => {
    gameBoard = new Board(BigInt(0), BigInt(0), 1);
    playAgainstCPU = false;
    winner = 0;
    gameRunning = true;
};

// Gets selected column
canvas.addEventListener("mousemove", (event) => {
    if((gameBoard.flags & 1) && gameRunning) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        if(mouseY > (gridY - discRadius) && mouseY < gridY+6*(discRadius*2 + distanceBetweenCells)) {
            selectedColumn = Math.floor((mouseX - gridX - discRadius) / (discRadius*2 + distanceBetweenCells)) + 1;
        } else {
            selectedColumn = -1;
        }
    }
});

// Throws in a disc
canvas.addEventListener("click", (event) => {
    if(winner === 0 && gameRunning) {
        // Player move
        gameBoard.placeDisc(6 - selectedColumn);
        gameBoard.flags ^= 1; // Swap turns
        winner = gameBoard.getWinner(); // Check for 4 in a row
        if(winner === 1) {
            score[0]++;
            gameRunning = false;
        } else if(winner === -1) {
            score[1]++;
            gameRunning = false;
        }

        // Computer move
        if(playAgainstCPU) {
            gameBoard.placeDisc(minimax(gameBoard, false, 6, -Infinity, Infinity)[1]);
            gameBoard.flags ^= 1; // Swap turns
            winner = gameBoard.getWinner(); // Check for 4 in a row
            if(winner === 1) {
                score[0]++;
                gameRunning = false;
            } else if(winner === -1) {
                score[1]++;
                gameRunning = false;
            }
        }
    }
});

// Draws a disk on the connect 4 grid
function drawDisc(xPos, yPos) {
    const x = Number(xPos);
    const y = Number(yPos);
    context.beginPath();
    context.arc(x * (discRadius*2 + distanceBetweenCells) + gridX, y * (discRadius*2 + distanceBetweenCells) + gridY, discRadius, 0, 2 * Math.PI);
    context.fill();
}

function drawDiscs(board) {
    context.fillStyle ='red';
    for(var i = BigInt(0); i < BigInt(42); i++) {
        if((board.bitboardPlayer1 & (1n << i))) {
            drawDisc(6n - i % 7n, 5n - i / 7n);
        }
    }
    context.fillStyle ='yellow';
    for(var i = BigInt(0); i < BigInt(42); i++) {
        if((board.bitboardPlayer2 & (1n << i))) {
            drawDisc(6n - i % 7n, 5n - i / 7n);
        }
    }
}

// Main game loop
function gameLoop() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw empty cells
    context.fillStyle = 'rgb(56, 53, 53)';
    for(var y = 0; y < 6; y++) {
        for(var x = 0; x < 7; x++) {
            drawDisc(x, y);
        }
    }

    // Draw discs
    drawDiscs(gameBoard);

    // Draw score
    context.fillStyle = 'white';
    context.font = "30px Arial";
    context.fillText(`Score: ${score[0]} - ${score[1]}`, canvas.width/2-90, canvas.height - 70);

    if(winner === 0) {
        // Check for draws
        if(gameBoard.isFull()) {
            context.fillStyle = 'gray';
            context.font = "bold 40px Arial";
            context.fillText("It's a draw!", canvas.width/2 - 110, 50);
            gameRunning = false;
        } else {
            // Highlight selected column
            if(selectedColumn >= 0 && selectedColumn < 7) {
                context.fillStyle = (gameBoard.flags === 1) ? 'rgba(255, 127, 127, 0.3)' : 'rgba(255, 255, 0, 0.3)';
                drawDisc(selectedColumn, gameBoard.getTop(6 - selectedColumn)-1);
            }
        }
    } else {
        // Display a message saying who the winner is
        if(winner === 1) {
            context.fillStyle = 'red';
            context.font = "bold 40px Arial";
            context.fillText("Player 1 wins!", canvas.width/2 - 140, 50);
            gameRunning = false;
        } else {
            context.fillStyle = 'yellow';
            context.font = "bold 40px Arial";
            if(playAgainstCPU) {
                context.fillText("CPU wins!", canvas.width/2 - 120, 50);
            } else {
                context.fillText("Player 2 wins!", canvas.width/2 - 140, 50);
            }
            gameRunning = false;
        }
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);