(function(){
    "use strict";

    let actx;

    function ensureAudio(){
        if(!actx){
            actx = new (window.AudioContext || window.webkitAudioContext)();
            startAmbience();
        }
    }

    function tone(freq,dur,type,vol,delay){
        if(!actx) return;

        const t0 = actx.currentTime + (delay||0);

        const osc = actx.createOscillator();
        const gain = actx.createGain();

        osc.type = type||'sine';

        osc.frequency.setValueAtTime(
           freq,
           t0
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            t0+dur
        );

        osc.connect(gain).connect(actx.destination);

        osc.start(t0);
        osc.stop(t0+dur+0.05);
    }

    function startAmbience(){
        if(!actx) return;

        const osc = actx.createOscillator();
        const gain = actx.createGain();

        osc.type = "sine";
        osc.frequency.value = 42;

        gain.gain.value = 0.025;

        osc.connect(gain).connect(actx.destination);
        osc.start();

        window._ambOsc = osc;
        window._ambGain = gain;
    }

    function noiseBurst(duration=0.2,volume=0.12){
        if(!actx) return;

        const buffer =
        actx.createBuffer(
            1,
            actx.sampleRate*duration,
            actx.sampleRate
        );

        const data = buffer.getChannelData(0);

        for(let i=0; i<data.length;i++){
            data[i] = 
                (Math.random()*2-1) *
                Math.pow(1-i/data.length,1.8);
        }

        const src = actx.createBufferSource();
        const gain = actx.createGain();

        src.buffer = buffer;

        gain.gain.setValueAtTime(
            volume,
            actx.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            actx.currentTime+duration
        );

        src.connect(gain).connect(actx.destination);

        src.start();
    }

    function scareSound(){
        tone(95,.35,'sawtooth',.12);
        tone(55,.5,'sine',.1,.05);
        noiseBurst(.25,.09);
    }

    function eatGhostSound(){
        tone(420,.08,'square',.08);
        tone(620,.12,'square',.06,.08);
    }

    function collectSound(){
        tone(680,.08,'sine',.07);
        tone(920,.1,'sine',.05,.06);
    }

    function hurtSound(){
        tone(90,.025,'sawtooth',.15);
        tone(48,.35,'sine',.1,.12);
    }

    function levelSound(){
        tone(180,.15,'triangle',.08);
        tone(270,.15,'triangle',.07,.14);
        tone(420,.25,'triangle',.06,.28);
    }


    const THEMES = {

        blood:{
            label:"Bloodveil",

            blood:"#7a0a0a",
            bright:"#c81414",
            wall:"#2b0d10",
            rot:"#3a2a1a",

            ghosts:[
                "#d41414",
                "#ff5252",
                "#8b0000",
                "#ff1717"
            ],

            floor:"#080303",
            pellet:"#e7d9bd",
            weakness:"#ffb000"
        },
    
        toxic:{
            label:"Wastefall",

            blood:"#285900",
            bright:"#8cff00",
            wall:"#10230b",
            rot:"#304c18",

            ghosts:[
                "#39ff14",
                "#a8ff4a",
                "#65ffb3",
                "#d6ff00"
            ],

            floor:"#020800",
            pellet:"#d8ff9a",
            weakness:"#00ffff"
        },

        abyss:{
            label:"The void",

            blood:"#071f5c",
            bright:"#287cff",
            wall:"#071226",
            rot:"#132c58",

            ghosts:[
                "#246bff",
                "#62a8ff",
                "#0b3d91",
                "#9bc7ff"
            ],

            floor:"#02040a",
            pellet:"#c8ddff",
            weakness:"#8a5cff"
        },

        frost:{
            label:"Frozen Wraiths",

            blood:"#174b5a",
            bright:"#7eeaff",
            wall:"#0c242c",
            rot:"#28515c",

            ghosts:[
                "#6ee7ff",
                "#b8f5ff",
                "#279fc4",
                "#e5fcff"
            ],

            floor:"#02080b",
            pellet:"#dffcff",
            weakness:"#ffffff"
        }
    };




    const DIFFICULTIES = {

        easy:{
            label:"Easy",
            playerStep:[0.1],
            ghostSpeeds:[0.42,0.45,0.44],
            weaknessPoints:8,
            scaredTime:11000,
            lives:4,
            cherryMin:10000,
            cherryMax:15000,
            cherryLife:10000,
            loopChance:0.32
        },

        medium:{
            label:"Medium",
            playerstep:[0.1],
            ghostSpeeds:[0.31,0.33,0.32],
            weaknessPoints:5,
            scaredTime:8000,
            lives:3,
            cherryMin:14000,
            cherryMax:20000,
            cherryLife:8000,
            loopChance:0.22
        },

        hard:{
            label:"Hard",
            playerstep:[0.1],
            ghostSpeeds:[0.23,0.245,0.22,0.235],
            weaknessPoints:4,
            scaredTime:6000,
            lives:3,
            cherryMin:18000,
            cherryMax:24000,
            cherryLife:6000,
            loopChance:0.15
        },

        extreme:{
            label:"Extreme",
            playerstep:[0.1],
            ghostSpeeds:[0.16,0.17,0.15,0.165],
            weaknessPoints:3,
            scaredTime:4000,
            lives:2,
            cherryMin:22000,
            cherryMax:30000,
            cherryLife:5000,
            loopChance:0.08
        }
    };

    let currentTheme = THEMES.blood;

    let currentDifficulty = DIFFICULTIES.medium;

    let themeKey = "blood";
    
    let difficultyKey = "medium";

    let canvas = document.getElementById("game");

    let ctx = canvas.getContext("2d");

    const TILE = 32;

    const COLS = 19;
    const ROWS = 21;

    let maze = [];

    let player = {
        r:1,
        c:1,
        x:1,
        y:1,
        dir:{x:0,y:0},
        nextDir:{x:0,y:0}
    };

    let ghosts = [];

    let ghostStarts = [
        {r:9,c:9},
        {r:9,c:10},
        {r:10,c:9},
        {r:10,c:9}
    ];

    let moveTimers = {
        player: 0
    };

    let moveTimersGhosts = [];

    let running = false;
    let paused = false;
    let gameOver = false;
    
    let score = 0;
    let level = 1;
    

    let lives = 3;
    let maxLives = 3;

    let pelletsLeft = 0;
    let totalPellets = 0;

    let weaknessPoints = [];

    let scaredTimer = 0;

    let lastTime = 0;

    let cherry = null;

    let cherryTimer = 0;

    let keys = {};

    let audioStarted = false;

    
    const scoreE1 = document.getElementById("score");

    const levelE1 = document.getElementById("level");

    const livesE1 = document.getElementById("lives");

    const lifeCountE1 = document.getElementById("lifeCount");

    const weaknessCountE1 = document.getElementById("weaknessCount");

    const progressBar = document.getElementById("progressBar");

    const msgOverlay = document.getElementById("msgOverlay");

    const msgTitle = document.getElementById("msgTitle");

    const msgBody = document.getElementById("msgBody");

    const startBtn = document.getElementById("startBtn");

    const pauseBtn = document.getElementById("pauseBtn");

    const pauseOverlay = document.getElementById("pauseOverlay");

    const resumeBtn = document.getElementById("resumeBtn");

    const levelBanner = document.getElementById("levelBanner");
    
    const themeButtons = document.getElementById("themeButtons");

    const diffButtons = document.getElementById("diffButtons");

    const jumpscare = document.getElementById("jumpscare");

    const caughtVideo = document.getElementById("caughtVideo");

    const gameOverVideo = document.getElementById("gameOverVideo");

    const jumpscareFallback = document.getElementById("jumpscareFallback");


    function applyTheme(key){
        if(!THEMES[key]) return;

        themeKey = key;
        
        currentTheme = THEMES[key];

        document.documentElement.style.setProperty("--blood",currentTheme.blood);

        document.documentElement.style.setProperty("--bloodbright",currentTheme.bright);

        document.documentElement.style.setProperty("--wall",currentTheme.wall);

        document.documentElement.style.setProperty("--rot",currentTheme.rot);
    


        if(ghosts && ghosts.length){

            ghosts.forEach((ghost,i)=>{
                ghost.color = currentTheme.ghosts[i % currentTheme.ghosts.length];
            });
        }
        updateThemeButtons();
    }

    function updateThemeButtons(){

    if(!themeButtons) return;

    [...themeButtons.children]

    .forEach(btn=>{
        btn.classList.toggle("selected",btn.dataset.theme === themeKey);
    });
}

    function buildThemeButtons(){
        if(!themeButtons) return;

        themeButtons.innerHTML = "";

        Object.entries(THEMES).forEach(([key,theme])=>{

            const btn = document.createElement("button");

            btn.type = "button";
             
            btn.className = "pill";

            btn.dataset.theme = key;

            btn.textContent = theme.label;

            btn.addEventListener(
                "click",()=>{
                    applyTheme(key);
                }
            );
            themeButtons.appendChild(btn);
        });

        updateThemeButtons();
    }

    function applyDifficulty(key){
        difficultyKey = key;

        currentDifficulty = DIFFICULTIES[key];

        maxLives = currentDifficulty.lives;

        lives = Math.min(lives,maxLives);

        updateHUD();

        updateDifficultyButtons();

        if(ghosts && ghosts.length){

            const base = currentDifficulty.ghostSpeeds;

            const scale = Math.max(0.72,1 - (level-1)*0.045);

            ghosts.forEach((ghost,i)=>{
                ghost.speed=(base[Math.min(i,base.length-1)] || 0.20) * scale;
            });
        }
    }

    function updateDifficultyButtons(){
        if(!diffButtons) return;

        [...diffButtons.children].forEach(btn=>{
            btn.classList.toggle("selected",btn.dataset.diff === difficultyKey);
        });
    }

    function buildDifficultyButtons(){
        if(!diffButtons) return;

        diffButtons.innerHTML = "";

        Object.entries(DIFFICULTIES).forEach(([key,diff])=>{

            const btn = document.createElement("button");

            btn.type = "button";

            btn.className = "pill";

            btn.dataset.diff = key;

            btn.textContent = diff.label;

            btn.addEventListener("click",()=>{
                applyDifficulty(key);
            });
        diffButtons.appendChild(btn);
        });

        updateDifficultyButtons();
    }

    function makeMaze(){

        const grid = Array.from(
            {length:ROWS},
            ()=>Array(COLS).fill(0)
        );

        function carve(r,c){

            grid[r][c] = 1;

            const dirs = [
                [0,2],
                [2,0],
                [0,-2],
                [-2,0]
            ];

            for(let i = dirs.length -1;i>0;i--){
                const j = Math.floor(Math.random()*(i+1));
                [dirs[i],dirs[j]] = [dirs[j],dirs[i]];
            }

            for(const [dr,dc] of dirs){
                const nr = r+dr;
                const nc = c+dc;

                if(nr>0 && nr< ROWS-1 && nc>0 && nc<COLS-1 && grid[nr][nc]===0){

                
                    grid[r+dr/2][c+dc/2] = 1;

                    carve(nr,nc);
                }
            }
        }
    

    carve(1,1);

    for(let i=0;i<18;i++){

        const r = 1 + Math.floor(Math.random()*(ROWS-2));

        const c = 1 + Math.floor(Math.random()*(COLS-2));

        if(grid[r][c] === 0 && (
            grid[r-1]?.[c]===1 ||
            grid[r+1]?.[c]===1 ||
            grid[r]?.[c-1]===1 ||
            grid[r]?.[c+1]===1    
        )
    ){
        grid[r][c] = 1;
     }
    }
    return grid;
    }


  function isWeaknessPoint(r,c){
    return weaknessPoints.some(
        p => p.r === r && p.c === c
    );
}

function generateWeaknessPoints(){
    weaknessPoints = [];

    const candidates = [];

    for(
        let r = 1;
        r < ROWS - 1;
        r++
    ){
        for(
            let c = 1;
            c < COLS - 1;
            c++
        ){
            if(maze[r][c] !== 1){
                continue;
            }

            if(
                Math.abs(r - 1) +
                Math.abs(c - 1) < 5
            ){
                continue;
            }

            if(
                Math.abs(r - 9) +
                Math.abs(c - 9) < 3
            ){
                continue;
            }

            candidates.push({
                r:r,
                c:c
            });
        }
    }

    for(
        let i = candidates.length - 1;
        i > 0;
        i--
    ){
        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            candidates[i],
            candidates[j]
        ] = [
            candidates[j],
            candidates[i]
        ];
    }

    weaknessPoints =
        candidates.slice(
            0,
            Math.min(
                currentDifficulty.weaknessPoints,
                candidates.length
            )
        );

    updateHUD();
}

function consumeWeaknessPoint(r,c){
    const index =
        weaknessPoints.findIndex(
            p =>
                p.r === r &&
                p.c === c
        );

    if(index === -1){
        return false;
    }

    weaknessPoints.splice(
        index,
        1
    );

    score += 75;

    const until =
        performance.now() +
        currentDifficulty.scaredTime;

    scaredTimer =
        currentDifficulty.scaredTime;

    ghosts.forEach(g=>{
        if(!g.dead){
            g.scared = true;
            g.scaredUntil = until;
        }
    });

    collectSound();

    updateHUD();

    return true;
}
   function resetGhosts(){

    const s = ghostStarts;
    const base = currentDifficulty.ghostSpeeds;

    const scale =
        Math.max(
            0.72,
            1 - (level - 1) * 0.045
        );

    const count =
        Math.min(
            4,
            Math.max(
                3,
                level >= 3 ? 4 : 3
            )
        );

    const names = [
        "stalker",
        "crawler",
        "wraith",
        "reaper"
    ];

    ghosts = Array.from(
        {length:count},
        (_,i)=>({

            r:s[i % s.length].r,
            c:s[i % s.length].c,

            homeR:s[i % s.length].r,
            homeC:s[i % s.length].c,

            color:
                currentTheme.ghosts[
                    i % currentTheme.ghosts.length
                ],

            dir:
                i % 2
                    ? {x:-1,y:0}
                    : {x:1,y:0},

            scared:false,
            scaredUntil:0,
            dead:false,

            speed:
                (
                    base[
                        Math.min(
                            i,
                            base.length - 1
                        )
                    ] || 0.20
                ) * scale,

            moveTimer:0,

            name:names[i]
        })
    );

    moveTimersGhosts =
        Array(count).fill(0);
}



        function isWall(r,c){

            if(r<0 || c<0 || r>= ROWS || c>= COLS){
                return true;
            }
            return maze[r][c]===0;
        }

        function canMove(r,c){

            return !isWall(r,c);
        }
        function distance(a,b){

            return Math.hypot(a.r-b.r,a.c-b.c);
        }

        function firstStepToward(fromR,fromC,toR,toC){
    if(
        fromR === toR &&
        fromC === toC
    ){
        return null;
    }

    const key =
        (r,c) => r * COLS + c;

    const visited =
        Array.from(
            {length:ROWS},
            () => Array(COLS).fill(false)
        );

    const cameFrom = new Map();

    const queue = [
        [fromR,fromC]
    ];

    let head = 0;

    visited[fromR][fromC] = true;

    while(head < queue.length){
        const [r,c] = queue[head++];

        if(
            r === toR &&
            c === toC
        ){
            break;
        }

        const steps = [
            [r-1,c],
            [r+1,c],
            [r,c-1],
            [r,c+1]
        ];

        for(const [nr,nc] of steps){
            if(
                nr < 0 ||
                nc < 0 ||
                nr >= ROWS ||
                nc >= COLS
            ){
                continue;
            }

            if(
                visited[nr][nc] ||
                isWall(nr,nc)
            ){
                continue;
            }

            visited[nr][nc] = true;

            cameFrom.set(
                key(nr,nc),
                key(r,c)
            );

            queue.push([
                nr,nc
            ]);
        }
    }

    const start =
        key(fromR,fromC);

    let cursor =
        key(toR,toC);

    if(!visited[toR]?.[toC]){
        return null;
    }

    while(
        cameFrom.get(cursor) !== start
    ){
        const parent =
            cameFrom.get(cursor);

        if(parent === undefined){
            return null;
        }

        cursor = parent;
    }

    return {
        r:Math.floor(cursor / COLS),
        c:cursor % COLS
    };
}

        function updateHUD(){
            if(scoreE1)
                scoreE1.textContent = score;

            if(levelE1)
                levelE1.textContent = level;

            if(livesE1){

                livesE1.textContent = "●".repeat(Math.max(0,lives));

            }

            if(lifeCountE1){
                lifeCountE1.textContent = `${lives} / ${maxLives}`;
            }

            if(weaknessCountE1){

                weaknessCountE1.textContent = weaknessPoints.length;
            }

            if(progressBar){

                const collected = totalPellets - pelletsLeft;

                const pct = totalPellets>0 ? (collected/totalPellets)*100 : 0;

                progressBar.style.width = `${pct}%`;
            }
        }


    function applyGeneratedMaze(){

    maze = makeMaze();

    player.r = 1;
    player.c = 1;

    player.prevR = 1;
    player.prevC = 1;

    player.x = 1;
    player.y = 1;

    player.dir = {
        x:0,
        y:0
    };

    player.nextDir = {
        x:0,
        y:0
    };

    moveTimers.player = 0;

    totalPellets = 0;
    pelletsLeft = 0;

    for(
        let r = 1;
        r < ROWS - 1;
        r++
    ){

        for(
            let c = 1;
            c < COLS - 1;
            c++
        ){

            if(maze[r][c] !== 1){
                continue;
            }

            if(
                r === 1 &&
                c === 1
            ){
                continue;
            }

            if(
                (r === 9 && c === 9) ||
                (r === 9 && c === 10) ||
                (r === 10 && c === 9) ||
                (r === 10 && c === 10)
            ){
                continue;
            }

            if(
                r === ROWS - 2 &&
                c === COLS - 2
            ){
                continue;
            }

            maze[r][c] = 2;

            totalPellets++;
            pelletsLeft++;
        }
    }

    maze[1][1] = 1;

    ghostStarts = [
        {r:9,c:9},
        {r:9,c:10},
        {r:10,c:9}
    ];

    maze[9][9] = 1;
    maze[9][10] = 1;
    maze[10][9] = 1;
    maze[10][10] = 1;

    maze[ROWS - 2][COLS - 2] = 1;

    generateWeaknessPoints();

    resetGhosts();

    cherry = null;

    cherryTimer =
        randomCherryTime();

    scaredTimer = 0;

    updateHUD();
}

            function randomCherryTime(){
                const min = currentDifficulty.cherryMin;

                const max = currentDifficulty.cherryMax;

                return min + Math.random()*(max-min);
            }


            function tryPlayerDirection(){
                const nx = player.c + player.nextDir.x;

                const ny = player.r + player.nextDir.y;

                if(player.nextDir.x!==0 || player.nextDir.y!==0){
                    if(canMove(ny,nx)){
                        player.dir = {...player.nextDir};
                    }
                }
            }

           function updatePlayer(dt){
    moveTimers.player += dt;

    const stepTime =
        currentDifficulty.playerStep * 1000;

    if(moveTimers.player < stepTime)
        return;

    moveTimers.player = 0;

    tryPlayerDirection();

    player.prevR = player.r;
    player.prevC = player.c;

    const nc =
        player.c + player.dir.x;

    const nr =
        player.r + player.dir.y;

    if(canMove(nr,nc)){
        player.r = nr;
        player.c = nc;
    }
}

        function collectCurrentCell(){
    const r = player.r;
    const c = player.c;

    if(maze[r][c] === 2){
        maze[r][c] = 1;

        pelletsLeft--;

        score += 10;

        collectSound();
    }

    if(isWeaknessPoint(r,c)){
        consumeWeaknessPoint(r,c);
    }

    updateHUD();

    if(
        pelletsLeft <= 0 &&
        weaknessPoints.length <= 0
    ){
        nextLevel();
    }
}
            function chooseGhostDirection(g){

    const options = [
        {x:1,y:0},
        {x:-1,y:0},
        {x:0,y:1},
        {x:0,y:-1}
    ];

    const valid = options.filter(d=>{
        const nr = g.r + d.y;
        const nc = g.c + d.x;

        return canMove(nr,nc);
    });

    if(!valid.length){
        return;
    }

    let filtered = valid.filter(d=>{
        return !(
            d.x === -g.dir.x &&
            d.y === -g.dir.y
        );
    });

    if(!filtered.length){
        filtered = valid;
    }

    filtered.sort((a,b)=>{

        const da = distance(
            {
                r:g.r + a.y,
                c:g.c + a.x
            },
            player
        );

        const db = distance(
            {
                r:g.r + b.y,
                c:g.c + b.x
            },
            player
        );

        return g.scared
            ? db - da
            : da - db;
    });

    if(
        Math.random() <
        currentDifficulty.loopChance
    ){

        g.dir =
            filtered[
                Math.floor(
                    Math.random() *
                    filtered.length
                )
            ];

    }else{

        g.dir = filtered[0];
    }
}

            function updateGhost(g,index,dt){
    const now = performance.now();

    if(g.scared && now >= g.scaredUntil){
        g.scared = false;
        g.scaredUntil = 0;
    }

    g.prevR = g.r;
    g.prevC = g.c;

    if(g.dead){

        g.moveTimer += dt;

        const returnTime =
            g.speed * 1000 * 0.5;

        if(g.moveTimer < returnTime){
            return;
        }

        g.moveTimer = 0;

        if(
            g.r === g.homeR &&
            g.c === g.homeC
        ){
            g.dead = false;
            g.scared = false;
            g.scaredUntil = 0;
            return;
        }

        const step =
            firstStepToward(
                g.r,
                g.c,
                g.homeR,
                g.homeC
            );

        if(step){
            g.dir = {
                x:step.c - g.c,
                y:step.r - g.r
            };

            g.r = step.r;
            g.c = step.c;
        }

        return;
    }

    g.moveTimer += dt;

    const stepTime =
        g.speed * 1000;

    if(g.moveTimer < stepTime){
        return;
    }

    g.moveTimer = 0;

    chooseGhostDirection(g);

    const nr =
        g.r + g.dir.y;

    const nc =
        g.c + g.dir.x;

    if(canMove(nr,nc)){
        g.r = nr;
        g.c = nc;
    }
}

function handleGhostCollision(g){
    if(g.dead){
        return;
    }

    const sameCell =
        g.r === player.r &&
        g.c === player.c;

    const swapped =
        g.r === player.prevR &&
        g.c === player.prevC &&
        g.prevR === player.r &&
        g.prevC === player.c;

    if(!sameCell && !swapped){
        return;
    }

    if(g.scared){
        g.dead = true;

        g.scared = false;

        g.scaredUntil = 0;

        g.moveTimer = 0;

        score += 250;

        eatGhostSound();

        updateHUD();

        return;
    }

    playerHit();
}
            function playerHit(){

                if(!running || gameOver)
                    return;

                lives--;

                hurtSound();

                scareSound();

                updateHUD();

                if(lives<=0){

                    endGame();

                    return;
                }

                player.r = 1;
                player.c = 1;

                player.x = 1;
                player.y = 1;

                player.dir = {
                    x:0,y:0
                };

                player.nextDir = {
                    x:0,y:0
                };

                resetGhosts();

           triggerJumpscare("caught");



  function nextLevel(){

    running = false;

    level++;

    levelEl.textContent = level;

    if(levelBanner){
        levelBanner.classList.add("show");

        setTimeout(()=>{
            levelBanner.classList.remove("show");
        },1400);
    }

    applyGeneratedMaze();

    player.r = 1;
    player.c = 1;

    player.prevR = 1;
    player.prevC = 1;

    player.x = 1;
    player.y = 1;

    player.dir = {
        x:0,
        y:0
    };

    player.nextDir = {
        x:0,
        y:0
    };

    moveTimers.player = 0;

    scaredTimer = 0;

    updateHUD();

    setTimeout(()=>{
        if(!gameOver){
            running = true;
            lastTime = performance.now();
        }
    },900);
}

          function drawMaze(){
                if(!maze.length){
                    ctx.fillStyle = currentTheme.floor;
                    ctx.fillRect(0,0,canvas.width,canvas.height);
                    return; 
                }
    ctx.fillStyle = currentTheme.floor;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    for(let r=0; r<ROWS; r++){

        for(let c=0; c<COLS; c++){

            const cell = maze[r][c];

            const x = c*TILE;
            const y = r*TILE;

            if(cell===0){

                ctx.fillStyle =
                    currentTheme.wall;

                ctx.fillRect(
                    x,
                    y,
                    TILE,
                    TILE
                );

                ctx.strokeStyle =
                    currentTheme.rot;

                ctx.lineWidth = 1;

                ctx.strokeRect(
                    x+.5,
                    y+.5,
                    TILE-1,
                    TILE-1
                );

            }
            else if(cell===2){

                ctx.fillStyle =
                    currentTheme.pellet;

                ctx.beginPath();

                ctx.arc(
                    x+TILE/2,
                    y+TILE/2,
                    2.2,
                    0,
                    Math.PI*2
                );

                ctx.fill();
            }
        }
    }
}

      function drawWeaknesspoints(){

        const now = performance.now();

        for(const p of weaknessPoints){
            const x = p.c*TILE+TILE/2;

            const y = p.r*TILE+TILE/2;

            const pulse = 1 + Math.sin(now*.006+p.r+p.c)*.18;

            ctx.save();

            ctx.translate(x,y);

            ctx.rotate(now*.001);

            ctx.scale(pulse,pulse);

            ctx.shadowBlur = 18;

            ctx.shadowColor = currentTheme.weakness;

            ctx.fillStyle = currentTheme.weakness;

            ctx.beginPath();

            ctx.moveTo(0,-9);

            ctx.lineTo(7,0);

            ctx.lineTo(0,9);

            ctx.lineTo(-7,0);

            ctx.closePath();

            ctx.fill();

            ctx.restore();
        }
      }  

      function drawPlayer(){

        const x = player.c*TILE+TILE/2;

        const y = player.r*TILE+TILE/2;

        ctx.save();

        ctx.translate(x,y);

        const radius = TILE*.36;

        ctx.fillStyle = "#ffd83d";

        ctx.shadowBlur = 14;

        ctx.shadowColor = "#ffd83d";
        ctx.beginPath();

        let angle = Math.atan2(player.dir.y,player.dir.x);

        if(player.dir.x===0 && player.dir.y===0){
            angle = 0;
        }

        const mouth = .28 + Math.sin(performance.now()*.012)*.08;

        ctx.moveTo(0,0);

        ctx.arc(0,0,radius,angle+mouth,angle-Math.PI*2-mouth,false);

        ctx.closePath();

        ctx.fill();
        ctx.restore();
      }


      function drawGhost(g){
        const x = g.c*TILE+TILE/2;

        const y = g.r*TILE+TILE/2;

        let color = g.color;


        if(g.scared){
            const scaredColors = {

                blood:"#ffb6b6",

                toxic:"#c7ff7a",

                abyss:"#a9c7ff",

                frost:"#eaffff"
            };

            color = scaredColors[themeKey] || "#8fb8ff";
        }

        if(g.dead){
            color = "rgba(255,255,255,.28)";
        }

        ctx.save();

        ctx.translate(x,y);

        ctx.fillStyle = color;

        ctx.shadowBlur = g.scared ? 16 : 12;

        const w = TILE*.68;

        const h = TILE*.7;

        ctx.beginPath();

        ctx.arc(
            0,-2,w/2,Math.PI,0
        );

        ctx.lineTo(w/2,h/2);

        const waves = 4;

        for(let i=waves;i>=0;i--){
            const xx = -w/2+i*(w/waves);

            const yy = h/2 + (i%2===0 ? 4:0);

            ctx.lineTo(xx,yy);
        }

        ctx.lineTo(-w/2,-2);

        ctx.shadowBlur = 0;

        ctx.fillStyle = "#fff";

        ctx.beginPath();

        ctx.arc(-5,-5,3.2,0,Math.PI*2);

        ctx.arc(5,-5,3.2,0,Math.PI*2);

        ctx.fill();

        ctx.fillStyle = g.scared ? "#333" : "#111";

        ctx.beginPath();

        ctx.arc(-5,-5,1.5,0,Math.PI*2);

        ctx.arc(5,-5,1.5,0,Math.PI*2);

        ctx.fill();

        ctx.restore();
      }

      function drawCherry(){

        if(!cherry)
            return;

        const x = cherry.c*TILE+TILE/2;

        const y = cherry.r*TILE+TILE/2;

        ctx.save();

        ctx.translate(x,y);

        ctx.shadowBlur = 15;

        ctx.shadowColor = "#ff3040";

        ctx.fillStyle = "#ff3040";

        ctx.beginPath();

        ctx.arc(-5,2,5,0,Math.PI*2);

        ctx.arc(5,2,5,0,Math.PI*2);

        ctx.fill();

        ctx.strokeStyle = "#6aff65";

        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.moveTo(0,-2);

        ctx.quadraticCurveTo(2,-10,8,-12);

        ctx.stroke();

        ctx.restore();
      }


      function render(){

        drawMaze();

        drawWeaknesspoints();

        drawCherry();

        for(const ghost of ghosts){
            drawGhost(ghost);

        }
        drawPlayer();
      }


      function spawnCherry(){

        const candidates = [];

        for(let r = 1; r < ROWS ; r++){
            for(let c = 1; c < COLS ; c++){

                if(
                    maze[r][c]===1 && !isWeaknessPoint(r,c) && !(r===player.r&&c===player.c)
                ){

                        candidates.push({
                            r,c
                        
                        });
                    } 
            }
        }
        if(!candidates.length)
            return;

        cherry = candidates[Math.floor(Math.random()*candidates.length)];

        cherryTimer = currentDifficulty.cherryLife;
      }

      function updateCherry(dt){
        
        if(cherry){

            cherryTimer -= dt;

            if(cherryTimer <= 0){
                cherry = null;

                cherryTimer = randomCherryTime();
            }
            return;
        }
        cherryTimer -= dt;

        if(cherryTimer<=0){

            spawnCherry();
        }
      }

      function collectCherry(){

        if(!cherry || player.r!==cherry.r || player.c!==cherry.c){
            return;
                }
                score += 500;

                const until = performance.now()+currentDifficulty.scaredTime;

                scaredTimer = currentDifficulty.scaredTime;

                ghosts.forEach(g=>{

                    if(!g.dead){
                        g.scared = true;

                        g.scaredUntil = until;
                    }
                });

                cherry = null;

                cherryTimer = randomCherryTime();

                collectSound();

                updateHUD();
      }

      function update(dt){

        if(!running || paused)
            return;

        updatePlayer(dt);

        collectCurrentCell();

        collectCherry();

        updateCherry(dt);

        for(let i=0;i<ghosts.length;i++){
            updateGhost(ghosts[i],i,dt);

            handleGhostCollision(ghosts[i]);
        }

        if(scaredTimer>0){
            scaredTimer = Math.max(0,scaredTimer-dt);
        }
      }

      function loop(now){

        const dt = Math.min(100,now-lastTime);

        lastTime = now;

        update(dt);

        render();

        requestAnimationFrame(loop);
      }
      let videosPrimed = false;

function primeVideos(){
    if(videosPrimed) return;

    videosPrimed = true;

    [caughtVideo, gameOverVideo].forEach(v=>{
        if(!v) return;

        v.muted = false;
        v.volume = 1;

        const p = v.play();

        if(p && p.then){
            p.then(()=>{
                v.pause();
                v.currentTime = 0;
            }).catch(()=>{
                // autoplay-with-sound blocked; will fall back to muted playback later
            });
        }
    });
}

      function startGame(){

        ensureAudio();

        if(actx && actx.state==="suspended"){
            actx.resume();
        }

        }

        score = 0;

        level = 1;

        maxLives = currentDifficulty.lives;

        lives = maxLives;

        gameOver = false;

        running = true;

        moveTimers.player = 0;

        moveTimersGhosts = [];

        applyGeneratedMaze();

        msgOverlay.style.display = "none";

        pauseBtn.style.display = "block";

        lastTime = performance.now();

        updateHUD();
      }

      function endGame(){

        running = false;

        gameOver = true;

        pauseBtn.style.display = "none";


        msgTitle.textContent = "THE HOLLOW HAS YOU....";

        msgBody.innerHTML = 
        `
        Your sanity reached zero.
        <br><br>
        FINAL SANITY:
        <strong>${score}</strong>
        <br>
        LEVEL:
        <strong>${level}</strong>
        `;

        startBtn.textContent = "Lets do it Again";

        triggerJumpscare("gameover")
      }

      let jumpscareActive = false;

function showFallback(text){
    if(jumpscare) jumpscare.classList.add("novideo");

    if(jumpscareFallback){
        jumpscareFallback.textContent = text;
    }
}

function playJumpscareVideo(video,fallbackMs,fallbackText){

    let settled = false;

    const finish = ()=>{
        if(settled) return;

        settled = true;

        finishJumpscare();
    };

    if(!video){
        showFallback(fallbackText);

        setTimeout(
            finish,
            Math.min(fallbackMs,1800)
        );

        return;
    }

    video.onerror = ()=>{
        showFallback(fallbackText);

        setTimeout(
            finish,
            1800
        );
    };

    try{

        video.pause();

        video.currentTime = 0;

        video.muted = false;

        video.volume = 1;

        video.onended = finish;

        const p = video.play();

        if(p && p.catch){

            p.catch(()=>{

                video.muted = true;

                const retry = video.play();

                if(retry && retry.catch){

                    retry.catch(()=>{

                        showFallback(fallbackText);

                        setTimeout(
                            finish,
                            1800
                        );

                    });
                }
            });
        }

        setTimeout(
            finish,
            fallbackMs
        );

    }catch(e){

        showFallback(fallbackText);

        setTimeout(
            finish,
            1800
        );
    }
}

function triggerJumpscare(kind){

    running = false;

    if(jumpscareActive) return;

    jumpscareActive = true;

    scareSound();

    if(!jumpscare){
        finishJumpscare();
        return;
    }

    jumpscare.classList.remove("novideo");

    jumpscare.classList.add("show");

    if(kind === "gameover"){

        jumpscare.classList.add("gameover");

        jumpscare.classList.remove("caught");

        playJumpscareVideo(
            gameOverVideo,
            7000,
            "THE HOLLOW HAS YOU"
        );

    }else{

        jumpscare.classList.add("caught");

        jumpscare.classList.remove("gameover");

        playJumpscareVideo(
            caughtVideo,
            9000,
            "IT FOUND YOU"
        );
    }
}

function finishJumpscare(){

    jumpscareActive = false;

    if(jumpscare){

        jumpscare.classList.remove("show");

        jumpscare.classList.remove("caught");

        jumpscare.classList.remove("gameover");

        jumpscare.classList.remove("novideo");
    }

    if(caughtVideo){
        caughtVideo.pause();
    }

    if(gameOverVideo){
        gameOverVideo.pause();
    }

    if(gameOver){

        msgOverlay.style.display = "flex";

    }else if(!gameOver && running === false){

        running = true;

        lastTime = performance.now();
    }
}

      function togglePause(){

        if(!running || gameOver)
            return;

        paused = !paused;

        if(paused){

            pauseOverlay.classList.add("show");

            pauseBtn.textContent = "Resume [P]";
        }else{

            pauseOverlay.classList.remove("show");

            pauseBtn.textContent = "pause [P]";

            lastTime = performance.now();
        }
      }

      document.addEventListener("keydown",e=>{

        const key = e.key.toLowerCase();

        if(
            [
                "arrowup",
                "arrowdown",
                "arrowleft",
                "arrowright",
                "w",
                "a",
                "s",
                "d",
                "p"
            ].includes(key)

        ){

            e.preventDefault();
        }

        if(key==="p"){

            togglePause();

            return;

        }

        if(
            key==="arrowup" || key==="w"
        ){
            player.nextDir = {
                x:0,y:-1
            };
        }

        if(
            key==="arrowdown" || key==="s"
        ){
            player.nextDir = {
                x:0,y:1
            };
        }

        if(
            key==="arrowleft" || key==="a"
        ){
            player.nextDir = {
                x:-1,y:0
            };
        }

        if(
            key==="arrowright" || key==="d"
        ){
            player.nextDir = {
                x:1,y:0
            };
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener("touchstart",e=>{

        const t = e.changedTouches[0];

        touchStartX = t.clientX;

        touchStartY = t.clientY;
    },
    {passive:true});

  canvas.addEventListener("touchend",e=>{

    const t = e.changedTouches[0];

    const dx =
        t.clientX-touchStartX;

    const dy =
        t.clientY-touchStartY;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if(Math.max(ax,ay)<20){
        return;
    }

    if(ax>ay){

        player.nextDir =
            dx>0
            ? {x:1,y:0}
            : {x:-1,y:0};

    }else{

        player.nextDir =
            dy>0
            ? {x:0,y:1}
            : {x:0,y:-1};
    }

},{passive:true});

startBtn.addEventListener("click",startGame);

pauseBtn.addEventListener("click",togglePause);

resumeBtn.addEventListener("click",togglePause);

const flickerEl = document.getElementById("flicker");

if(flickerEl){
    setInterval(()=>{
        if(Math.random() < 0.07){
            flickerEl.style.opacity =
                (0.08 + Math.random()*0.18).toFixed(2);

            setTimeout(()=>{
                flickerEl.style.opacity = 0;
            },60 + Math.random()*90);
        }
    },900);
}


buildThemeButtons();

buildDifficultyButtons();

applyTheme(themeKey);

applyDifficulty(difficultyKey);

updateHUD();

requestAnimationFrame(t=>{
    lastTime = t;
    loop(t);
});

        })();