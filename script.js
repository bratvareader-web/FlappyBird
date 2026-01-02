// ===== CANVAS SETUP ======
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);

// ===== GAME STATE ======
let frame = 0;
let gameState = "menu"; // menu | playing | over
let currentLevel = 0; // 0 = welcome, -1 = level select
const MAX_LEVELS = 50;
let targetScore = 10;

// ===== SAVE DATA ======
let unlockedLevel = parseInt(localStorage.getItem("unlockedLevel")) || 1;
let coins = parseInt(localStorage.getItem("coins")) || 0;
function saveProgress() {
    localStorage.setItem("unlockedLevel", unlockedLevel);
    localStorage.setItem("coins", coins);
}

// ===== BIRD ======
const bird = {
    x: canvas.width / 4,
    y: canvas.height / 2,
    radius: 18,
    velocity: 0,
    gravity: 0.4,
    lift: -6,
    blinkTimer: 0,
    blinking: false,
    blushRadius: 3,
    blushGrow: true
};

// ===== GAME OBJECTS ======
let pipes = [];
let clouds = [];
let crows = [];
let bullets = [];
let coinsArr = [];
let purplePower = null;
let invincible = false;
let invincibleEnd = 0;
let redPower = null;
let canShoot = false;
let bulletsLeft = 0;
let score = 0;
let speed = 3;

// ===== INPUT ======
function flap() {
  if (gameState === "menu") {
    currentLevel = -1;
    return;
  }
  if (gameState === "playing") {
    bird.velocity = bird.lift;
  }
  if (gameState === "over") {
    gameState = "menu";
    currentLevel = 0;
  }
}

document.addEventListener("keydown", flap);
document.addEventListener("touchstart", flap);
document.addEventListener("mousedown", flap);

// ===== LEVEL SELECT ======
canvas.addEventListener("click", e => {
    if(gameState !== "menu" || currentLevel!==-1) return;
    const mx = e.clientX;
    const my = e.clientY;
    for(let i=1;i<=MAX_LEVELS;i++){
        const x=100 + ((i-1)%10)*130;
        const y=200 + Math.floor((i-1)/10)*100;
        if(mx>x && mx<x+120 && my>y && my<y+60 && i<=unlockedLevel){
            currentLevel = i;
            targetScore = 10*i;
            resetGame();
            gameState = "playing";
        }
    }
});

// ===== RESET GAME ======
function resetGame() {
    bird.y = canvas.height/2;
    bird.velocity = 0;
    pipes = [];
    clouds = [];
    crows = [];
    bullets = [];
    coinsArr = [];
    purplePower = null;
    redPower = null;
    invincible = false;
    canShoot = false;
    bulletsLeft = 0;
    score = 0;
    speed = 3 + currentLevel -1;
    frame = 0;
}

// ===== CLOUDS ======
function spawnCloud() {
    clouds.push({x: canvas.width, y: Math.random()*canvas.height/2, size: 60+Math.random()*40, baseY: Math.random()*canvas.height/2});
}
function drawCloud(c){
    const bob = Math.sin(frame/60)*10;
    ctx.fillStyle="#fff";
    ctx.beginPath();
    ctx.arc(c.x,c.baseY+bob,c.size/2,0,Math.PI*2);
    ctx.arc(c.x+30,c.baseY+10+bob,c.size/2.5,0,Math.PI*2);
    ctx.arc(c.x-30,c.baseY+10+bob,c.size/2.5,0,Math.PI*2);
    ctx.fill();
}

// ===== PIPES ======
function spawnPipe(){
    const gap = 170;
    const top = Math.random()*(canvas.height-gap-200)+50;
    pipes.push({x:canvas.width, top, gap, passed:false, baseTop:top});
}

// ===== CROWS ======
function spawnCrow(){
    crows.push({x:canvas.width, y:Math.random()*(canvas.height-200)+100, radius:16});
}
function drawCrow(c){
    ctx.fillStyle="#111";
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.radius,0,Math.PI*2);
    ctx.fill();
    // wings
    ctx.strokeStyle="#000";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(c.x+c.radius,c.y);
    ctx.lineTo(c.x+c.radius+10, c.y+Math.sin(frame/5)*8);
    ctx.stroke();
    // eyes left facing
    ctx.fillStyle="white";
    ctx.beginPath();
    ctx.arc(c.x-5,c.y-4,4,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="red";
    ctx.beginPath();
    ctx.arc(c.x-6,c.y-4,2,0,Math.PI*2);
    ctx.fill();
    // beak left
    ctx.fillStyle="#444";
    ctx.beginPath();
    ctx.moveTo(c.x-c.radius,c.y);
    ctx.lineTo(c.x-c.radius-8,c.y-3);
    ctx.lineTo(c.x-c.radius-8,c.y+3);
    ctx.fill();
}

// ===== POWERUPS ======
function spawnPurple(){purplePower={x:canvas.width,y:Math.random()*canvas.height,r:14};}
function spawnRed(){redPower={x:canvas.width,y:Math.random()*canvas.height,r:14};}

// ===== COINS ======
function spawnCoin(){
    coinsArr.push({
        x: canvas.width,
        y: 50 + Math.random()*(canvas.height-100),
        r: 8
    });
}
function drawCoin(c){
    ctx.fillStyle = "gold";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle="yellow";
    ctx.beginPath();
    ctx.arc(c.x-2, c.y-2, 3,0,Math.PI*2);
    ctx.fill();
}

// ===== DRAW BIRD ======
function drawBird(){
    const tilt = Math.min(Math.max(bird.velocity*3,-25),25);
    ctx.save();
    ctx.translate(bird.x,bird.y);
    ctx.rotate((tilt*Math.PI)/180);

    if(invincible){ctx.shadowBlur=20; ctx.shadowColor="#c77dff"; ctx.fillStyle="#c77dff";}
    else if(canShoot){ctx.shadowBlur=20; ctx.shadowColor="red"; ctx.fillStyle="yellow";}
    else {ctx.shadowBlur=0; ctx.fillStyle="yellow";}

    ctx.beginPath();
    ctx.arc(0,0,bird.radius,0,Math.PI*2);
    ctx.fill();
    ctx.shadowBlur=0;

    // wings flap
    ctx.fillStyle="#fcd34d";
    ctx.beginPath();
    const flapSpeed = bird.velocity<0?frame/2:frame/5;
    const wingOffset = Math.sin(flapSpeed)*6;
    ctx.ellipse(-8,wingOffset,6,12,0,0,Math.PI*2);
    ctx.fill();

    // blinking eye
    bird.blinkTimer++;
    if(bird.blinkTimer%150===0) bird.blinking = true;
    if(bird.blinking && bird.blinkTimer%155===0) bird.blinking = false;
    ctx.fillStyle="#000";
    ctx.beginPath();
    if(!bird.blinking) ctx.arc(5,-4,3,0,Math.PI*2);
    else ctx.fillRect(2,-6,6,3); // closed eye line
    ctx.fill();

    // cheeks pulsing
    if(bird.blushGrow){bird.blushRadius+=0.05; if(bird.blushRadius>=5) bird.blushGrow=false;}
    else {bird.blushRadius-=0.05; if(bird.blushRadius<=3) bird.blushGrow=true;}
    ctx.fillStyle="pink";
    ctx.beginPath();
    ctx.arc(-3,5,bird.blushRadius,0,Math.PI*2);
    ctx.fill();

    // beak
    ctx.fillStyle="orange";
    ctx.beginPath();
    ctx.moveTo(bird.radius,0);
    ctx.lineTo(bird.radius+10,-4);
    ctx.lineTo(bird.radius+10,4);
    ctx.fill();

    ctx.restore();
}

// ===== MAIN LOOP ======
function update(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    frame++;

    // ===== MENU =====
    if(gameState==="menu"){
        ctx.fillStyle="#000";
        ctx.font="42px Arial";
        ctx.textAlign="center";
        if(currentLevel===0){
            ctx.fillText("Press any key to Start", canvas.width/2, canvas.height/2);
        }
        else if(currentLevel===-1){ 
            ctx.fillText("Select Level", canvas.width/2,100);
            for(let i=1;i<=MAX_LEVELS;i++){
                const x=100 + ((i-1)%10)*130;
                const y=200 + Math.floor((i-1)/10)*100;
                ctx.fillStyle=i<=unlockedLevel?"hsl("+i*30+",80%,60%)":"#aaa";
                ctx.fillRect(x,y,120,60);
                ctx.fillStyle="#000";
                ctx.font="28px Arial";
                ctx.fillText(i,x+60,y+35);
                ctx.font="16px Arial";
                if(i<=unlockedLevel) ctx.fillText("Target:"+i*10,x+60,y+55);
            }
        }
        ctx.fillStyle="#000";
        ctx.font="24px Arial";
        ctx.fillText("Coins: "+coins,100,70);
        requestAnimationFrame(update);
        return;
    }

    // ===== GAME OVER =====
    if(gameState==="over"){
        ctx.fillStyle="#000";
        ctx.font="42px Arial";
        ctx.textAlign="center";
        ctx.fillText("Game Over",canvas.width/2,canvas.height/2);
        ctx.font="24px Arial";
        ctx.fillText("Press any key",canvas.width/2,canvas.height/2+50);
        requestAnimationFrame(update);
        return;
    }

    // ===== BIRD PHYSICS =====
    bird.velocity+=bird.gravity;
    bird.y+=bird.velocity;
    if(bird.y<0||bird.y>canvas.height) gameState="over";

    // ===== CLOUDS =====
    if(frame%200===0) spawnCloud();
    clouds.forEach((c,i)=>{
        c.x-=speed/2;
        drawCloud(c);
        if(c.x<-100) clouds.splice(i,1);
    });

    // ===== PIPES =====
    if(frame%120===0) spawnPipe();
    pipes.forEach((p,i)=>{
        p.x-=speed;
        const wobble = Math.sin(frame/60)*5;
        ctx.fillStyle="green";
        ctx.fillRect(p.x,0,60,p.top+wobble);
        ctx.fillRect(p.x,p.top+p.gap+wobble,60,canvas.height);
        if(!invincible && bird.x+bird.radius>p.x && bird.x-bird.radius<p.x+60 && (bird.y<p.top||bird.y>p.top+p.gap))
            gameState="over";
        if(p.x+60<bird.x && !p.passed){score++; p.passed=true;}
    });

    // ===== SPEED INCREASE =====
    if(frame%1200===0) speed+=0.5;

    // ===== CROWS =====
    if(score>=20 && frame%180===0) spawnCrow();
    crows.forEach((c,i)=>{
        c.x-=speed+1;
        drawCrow(c);
        if(!invincible && Math.hypot(bird.x-c.x,bird.y-c.y)<bird.radius+c.radius)
            gameState="over";
    });

    // ===== PURPLE POWER =====
    if(score===10 && !purplePower) spawnPurple();
    if(purplePower){
        purplePower.x-=speed;
        ctx.fillStyle="purple";
        ctx.beginPath();
        ctx.arc(purplePower.x,purplePower.y,purplePower.r,0,Math.PI*2);
        ctx.fill();
        if(Math.hypot(bird.x-purplePower.x,bird.y-purplePower.y)<bird.radius+purplePower.r){
            invincible=true;
            invincibleEnd=frame+480;
            purplePower=null;
        }
    }
    if(invincible && frame>invincibleEnd) invincible=false;

    // ===== RED POWER =====
    if(score===25 && !redPower) spawnRed();
    if(redPower){
        redPower.x-=speed;
        ctx.fillStyle="red";
        ctx.beginPath();
        ctx.arc(redPower.x,redPower.y,redPower.r,0,Math.PI*2);
        ctx.fill();
        if(Math.hypot(bird.x-redPower.x,bird.y-redPower.y)<bird.radius+redPower.r){
            canShoot=true;
            bulletsLeft=7;
            redPower=null;
        }
    }

    // ===== BULLETS =====
    if(canShoot && frame%15===0 && bulletsLeft>0){
        bullets.push({x:bird.x,y:bird.y});
        bulletsLeft--;
        if(bulletsLeft===0) canShoot=false;
    }
    bullets.forEach((b,bi)=>{
        b.x+=8;
        ctx.fillStyle="gold";
        ctx.beginPath();
        ctx.arc(b.x,b.y,4,0,Math.PI*2);
        ctx.fill();
        crows.forEach((c,ci)=>{
            if(Math.hypot(b.x-c.x,b.y-c.y)<20){crows.splice(ci,1); bullets.splice(bi,1);}
        });
    });

    // ===== COINS =====
    if(frame % 250 === 0) spawnCoin();
    coinsArr.forEach((c,i)=>{
        c.x -= speed;
        drawCoin(c);
        if(Math.hypot(bird.x - c.x, bird.y - c.y) < bird.radius + c.r){
            coins++;
            coinsArr.splice(i,1);
        }
        if(c.x < -20) coinsArr.splice(i,1);
    });

    // ===== SCORE + COINS =====
    ctx.fillStyle="#000";
    ctx.font="24px Arial";
    ctx.fillText("Score: "+score+" / "+targetScore,100,40);
    ctx.fillText("Coins: "+coins,100,70);

    // ===== LEVEL UP =====
    if(score>=targetScore && currentLevel===unlockedLevel){
        unlockedLevel++;
        saveProgress();
    }

    drawBird();
    requestAnimationFrame(update);
}

update();
