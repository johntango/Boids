
let canvas, ctx;

let gravityLevels = [0.3, 0.6, 1.0, 1.5, 2.0];
let currentLevel = 0;
let gravity = gravityLevels[currentLevel];
let score = 0;
const platformHeight = 10;

let player = {
    x: 50,
    y: 300,
    width: 20,
    height: 20,
    color: "lime",
    velX: 0,
    velY: 0,
    jumping: false,
};

let keys = {};
let platforms = [];
let agentMode = false;
let waitingForLLMDecision = true;
let awaitingLLMResponse = false;



function createPlatforms() {
    platforms = [
        { x: 0, y: 380, width: 600 },
        { x: 100, y: 300, width: 100 },
        { x: 250, y: 250, width: 100 },
        { x: 400, y: 200, width: 100 },
        { x: 550, y: 150, width: 100 },
    ];
}

function updateLevel() {
    currentLevel = Math.min(currentLevel + 1, gravityLevels.length - 1);
    gravity = gravityLevels[currentLevel];
    document.getElementById("level").textContent = currentLevel + 1;
}

function restartGame() {
    player.x = 50;
    player.y = 300;
    player.velX = 0;
    player.velY = 0;
    player.jumping = false;
    score = 0;
    currentLevel = 0;
    gravity = gravityLevels[currentLevel];
    document.getElementById("level").textContent = 1;
    document.getElementById("score").textContent = 0;
}

async function getGameState() {
    return {
        player: { ...player },
        gravity: gravity,
        platforms: platforms,
        level: currentLevel,
    };
}

function applyAction(action) {
    switch (action) {
      case "moveRight":
        player.velX = 3;
        break;
      case "moveLeft":
        player.velX = -3;
        break;
      case "jump":
        if (!player.jumping) {
          player.jumping = true;
          player.velY = -10;
          waitingForLLMDecision = false;
        }
        break;
      case "jumpRight":
        if (!player.jumping) {
          player.jumping = true;
          player.velY = -10;
          player.velX = 3;
          waitingForLLMDecision = false;
        }
        break;
      case "jumpLeft":
        if (!player.jumping) {
          player.jumping = true;
          player.velY = -10;
          player.velX = -3;
          waitingForLLMDecision = false;
        }
        break;
      case "noop":
        player.velX = 0;
        break;
      case "restart":
        restartGame();
        break;
      default:
        console.warn("Unknown action:", action);
    }
  }

async function llmAgentDecision(state) {
    try {
        const response = await fetch("https://reimagined-guide-jq56jqj9jq5hpx94-3000.app.github.dev/decide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state),
        });
        const data = await response.json();
        return data.action || "noop";
    } catch (err) {
        console.error("LLM API Error:", err);
        return "noop";
    }
}

function physicsAndRender() {
    player.velY += gravity;
    player.y += player.velY;
    player.x += player.velX;
    player.velX *= 0.9;

    for (let p of platforms) {
      if (
        player.x < p.x + p.width &&
        player.x + player.width > p.x &&
        player.y + player.height > p.y &&
        player.y + player.height < p.y + platformHeight + player.velY
      ) {
        player.y = p.y - player.height;
        player.velY = 0;
        if (player.jumping) {
          player.jumping = false;
          waitingForLLMDecision = true;
        }
      }
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width)
      player.x = canvas.width - player.width;
    if (player.y > canvas.height) restartGame();

    if (player.x > 550 && currentLevel < gravityLevels.length - 1) {
      updateLevel();
      player.x = 50;
      player.y = 300;
      score += 10;
      document.getElementById("score").textContent = score;
      waitingForLLMDecision = true;
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Platforms
    ctx.fillStyle = "white";
    for (let p of platforms) {
      ctx.fillRect(p.x, p.y, p.width, platformHeight);
    }

    // Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 20);
    ctx.fillText("Level: " + (currentLevel + 1), 10, 50);
    ctx.fillText("Gravity: " + gravity, 10, 80);
    ctx.fillText("Agent Mode: " + (agentMode ? "ON" : "OFF"), 10, 110);
    ctx.fillText("LLM Ready: " + (waitingForLLMDecision ? "Yes" : "No"), 10, 140);
    ctx.fillText("LLM Request: " + (awaitingLLMResponse ? "Busy" : "Idle"), 10, 160);
  }

function gameLoop() {
    const step = async () => {
        if (agentMode) {
            if (!player.jumping && waitingForLLMDecision && !awaitingLLMResponse) {
                awaitingLLMResponse = true;
                try {
                    const state = await getGameState();
                    state.platforms = platforms.map((p) => ({
                        x: p.x,
                        y: p.y,
                        width: p.width,
                    }));
                    const action = await llmAgentDecision(state);
                    applyAction(action);
                } catch (err) {
                    console.error("Agent decision error:", err);
                } finally {
                    awaitingLLMResponse = false;
                }
            }
        } else {
            if (keys["ArrowLeft"]) player.velX = -3;
            if (keys["ArrowRight"]) player.velX = 3;
        }

        physicsAndRender();
        requestAnimationFrame(gameLoop);
    };
    step();
}

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " " && !player.jumping && !agentMode) {
        player.jumping = true;
        player.velY = -10;
    }
    if (e.key.toLowerCase() === "a") agentMode = !agentMode;
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    createPlatforms();
    gameLoop(); // start the loop!
});

