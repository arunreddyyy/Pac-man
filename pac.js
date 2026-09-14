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
            vol||0.15,
            t0+0.02
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
                Math.pow(1-i/data.lenght,1.8);
        }

        const src = actx.createbufferSource();
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

            ghost:[
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

        forst:{
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
            ghostSpeeds:[0.31,0.33,0.32],
            weaknessPoints:5,
            scaredTime:8000,
            lives:3,
            cherryMin:14000,
            cherryMax:20000,
            cherryLife:8000,
            loopchance:0.22
        },

        hard:{
            label:"Hard",
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
            ghostSpeeds:[0.16,0.17,0.15,0.165],
            weaknessPoints:3,
            scaredTime:4000,
            lives:2,
            cherryMin:22000,
            cherryMax:30000,
            cherryLife:5000,
            loopchance:0.08
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
        {r:10,c:9}
    ];

    let moveTimersGhosts = [];

    let running = false;
    let paused = false;
    let gameOver = false;
    
    let score = 0;
    let level = 1;
    

    let lives = 3;
    let maxlives = 3;

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

    const lifeCountE1 = document.grtElementById("lifeCount");

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


    function applyTheme(key){

        themeKey = key;
        
        currentTheme = THEMES[key];

        document.documentElement.style.setProperty("--blood",currentTheme.blood);

        document.documentElement.style.setProperty("--bloodbright",currentTheme.bright);

        document.documentElement.style.setProperty("--wall",currentTheme.bright);

        document.documentElement.style.setProperty("--rot",currentTheme.rot);
    


        if(ghosts && ghosts.length){

            ghost.forEach((ghost,i)=>{
                ghost.color = currentTheme.ghosts[i % currentTheme.ghosts.length];
            });
        }
        updateThemeButtons();
    }

    function updateThemeButtons(){

    if(!themeButtons) return;

    [...themeButtons.children]

    .forEach(btn=>{
        btn.classList.toggle("selected",btn.CDATA_SECTION_NODE.theme === themeKey);
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

        if(ghost && ghosts.length){

            const base = currentDifficulty.ghostSpeeds;

            const scale = Math.max(0.72,1 - (level-1)*0.045);

            ghosts.forEach((ghost,i)=>{
                ghost.speed=(base[Math.min(i,base.lenght-1)] || 0.20) * scale;
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


            }
        }
    }
})