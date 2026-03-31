const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, traffic = [];
let score = 0;
let highScore = localStorage.getItem("carHighScore") || 0;
let baseSpeed = 5;
let speed = baseSpeed;
let game, spawnInterval;
let gameRunning = false;
let nitroActive = false;
let roadOffset = 0;
let lastTime = 0;

document.getElementById("highScore").innerText = highScore;

const bgMusic = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_6c7b09b5d2.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.3;

function initGame() {
  player = { x: 150, y: 480, width: 50, height: 90 };
  traffic = [];
  score = 0;
  speed = baseSpeed;
  document.getElementById("score").innerText = score;
  document.getElementById("gameOverOverlay").style.display = "none";
  document.getElementById("startOverlay").style.display = "none";
}

document.getElementById("leftBtn").onclick = () => {
  if (gameRunning) player.x = Math.max(20, player.x - 110);
};

document.getElementById("rightBtn").onclick = () => {
  if (gameRunning) player.x = Math.min(canvas.width - player.width - 20, player.x + 110);
};

// Keyboard controls
window.addEventListener("keydown", (e) => {
  if (!gameRunning) return;
  if (e.key === "ArrowLeft" || e.key === "a") {
    player.x = Math.max(20, player.x - 110);
  } else if (e.key === "ArrowRight" || e.key === "d") {
    player.x = Math.min(canvas.width - player.width - 20, player.x + 110);
  } else if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
    nitroActive = true;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
    nitroActive = false;
  }
});

// Touch/Hold for Nitro
const nitroBtn = document.getElementById("nitroBtn");
const activateNitro = (e) => { e.preventDefault(); if(gameRunning) nitroActive = true; };
const deactivateNitro = (e) => { e.preventDefault(); nitroActive = false; };
nitroBtn.addEventListener("mousedown", activateNitro);
nitroBtn.addEventListener("touchstart", activateNitro);
nitroBtn.addEventListener("mouseup", deactivateNitro);
nitroBtn.addEventListener("mouseleave", deactivateNitro);
nitroBtn.addEventListener("touchend", deactivateNitro);

function spawnTraffic() {
  if (!gameRunning) return;
  const lanes = [40, 150, 260];
  traffic.push({
    x: lanes[Math.floor(Math.random() * lanes.length)],
    y: -120,
    width: 60,
    height: 100,
    color: Math.random() > 0.5 ? "#f0f" : "#f30",
    speedDiff: Math.random() * 2 + 1
  });
}

function drawGridRoad(deltaTime) {
  // Deep cyber background
  ctx.fillStyle = "#020208";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentSpeed = nitroActive ? speed * 2 : speed;
  roadOffset += currentSpeed * (deltaTime / 16);
  if (roadOffset > 100) roadOffset -= 100;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
  
  // Vertical lines
  for (let i = 0; i <= canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }

  // Horizontal scrolling lines
  for (let i = 0; i < canvas.height + 100; i += 50) {
    ctx.beginPath();
    let y = i + roadOffset - 100;
    // adding perspective
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Lane dividers (glowy)
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#0ff";
  ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
  ctx.setLineDash([30, 40]);
  ctx.lineDashOffset = -roadOffset;
  ctx.lineWidth = 4;
  
  ctx.beginPath();
  ctx.moveTo(115, 0);
  ctx.lineTo(115, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(235, 0);
  ctx.lineTo(235, canvas.height);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

function drawCyberCar(x, y, w, h, baseColor, isPlayer) {
  ctx.save();
  
  // Neon glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = baseColor;
  
  // Car body
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.roundRect(x, y + 10, w, h - 20, 8);
  ctx.fill();
  
  // Colored rim/border
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight center 
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x + w/4, y + 20, w/2, h - 40);
  ctx.globalAlpha = 1.0;
  
  // Windshield
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.roundRect(x + 5, y + h*.3, w - 10, h*.2, 3);
  ctx.fill();
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Headlights
  if (isPlayer) {
    let hlColor = nitroActive ? "#fff" : "#0ff";
    ctx.fillStyle = hlColor;
    ctx.shadowColor = hlColor;
    ctx.shadowBlur = 20;
    ctx.fillRect(x + 8, y + 5, 8, 8);
    ctx.fillRect(x + w - 16, y + 5, 8, 8);
    
    // Nitro flames
    if (nitroActive) {
      ctx.fillStyle = "#ff0";
      ctx.shadowColor = "#f00";
      ctx.beginPath();
      ctx.moveTo(x + 10, y + h - 5);
      ctx.lineTo(x + w/2, y + h + 20 + Math.random()*25);
      ctx.lineTo(x + w - 10, y + h - 5);
      ctx.fill();
    }
  } else {
    // Enemy tail lights
    ctx.fillStyle = "#f00";
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 15;
    ctx.fillRect(x + 5, y + h - 13, 12, 5);
    ctx.fillRect(x + w - 17, y + h - 13, 12, 5);
  }
  
  ctx.restore();
}

function drawPlayer() {
  let playerColor = nitroActive ? "#ff0" : "#0ff";
  // small wobble effect
  let yOffset = Math.sin(Date.now() / 50) * 2;
  drawCyberCar(player.x, player.y + (nitroActive ? yOffset : 0), player.width, player.height, playerColor, true);
}

function drawTraffic(deltaTime) {
  let currentSpeed = nitroActive ? speed * 2 : speed;
  let moveScale = deltaTime / 16;
  
  traffic.forEach((car, index) => {
    // Traffic moves down relative to road speed, but has its own speed
    let relativeSpeed = (currentSpeed - car.speedDiff) * moveScale;
    car.y += relativeSpeed;
    
    drawCyberCar(car.x, car.y, car.width, car.height, car.color, false);

    if (car.y > canvas.height) {
      traffic.splice(index, 1);
      score++;
      document.getElementById("score").innerText = score;

      if (score % 5 === 0) speed += 0.5;
    }

    // Collision detection (reduced hitbox to make it fair)
    const margin = 8;
    if (
      player.x + margin < car.x + car.width - margin &&
      player.x + player.width - margin > car.x + margin &&
      player.y + margin < car.y + car.height - margin &&
      player.y + player.height - margin > car.y + margin
    ) {
      gameOver();
    }
  });
}

function gameLoop(timestamp) {
  if (!gameRunning) return;
  
  let deltaTime = timestamp - lastTime;
  if(deltaTime > 100) deltaTime = 16;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGridRoad(deltaTime);
  drawTraffic(deltaTime);
  drawPlayer();

  game = requestAnimationFrame(gameLoop);
}

function startGame() {
  initGame();
  gameRunning = true;
  lastTime = performance.now();
  
  bgMusic.play().catch(e => console.log("Audio play blocked until interaction"));
  
  if (game) cancelAnimationFrame(game);
  clearInterval(spawnInterval);
  
  game = requestAnimationFrame(gameLoop);
  spawnInterval = setInterval(spawnTraffic, 1500);
}

function gameOver() {
  gameRunning = false;
  bgMusic.pause();
  cancelAnimationFrame(game);
  clearInterval(spawnInterval);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("carHighScore", highScore);
    document.getElementById("highScore").innerText = highScore;
  }

  document.getElementById("gameOverOverlay").style.display = "flex";
}

// Draw initial screen
drawGridRoad(16);
drawCyberCar(150, 480, 50, 90, "#0ff", true);