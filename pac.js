const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreE1 = document.getElementById('score');
const levelE1 = document.getElementById('level');
const livesE1 = document.getElementById('lives');
const lifeCountE1 = document.getElementById('lifeCount');
const weaknessCountE1 = document.getElementById('weaknessCount');
const progressBar = document.getElementById('progressBar');

const msgOverlay = document.getElementById('msgOverlay');
const msgTitle = document.getElementById('msgTitle');
const msgBody = document.getElementById('msgBody');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseOverlay = document.getElementById('pauseOverlay');

const levelBanner = document.getElementById('levelBanner');

const themeButtons = document.getElementById('themeButtons');
const diffButtons = document.getElementById('diffButtons');

const jumpscare = document.getElementById('jumpscare');
const caughtVideo = document.getElementById('caughtVideo');




const TILE = 32;

const COLS = 19;
const ROWS = 21;

const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;




const Themes = {

    blood:{
        label:'Bloodveil' ,

        blood:'#7a0a0a',
        bright:'#c81414',

        wall:'#2b0d10',
        rot:'#3a2a1a',

        floor:'#080303',

        pellet:'#e7d9bd',

        weakness: '#ffb000',

        ghosts:[
            '#d41414',
            '#ff5252',
            '#8b0000',
            '#ff1717'
        ]
    },

    toxic:{
        label:'The ConTaminated',
        
        blood:'#285900'
    }
}

