/**
 * ============================================================================
 * VALLEY COMBAT - FPS 3D EM AMBIENTE NATURAL (JAVASCRIPT PURO)
 * Cenário Orgânico, Personagens Humanos Low-Poly (Voxel), Pistola Centralizada
 * e Controles de Câmera FPS Padrão (Sem Inversão de Eixos)
 * ============================================================================
 */

(function () {
  'use strict';

  /* ============================================================================
     1. SISTEMA DE ÁUDIO PROCEDURAL (WEB AUDIO API - ZERO ARQUIVOS EXTERNOS)
     ============================================================================ */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
      } catch (e) {
        console.warn('Web Audio API não inicializada:', e);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // Tiro realista de pistola 9mm (estalo seco + eco do vale)
    playShoot() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;

      // 1. Estalo inicial de pólvora (ruído branco filtrado com ataque imediato)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1800, now);
      bandpass.frequency.exponentialRampToValueAtTime(300, now + 0.12);
      bandpass.Q.setValueAtTime(2.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(1.0, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);

      // 2. Impacto grave do disparo
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      oscGain.gain.setValueAtTime(0.75, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
    }

    // Clique seco ao tentar atirar sem munição
    playEmpty() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    // Som mecânico de recarga (ejeção e trava do ferrolho)
    playReload() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;

      // Ejeção do pente
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(350, now);
      osc1.frequency.exponentialRampToValueAtTime(120, now + 0.09);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Encaixe do novo pente e trava
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(450, now + 0.6);
      osc2.frequency.setValueAtTime(750, now + 0.68);
      gain2.gain.setValueAtTime(0.0, now);
      gain2.gain.setValueAtTime(0.35, now + 0.6);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.78);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.6);
      osc2.stop(now + 0.8);
    }

    // Som de acerto (Hitmarker sutil)
    playHit() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1700, now);
      osc.frequency.setValueAtTime(2300, now + 0.025);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.07);
    }

    // Gemido humano ao sofrer dano (Inimigo)
    playHumanHurt() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210 + Math.random() * 40, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
    }

    // Impacto de golpe sofrido pelo jogador
    playPlayerHurt() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    // Inimigo eliminado
    playEnemyEliminated() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.22);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    }

    playWaveStart() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      [260, 390, 520].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.26);
      });
    }

    playVictory() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      [261, 329, 392, 523].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.35, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.7);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.75);
      });
    }

    playGameOver() {
      if (!this.initialized) return;
      this.resume();
      const now = this.ctx.currentTime;
      [220, 185, 155, 120].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.16);
        gain.gain.setValueAtTime(0.35, now + i * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.16 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.4);
      });
    }
  }

  /* ============================================================================
     2. GERAÇÃO DE TEXTURAS PROCEDURAIS NATURAIS
     (Pedra natural, madeira rústica, ruínas antigas com hera e rochas)
     ============================================================================ */
  const TEX_SIZE = 64;
  const textures = [];

  function createNaturalTextures() {
    function createTexture(renderFn) {
      const cvs = document.createElement('canvas');
      cvs.width = TEX_SIZE;
      cvs.height = TEX_SIZE;
      const ctx = cvs.getContext('2d');
      renderFn(ctx);
      return ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // 1. Encosta de Rocha / Penhasco Natural (Granito com rachaduras e musgo)
    textures[1] = createTexture((ctx) => {
      ctx.fillStyle = '#656d78';
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

      // Variações e blocos de pedra irregulares
      for (let y = 0; y < TEX_SIZE; y += 16) {
        for (let x = 0; x < TEX_SIZE; x += 16) {
          const shade = ((x * 13 + y * 7) % 30) - 15;
          const r = Math.max(0, Math.min(255, 101 + shade));
          const g = Math.max(0, Math.min(255, 109 + shade));
          const b = Math.max(0, Math.min(255, 120 + shade));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x + 1, y + 1, 14, 14);
        }
      }

      // Rachaduras na rocha
      ctx.strokeStyle = '#434a54';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4, 0); ctx.lineTo(18, 22); ctx.lineTo(12, 45); ctx.lineTo(30, TEX_SIZE);
      ctx.moveTo(38, 0); ctx.lineTo(44, 28); ctx.lineTo(60, 52);
      ctx.stroke();

      // Manchas de musgo verde natural
      ctx.fillStyle = '#4e9b2d';
      ctx.fillRect(10, 36, 12, 5);
      ctx.fillRect(42, 14, 8, 4);
    });

    // 2. Paliçada / Cerca de Troncos de Madeira Rústica
    textures[2] = createTexture((ctx) => {
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

      // Troncos verticais individuais
      const logWidth = 16;
      for (let i = 0; i < TEX_SIZE; i += logWidth) {
        ctx.fillStyle = (i / logWidth) % 2 === 0 ? '#6e4c3e' : '#573b2d';
        ctx.fillRect(i + 1, 0, logWidth - 2, TEX_SIZE);

        // Fibras e nós da madeira
        ctx.strokeStyle = '#3d281e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i + 4, 0); ctx.lineTo(i + 4, TEX_SIZE);
        ctx.moveTo(i + 11, 0); ctx.lineTo(i + 11, TEX_SIZE);
        ctx.stroke();

        // Nó de madeira
        ctx.fillStyle = '#3d281e';
        ctx.fillRect(i + 6, 20 + (i % 24), 4, 6);
      }
    });

    // 3. Ruína de Pedra com Hera Verde
    textures[3] = createTexture((ctx) => {
      ctx.fillStyle = '#555b62';
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

      // Tijolos antigos de pedra
      ctx.strokeStyle = '#3a3e43';
      ctx.lineWidth = 2;
      for (let y = 0; y < TEX_SIZE; y += 16) {
        const offset = (y / 16) % 2 === 0 ? 0 : 16;
        for (let x = -16; x < TEX_SIZE; x += 32) {
          ctx.strokeRect(x + offset, y, 32, 16);
        }
      }

      // Folhas de hera verde subindo pelas pedras
      ctx.fillStyle = '#3e8e24';
      ctx.fillRect(4, 18, 10, 16);
      ctx.fillRect(10, 30, 14, 20);
      ctx.fillRect(36, 6, 12, 24);
      ctx.fillStyle = '#5cb836';
      ctx.fillRect(6, 22, 6, 8);
      ctx.fillRect(38, 10, 8, 12);
    });

    // 4. Rocha Grande / Pilar de Pedra
    textures[4] = createTexture((ctx) => {
      ctx.fillStyle = '#737881';
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

      // Textura rugosa de pedra
      ctx.fillStyle = '#5b6068';
      for (let i = 0; i < 40; i++) {
        const rx = (i * 19) % (TEX_SIZE - 6);
        const ry = (i * 29) % (TEX_SIZE - 6);
        ctx.fillRect(rx, ry, 6, 4);
      }
      ctx.strokeStyle = '#3f434a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 2, TEX_SIZE - 4, TEX_SIZE - 4);
    });
  }

  /* ============================================================================
     3. MAPA DO VALE NATURAL (24x24) COM ÁREAS ABERTAS E COBERTURAS
     ============================================================================ */
  const MAP_W = 24;
  const MAP_H = 24;
  // 0 = Grama/Caminho Livre, 1 = Encosta de Rocha, 2 = Paliçada de Madeira, 3 = Ruínas Antigas, 4 = Rochas
  const worldMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,1],
    [1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,1],
    [1,0,0,0,0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0,4,4,0,1],
    [1,0,0,0,0,0,0,3,3,0,0,0,0,0,0,3,3,0,0,0,0,0,0,1],
    [1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,2,2,0,1],
    [1,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,2,2,0,0,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,2,2,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,2,2,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1],
    [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,1],
    [1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,2,2,0,0,0,0,0,0,4,4,0,0,0,0,4,0,1],
    [1,0,0,0,0,0,2,2,0,0,0,0,0,0,4,4,0,0,0,0,4,4,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  // Elementos naturais estáticos do vale (Árvores e Arbustos para enriquecer o cenário)
  const sceneryProps = [
    { x: 3.5, y: 7.5, type: 'tree' },
    { x: 6.2, y: 3.8, type: 'tree' },
    { x: 18.5, y: 5.5, type: 'tree' },
    { x: 21.2, y: 11.5, type: 'tree' },
    { x: 4.8, y: 16.2, type: 'tree' },
    { x: 16.5, y: 19.5, type: 'tree' },
    { x: 8.5, y: 20.8, type: 'tree' },
    { x: 8.2, y: 11.5, type: 'bush' },
    { x: 15.8, y: 8.2, type: 'bush' },
    { x: 17.5, y: 14.5, type: 'bush' },
    { x: 6.8, y: 18.2, type: 'bush' },
    { x: 19.8, y: 17.2, type: 'bush' }
  ];

  /* ============================================================================
     4. PALETAS DE CORES PARA PERSONAGENS HUMANOS LOW-POLY (ESTILO MINECRAFT)
     ============================================================================ */
  const humanOutfits = [
    { name: 'Casual Vermelho', shirt: '#dc2626', pants: '#1e3a8a', hair: '#451a03', skin: '#fcd34d' },
    { name: 'Lenhador Verde', shirt: '#15803d', pants: '#374151', hair: '#171717', skin: '#fbb574' },
    { name: 'Jaqueta Azul', shirt: '#2563eb', pants: '#1c1917', hair: '#78350f', skin: '#fcd34d' },
    { name: 'Sobrevivente Marrom', shirt: '#d97706', pants: '#1e293b', hair: '#292524', skin: '#fbb574' }
  ];

  /* ============================================================================
     5. ESTADO DO JOGO E JOGADOR
     ============================================================================ */
  const audio = new SoundEngine();

  const player = {
    x: 12.5,
    y: 12.5,
    dirX: 0,
    dirY: -1,
    planeX: 0.66,
    planeY: 0,
    pitch: 0, // Inclinação vertical olhar cima/baixo
    speed: 3.4,
    health: 100,
    maxHealth: 100,
    ammo: 12,
    maxMag: 12,
    reserveAmmo: 48,
    isReloading: false,
    reloadDuration: 1300,
    reloadStartTime: 0,
    shootCooldown: 220,
    lastShootTime: 0,
    bobbingTime: 0,
    bobbingOffset: 0,
    isMoving: false,
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    wave: 1
  };

  const keys = { w: false, s: false, a: false, d: false };
  let gameState = 'START';
  let enemies = [];
  let pickups = [];
  let particles = [];
  let zBuffer = [];

  // Variáveis para renderização da arma centralizada
  let weaponRecoil = 0;
  let muzzleFlashTimer = 0;
  let weaponSwayX = 0;
  let weaponSwayY = 0;
  let hitmarkerTimer = 0;

  // Elementos do DOM
  let canvas, ctx;
  let minimapCanvas, minimapCtx;
  let hudElement, waveDisplay, enemiesLeftDisplay, scoreDisplay;
  let healthNumber, healthBarFill, currentAmmoDisplay, reserveAmmoDisplay, bulletPipsContainer;
  let reloadIndicator, hitmarkerEl, damageVignette, muzzleFlashFx, lockPrompt;
  let startScreen, pauseScreen, gameOverScreen, victoryScreen;
  let btnStartGame, btnResumeGame, btnRestartFromPause, btnRestartGame, btnNextWaveEndless, btnRestartVictory;
  let hudNotice;

  /* ============================================================================
     6. INICIALIZAÇÃO
     ============================================================================ */
  window.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    createNaturalTextures();
    setupEventListeners();
    resizeCanvas();
    renderMinimap();

    let lastTime = performance.now();
    function gameLoop(currentTime) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      update(dt);
      render();

      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  });

  function initDOMElements() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    minimapCanvas = document.getElementById('minimapCanvas');
    minimapCtx = minimapCanvas.getContext('2d');

    hudElement = document.getElementById('hud');
    waveDisplay = document.getElementById('waveDisplay');
    enemiesLeftDisplay = document.getElementById('enemiesLeftDisplay');
    scoreDisplay = document.getElementById('scoreDisplay');
    healthNumber = document.getElementById('healthNumber');
    healthBarFill = document.getElementById('healthBarFill');
    currentAmmoDisplay = document.getElementById('currentAmmo');
    reserveAmmoDisplay = document.getElementById('reserveAmmo');
    bulletPipsContainer = document.getElementById('bulletPips');
    reloadIndicator = document.getElementById('reloadIndicator');
    hitmarkerEl = document.getElementById('hitmarker');
    damageVignette = document.getElementById('damageVignette');
    muzzleFlashFx = document.getElementById('muzzleFlashFx');
    lockPrompt = document.getElementById('lockPrompt');
    hudNotice = document.getElementById('hudNotice');

    startScreen = document.getElementById('startScreen');
    pauseScreen = document.getElementById('pauseScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    victoryScreen = document.getElementById('victoryScreen');

    btnStartGame = document.getElementById('btnStartGame');
    btnResumeGame = document.getElementById('btnResumeGame');
    btnRestartFromPause = document.getElementById('btnRestartFromPause');
    btnRestartGame = document.getElementById('btnRestartGame');
    btnNextWaveEndless = document.getElementById('btnNextWaveEndless');
    btnRestartVictory = document.getElementById('btnRestartVictory');
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);

  /* ============================================================================
     7. CONTROLE DO MOUSE E TECLADO (PADRÃO FPS - SEM INVERSÃO)
     ============================================================================ */
  function setupEventListeners() {
    btnStartGame.addEventListener('click', () => {
      audio.init();
      startGame();
    });

    btnResumeGame.addEventListener('click', resumeGame);
    btnRestartFromPause.addEventListener('click', restartGame);
    btnRestartGame.addEventListener('click', restartGame);
    btnRestartVictory.addEventListener('click', restartGame);
    btnNextWaveEndless.addEventListener('click', () => nextWave(true));

    lockPrompt.addEventListener('click', requestPointerLock);

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.w = true;
      if (k === 's' || k === 'arrowdown') keys.s = true;
      if (k === 'a' || k === 'arrowleft') keys.a = true;
      if (k === 'd' || k === 'arrowright') keys.d = true;

      if (k === 'r') reloadWeapon();

      if (k === 'escape' || k === 'p') {
        if (gameState === 'PLAYING') pauseGame();
        else if (gameState === 'PAUSED') resumeGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.w = false;
      if (k === 's' || k === 'arrowdown') keys.s = false;
      if (k === 'a' || k === 'arrowleft') keys.a = false;
      if (k === 'd' || k === 'arrowright') keys.d = false;
    });

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', (e) => {
      if (gameState !== 'PLAYING') return;
      if (e.button === 0) {
        if (document.pointerLockElement !== canvas) {
          requestPointerLock();
        } else {
          shootWeapon();
        }
      }
    });
  }

  function requestPointerLock() {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    if (canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  }

  function onPointerLockChange() {
    const isLocked = document.pointerLockElement === canvas;
    if (!isLocked && gameState === 'PLAYING') {
      lockPrompt.classList.remove('hidden');
    } else {
      lockPrompt.classList.add('hidden');
    }
  }

  /**
   * CORREÇÃO COMPLETA DO MOUSE (PADRÃO FPS):
   * Mouse para Direita  -> Câmera vira para a Direita (+X)
   * Mouse para Esquerda -> Câmera vira para a Esquerda (-X)
   * Mouse para Cima     -> Câmera olha para Cima (Horizonte desce)
   * Mouse para Baixo    -> Câmera olha para Baixo (Horizonte sobe)
   */
  function onMouseMove(e) {
    if (gameState !== 'PLAYING' || document.pointerLockElement !== canvas) return;

    const sensitivity = 0.0022;

    // ROTAÇÃO HORIZONTAL (EIXO X) PADRÃO FPS:
    // e.movementX > 0 (mouse para a direita) gera rotSpeed POSITIVO (gira no sentido horário para a direita)
    // e.movementX < 0 (mouse para a esquerda) gera rotSpeed NEGATIVO (gira para a esquerda)
    const rotSpeed = e.movementX * sensitivity;

    const oldDirX = player.dirX;
    player.dirX = player.dirX * Math.cos(rotSpeed) - player.dirY * Math.sin(rotSpeed);
    player.dirY = oldDirX * Math.sin(rotSpeed) + player.dirY * Math.cos(rotSpeed);

    const oldPlaneX = player.planeX;
    player.planeX = player.planeX * Math.cos(rotSpeed) - player.planeY * Math.sin(rotSpeed);
    player.planeY = oldPlaneX * Math.sin(rotSpeed) + player.planeY * Math.cos(rotSpeed);

    // INCLINAÇÃO VERTICAL (PITCH / EIXO Y) PADRÃO FPS:
    // e.movementY < 0 (mouse para cima) -> pitch aumenta -> horizonte desce na tela -> câmera olha para CIMA
    // e.movementY > 0 (mouse para baixo) -> pitch diminui -> horizonte sobe na tela -> câmera olha para BAIXO
    player.pitch -= e.movementY * 1.2;
    player.pitch = Math.max(-220, Math.min(220, player.pitch));

    // Suave movimento de inércia da arma (permanecendo centralizada e estável)
    weaponSwayX += e.movementX * 0.15;
    weaponSwayY += e.movementY * 0.15;
    weaponSwayX = Math.max(-14, Math.min(14, weaponSwayX));
    weaponSwayY = Math.max(-10, Math.min(10, weaponSwayY));
  }

  /* ============================================================================
     8. COMBATE, SPAWN E ONDAS DE INIMIGOS HUMANOS
     ============================================================================ */
  function startGame() {
    gameState = 'PLAYING';
    player.health = 100;
    player.ammo = 12;
    player.reserveAmmo = 48;
    player.score = 0;
    player.kills = 0;
    player.shotsFired = 0;
    player.shotsHit = 0;
    player.wave = 1;
    player.x = 12.5;
    player.y = 12.5;
    player.dirX = 0;
    player.dirY = -1;
    player.planeX = 0.66;
    player.planeY = 0;
    player.pitch = 0;
    player.isReloading = false;

    hideAllScreens();
    hudElement.classList.remove('hidden');
    requestPointerLock();

    startWave(1);
  }

  function pauseGame() {
    gameState = 'PAUSED';
    pauseScreen.classList.remove('hidden');
    if (document.exitPointerLock) document.exitPointerLock();
  }

  function resumeGame() {
    gameState = 'PLAYING';
    pauseScreen.classList.add('hidden');
    requestPointerLock();
  }

  function restartGame() {
    hideAllScreens();
    startGame();
  }

  function hideAllScreens() {
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    lockPrompt.classList.add('hidden');
  }

  function showNotification(msg) {
    if (!hudNotice) return;
    hudNotice.textContent = msg;
    hudNotice.classList.remove('hidden');
    setTimeout(() => hudNotice.classList.add('hidden'), 2200);
  }

  function startWave(waveNum) {
    player.wave = waveNum;
    enemies = [];
    pickups = [];

    const count = 3 + waveNum * 2; // Onda 1: 5 inimigos, Onda 2: 7, Onda 3: 9...
    showNotification(`FASE ${waveNum}: ${count} INIMIGOS NO VALE`);
    audio.playWaveStart();

    // Encontra posições livres e naturais espalhadas pelo vale (longe da largada do jogador)
    const availableSlots = [];
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        if (worldMap[y][x] === 0) {
          const distSq = (x - player.x) ** 2 + (y - player.y) ** 2;
          if (distSq > 36) { // Pelo menos 6 blocos de distância
            availableSlots.push({ x: x + 0.5, y: y + 0.5 });
          }
        }
      }
    }

    availableSlots.sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const slot = availableSlots[i % availableSlots.length];
      const outfit = humanOutfits[i % humanOutfits.length];

      enemies.push({
        id: Math.random(),
        x: slot.x + (Math.random() * 0.4 - 0.2),
        y: slot.y + (Math.random() * 0.4 - 0.2),
        hp: 60 + waveNum * 15,
        maxHp: 60 + waveNum * 15,
        speed: 1.15 + waveNum * 0.08,
        damage: 10 + waveNum * 2,
        outfit: outfit,
        walkCycle: Math.random() * Math.PI * 2,
        idleCycle: Math.random() * Math.PI * 2,
        isMoving: false,
        attackCooldown: 0,
        hurtTimer: 0,
        alive: true
      });
    }

    updateHUD();
  }

  function nextWave(isEndless = false) {
    hideAllScreens();
    gameState = 'PLAYING';
    hudElement.classList.remove('hidden');
    requestPointerLock();

    player.reserveAmmo = Math.min(player.reserveAmmo + 24, 72);
    player.health = Math.min(player.health + 30, 100);

    startWave(player.wave + 1);
  }

  function triggerGameOver() {
    gameState = 'GAMEOVER';
    if (document.exitPointerLock) document.exitPointerLock();
    audio.playGameOver();

    document.getElementById('finalKills').textContent = player.kills;
    document.getElementById('finalWave').textContent = player.wave;
    document.getElementById('finalScore').textContent = player.score.toString().padStart(6, '0');

    gameOverScreen.classList.remove('hidden');
    hudElement.classList.add('hidden');
  }

  function triggerVictory() {
    gameState = 'VICTORY';
    if (document.exitPointerLock) document.exitPointerLock();
    audio.playVictory();

    const acc = player.shotsFired > 0 ? Math.round((player.shotsHit / player.shotsFired) * 100) : 0;
    document.getElementById('victoryKills').textContent = player.kills;
    document.getElementById('victoryAccuracy').textContent = `${acc}%`;
    document.getElementById('victoryScore').textContent = player.score.toString().padStart(6, '0');

    victoryScreen.classList.remove('hidden');
    hudElement.classList.add('hidden');
  }

  /* ============================================================================
     9. SISTEMA DE TIRO (RAYCAST NO CENTRO EXATO DA MIRA)
     ============================================================================ */
  function shootWeapon() {
    const now = performance.now();
    if (now - player.lastShootTime < player.shootCooldown) return;
    if (player.isReloading) return;

    if (player.ammo <= 0) {
      audio.playEmpty();
      player.lastShootTime = now;
      reloadWeapon();
      return;
    }

    player.ammo--;
    player.shotsFired++;
    player.lastShootTime = now;

    // Recuo suave da arma para trás e para cima
    weaponRecoil = 22;
    muzzleFlashTimer = 3;

    // Feedback visual na tela
    muzzleFlashFx.classList.add('active');
    setTimeout(() => muzzleFlashFx.classList.remove('active'), 50);

    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      crosshair.classList.add('kick');
      setTimeout(() => crosshair.classList.remove('kick'), 90);
    }

    audio.playShoot();
    updateHUD();

    // Disparo direto da mira central: Raycast pelo vetor frontal do jogador
    checkHitscanShot();
  }

  function checkHitscanShot() {
    let closestEnemy = null;
    let closestDist = 9999;

    const wallDist = castBulletRay(player.x, player.y, player.dirX, player.dirY);

    enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= wallDist || dist > 22) return;

      const dot = (dx * player.dirX + dy * player.dirY) / dist;
      const perpDist = dist * Math.sqrt(Math.max(0, 1 - dot * dot));

      // Raio de colisão do corpo do personagem humano
      if (dot > 0 && perpDist < 0.38 && dist < closestDist) {
        closestDist = dist;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      player.shotsHit++;
      const damage = Math.floor(30 + Math.random() * 10);
      closestEnemy.hp -= damage;
      closestEnemy.hurtTimer = 0.2;

      // Knockback sutil
      closestEnemy.x += player.dirX * 0.12;
      closestEnemy.y += player.dirY * 0.12;

      hitmarkerTimer = 7;
      hitmarkerEl.classList.remove('hidden');
      audio.playHit();
      audio.playHumanHurt();

      // Partículas vermelhas de impacto
      spawnParticles(closestEnemy.x, closestEnemy.y, '#ef4444', 6);

      if (closestEnemy.hp <= 0) {
        closestEnemy.alive = false;
        player.kills++;
        player.score += 200;

        audio.playEnemyEliminated();
        // Partículas em blocos se dispersando
        spawnParticles(closestEnemy.x, closestEnemy.y, closestEnemy.outfit.shirt, 18);

        // Chance de drop de item (vida ou munição)
        if (Math.random() < 0.4) {
          const isHealth = Math.random() < 0.5;
          pickups.push({
            x: closestEnemy.x,
            y: closestEnemy.y,
            type: isHealth ? 'health' : 'ammo',
            alive: true
          });
        }

        checkWaveProgress();
      }
    } else {
      // Tiro no ambiente/pedra: gera faíscas cinzas e poeira
      const hitX = player.x + player.dirX * Math.min(wallDist, 20);
      const hitY = player.y + player.dirY * Math.min(wallDist, 20);
      spawnParticles(hitX, hitY, '#cbd5e1', 4);
    }
  }

  function castBulletRay(x, y, dx, dy) {
    let dist = 0;
    const step = 0.1;
    while (dist < 24) {
      const cx = Math.floor(x + dx * dist);
      const cy = Math.floor(y + dy * dist);
      if (cx < 0 || cx >= MAP_W || cy < 0 || cy >= MAP_H) return dist;
      if (worldMap[cy][cx] > 0) return dist;
      dist += step;
    }
    return dist;
  }

  function reloadWeapon() {
    if (player.isReloading || player.ammo === player.maxMag || player.reserveAmmo <= 0) return;

    player.isReloading = true;
    player.reloadStartTime = performance.now();
    reloadIndicator.classList.remove('hidden');
    audio.playReload();
  }

  function checkWaveProgress() {
    const aliveCount = enemies.filter(e => e.alive).length;
    updateHUD();

    if (aliveCount === 0) {
      if (player.wave === 4) {
        setTimeout(triggerVictory, 600);
      } else {
        setTimeout(() => nextWave(false), 1200);
      }
    }
  }

  /* ============================================================================
     10. FÍSICA, MOVIMENTAÇÃO E COMPORTAMENTO DOS INIMIGOS
     ============================================================================ */
  function update(dt) {
    if (gameState !== 'PLAYING') return;

    // 1. Recarga da Arma
    if (player.isReloading) {
      const elapsed = performance.now() - player.reloadStartTime;
      if (elapsed >= player.reloadDuration) {
        const needed = player.maxMag - player.ammo;
        const take = Math.min(needed, player.reserveAmmo);
        player.ammo += take;
        player.reserveAmmo -= take;
        player.isReloading = false;
        reloadIndicator.classList.add('hidden');
        updateHUD();
      }
    }

    // 2. Movimentação do Jogador (WASD com colisão deslizante)
    let moveX = 0;
    let moveY = 0;

    if (keys.w) { moveX += player.dirX; moveY += player.dirY; }
    if (keys.s) { moveX -= player.dirX; moveY -= player.dirY; }
    if (keys.d) { moveX += player.planeX; moveY += player.planeY; }
    if (keys.a) { moveX -= player.planeX; moveY -= player.planeY; }

    const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
    player.isMoving = moveLen > 0.01;

    if (player.isMoving) {
      moveX /= moveLen;
      moveY /= moveLen;

      const step = player.speed * dt;
      const radius = 0.28;

      const nextX = player.x + moveX * step;
      const checkX1 = Math.floor(nextX + (moveX > 0 ? radius : -radius));
      const checkY1 = Math.floor(player.y);
      if (worldMap[checkY1] && worldMap[checkY1][checkX1] === 0) {
        player.x = nextX;
      }

      const nextY = player.y + moveY * step;
      const checkX2 = Math.floor(player.x);
      const checkY2 = Math.floor(nextY + (moveY > 0 ? radius : -radius));
      if (worldMap[checkY2] && worldMap[checkY2][checkX2] === 0) {
        player.y = nextY;
      }

      player.bobbingTime += dt * 8.5;
      player.bobbingOffset = Math.sin(player.bobbingTime) * 4.5;
    } else {
      player.bobbingOffset *= 0.85;
    }

    // Amortecimento do recuo e sway da arma
    weaponRecoil *= 0.82;
    weaponSwayX *= 0.88;
    weaponSwayY *= 0.88;

    if (hitmarkerTimer > 0) {
      hitmarkerTimer--;
      if (hitmarkerTimer === 0) hitmarkerEl.classList.add('hidden');
    }

    // 3. Atualização e IA dos Personagens Inimigos
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      if (enemy.hurtTimer > 0) enemy.hurtTimer -= dt;
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Distância de detecção do jogador no vale (~15 blocos)
      if (dist < 15.0) {
        if (dist > 1.1) {
          enemy.isMoving = true;
          enemy.walkCycle += dt * 7.5; // Animação de caminhada das pernas/braços

          const step = enemy.speed * dt;
          const vx = (dx / dist) * step;
          const vy = (dy / dist) * step;

          const nex = enemy.x + vx;
          const ney = enemy.y + vy;

          // Colisão com pedras e paredes
          if (worldMap[Math.floor(enemy.y)][Math.floor(nex)] === 0) enemy.x = nex;
          if (worldMap[Math.floor(ney)][Math.floor(enemy.x)] === 0) enemy.y = ney;
        } else {
          // Em combate próximo: golpe corporal
          enemy.isMoving = false;
          enemy.idleCycle += dt * 3;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1.1;
            damagePlayer(enemy.damage);
          }
        }
      } else {
        // Parado: respiração sutil
        enemy.isMoving = false;
        enemy.idleCycle += dt * 2;
      }
    });

    // 4. Coleta de Itens
    pickups.forEach((p) => {
      if (!p.alive) return;
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      if (dx * dx + dy * dy < 0.6) {
        p.alive = false;
        if (p.type === 'health') {
          player.health = Math.min(100, player.health + 30);
          showNotification('+30% DE ENERGIA VITAL');
          audio.playHit();
        } else {
          player.reserveAmmo = Math.min(72, player.reserveAmmo + 24);
          showNotification('+24 BALAS DE PISTOLA');
          audio.playHit();
        }
        updateHUD();
      }
    });

    // 5. Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;
      pt.vz -= 9.8 * dt;
      if (pt.z < 0) {
        pt.z = 0;
        pt.vz = -pt.vz * 0.3;
      }
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }
  }

  function damagePlayer(amount) {
    player.health = Math.max(0, player.health - amount);
    audio.playPlayerHurt();

    damageVignette.classList.add('damaged');
    setTimeout(() => damageVignette.classList.remove('damaged'), 180);

    updateHUD();

    if (player.health <= 0) {
      triggerGameOver();
    }
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.0;
      particles.push({
        x: x,
        y: y,
        z: 0.5 + Math.random() * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 1.5 + Math.random() * 2.5,
        color: color,
        life: 0.35 + Math.random() * 0.35
      });
    }
  }

  /* ============================================================================
     11. ATUALIZAÇÃO DA HUD
     ============================================================================ */
  function updateHUD() {
    waveDisplay.textContent = `ONDA ${player.wave}`;
    const aliveEnemies = enemies.filter(e => e.alive).length;
    enemiesLeftDisplay.textContent = aliveEnemies.toString();
    scoreDisplay.textContent = player.score.toString().padStart(6, '0');

    healthNumber.textContent = `${player.health}%`;
    healthBarFill.style.width = `${player.health}%`;
    if (player.health <= 25) {
      healthBarFill.classList.add('critical');
    } else {
      healthBarFill.classList.remove('critical');
    }

    currentAmmoDisplay.textContent = player.ammo.toString();
    reserveAmmoDisplay.textContent = player.reserveAmmo.toString();

    bulletPipsContainer.innerHTML = '';
    for (let i = 0; i < player.maxMag; i++) {
      const pip = document.createElement('div');
      pip.className = 'bullet-pip' + (i < player.ammo ? '' : ' empty');
      bulletPipsContainer.appendChild(pip);
    }
  }

  /* ============================================================================
     12. MOTOR DE RENDERIZAÇÃO 3D (CENÁRIO NATURAL E HORIZONTE)
     ============================================================================ */
  function render() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    if (zBuffer.length !== w) {
      zBuffer = new Float32Array(w);
    }

    const pitchOffset = Math.floor(player.pitch + player.bobbingOffset);
    const horizon = Math.floor(h / 2) + pitchOffset;

    // 1. CÉU NATURAL DIURNO (Azul suave com horizonte claro e sol)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, '#3883e0');
    skyGrad.addColorStop(0.7, '#6db5f5');
    skyGrad.addColorStop(1, '#bfe3fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizon);

    // Sol brilhante diurno no horizonte
    const sunAngle = 0.4;
    const sunScreenX = Math.floor((w / 2) + (player.dirX * w * 0.4));
    const sunScreenY = horizon - 70;
    if (sunScreenX > -50 && sunScreenX < w + 50) {
      ctx.fillStyle = '#fff9d6';
      ctx.shadowColor = '#fff1a8';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Nuvens simples decorativas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    [0.2, 0.55, 0.85].forEach((pos, idx) => {
      const cloudX = ((w * pos) + (idx * 60) + (performance.now() * 0.005)) % (w + 120) - 60;
      const cloudY = horizon * 0.4 + idx * 15;
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 22, 0, Math.PI * 2);
      ctx.arc(cloudX + 20, cloudY - 5, 28, 0, Math.PI * 2);
      ctx.arc(cloudX + 44, cloudY, 20, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. CHÃO NATURAL (Grama verde com transição suave para terra e distância)
    const floorGrad = ctx.createLinearGradient(0, horizon, 0, h);
    floorGrad.addColorStop(0, '#3c7923');
    floorGrad.addColorStop(0.4, '#48912b');
    floorGrad.addColorStop(1, '#2c5a1a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    // 3. RAYCASTING DAS PAREDES DO VALE (DDA)
    for (let x = 0; x < w; x++) {
      const cameraX = (2 * x) / w - 1;
      const rayDirX = player.dirX + player.planeX * cameraX;
      const rayDirY = player.dirY + player.planeY * cameraX;

      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
      const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));

      let stepX, stepY;
      let sideDistX, sideDistY;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
      }

      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
      }

      let hit = 0;
      let side = 0;

      while (hit === 0) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        if (mapX < 0 || mapX >= MAP_W || mapY < 0 || mapY >= MAP_H) {
          hit = 1;
          break;
        }
        if (worldMap[mapY][mapX] > 0) {
          hit = 1;
        }
      }

      let perpWallDist;
      if (side === 0) {
        perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
      } else {
        perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      }
      perpWallDist = Math.max(0.08, perpWallDist);
      zBuffer[x] = perpWallDist;

      const lineHeight = Math.floor(h / perpWallDist);
      const drawStart = Math.floor(-lineHeight / 2 + horizon);
      const drawEnd = Math.floor(lineHeight / 2 + horizon);

      let wallX;
      if (side === 0) wallX = player.y + perpWallDist * rayDirY;
      else wallX = player.x + perpWallDist * rayDirX;
      wallX -= Math.floor(wallX);

      let texX = Math.floor(wallX * TEX_SIZE);
      if (side === 0 && rayDirX > 0) texX = TEX_SIZE - texX - 1;
      if (side === 1 && rayDirY < 0) texX = TEX_SIZE - texX - 1;

      const wallType = (worldMap[mapY] && worldMap[mapY][mapX]) || 1;
      const textureData = textures[wallType] || textures[1];

      // Iluminação natural com névoa suave do vale diurno
      const sideShade = side === 1 ? 0.78 : 1.0;
      const fog = Math.min(1.0, 1.45 / (1.0 + perpWallDist * 0.14));
      const shade = sideShade * fog;

      renderWallSlice(ctx, x, drawStart, drawEnd, texX, textureData, shade);
    }

    // 4. RENDERIZAÇÃO DOS SPRITES (PERSONAGENS HUMANOS, ÁRVORES E ITENS)
    renderSprites(w, h, horizon);

    // 5. RENDERIZAÇÃO DA PISTOLA CENTRALIZADA NO INFERIOR DA TELA
    renderCenteredWeapon(w, h);

    // 6. RADAR / MINIMAPA
    renderMinimap();
  }

  function renderWallSlice(ctx, screenX, drawStart, drawEnd, texX, textureData, shade) {
    const clampedStart = Math.max(0, drawStart);
    const clampedEnd = Math.min(canvas.height, drawEnd);
    if (clampedStart >= clampedEnd) return;

    const idx = (Math.floor(TEX_SIZE * 0.5) * TEX_SIZE + texX) * 4;
    const r = Math.floor(textureData.data[idx] * shade);
    const g = Math.floor(textureData.data[idx + 1] * shade);
    const b = Math.floor(textureData.data[idx + 2] * shade);

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(screenX, clampedStart, 1, clampedEnd - clampedStart);
  }

  /* ============================================================================
     13. RENDERIZAÇÃO DE SPRITES (PERSONAGENS HUMANOS LOW-POLY & ÁRVORES)
     ============================================================================ */
  function renderSprites(w, h, horizon) {
    const sprites = [];

    // Inimigos Humanos
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      sprites.push({
        type: 'human',
        obj: enemy,
        x: enemy.x,
        y: enemy.y,
        distSq: dx * dx + dy * dy
      });
    });

    // Elementos de Cenário (Árvores e Arbustos)
    sceneryProps.forEach((prop) => {
      const dx = prop.x - player.x;
      const dy = prop.y - player.y;
      sprites.push({
        type: prop.type,
        obj: prop,
        x: prop.x,
        y: prop.y,
        distSq: dx * dx + dy * dy
      });
    });

    // Itens Coletáveis
    pickups.forEach((p) => {
      if (!p.alive) return;
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      sprites.push({
        type: 'pickup',
        obj: p,
        x: p.x,
        y: p.y,
        distSq: dx * dx + dy * dy
      });
    });

    // Partículas
    particles.forEach((pt) => {
      const dx = pt.x - player.x;
      const dy = pt.y - player.y;
      sprites.push({
        type: 'particle',
        obj: pt,
        x: pt.x,
        y: pt.y,
        z: pt.z,
        distSq: dx * dx + dy * dy
      });
    });

    // Ordenação de profundidade: mais distante para o mais próximo
    sprites.sort((a, b) => b.distSq - a.distSq);

    sprites.forEach((item) => {
      const spriteX = item.x - player.x;
      const spriteY = item.y - player.y;

      const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
      const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
      const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);

      if (transformY <= 0.18) return;

      const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
      const dist = transformY;

      // 1. Partícula
      if (item.type === 'particle') {
        const pt = item.obj;
        const pSize = Math.max(2, Math.floor((h / dist) * 0.035));
        const pScreenY = Math.floor(horizon - (pt.z - 0.5) * (h / dist));
        if (spriteScreenX >= 0 && spriteScreenX < w && dist < zBuffer[spriteScreenX]) {
          ctx.fillStyle = pt.color;
          ctx.fillRect(spriteScreenX - pSize / 2, pScreenY - pSize / 2, pSize, pSize);
        }
        return;
      }

      // 2. Coletáveis (Caixa de Vida / Munição)
      if (item.type === 'pickup') {
        const p = item.obj;
        const size = Math.abs(Math.floor((h / dist) * 0.35));
        const drawY = Math.floor(horizon + (h / dist) * 0.28 - size / 2);
        if (spriteScreenX >= 0 && spriteScreenX < w && dist < zBuffer[spriteScreenX]) {
          ctx.fillStyle = p.type === 'health' ? '#22c55e' : '#f59e0b';
          ctx.fillRect(spriteScreenX - size / 2, drawY, size, size);
          ctx.fillStyle = '#fff';
          ctx.fillRect(spriteScreenX - size * 0.2, drawY + size * 0.35, size * 0.4, size * 0.3);
        }
        return;
      }

      // 3. Cenário: Árvore
      if (item.type === 'tree') {
        const treeHeight = Math.abs(Math.floor((h / dist) * 1.5));
        const treeWidth = Math.floor(treeHeight * 0.6);
        const drawY = Math.floor(horizon - treeHeight * 0.4);
        const startX = Math.floor(spriteScreenX - treeWidth / 2);
        const endX = Math.floor(spriteScreenX + treeWidth / 2);

        if (endX < 0 || startX >= w) return;

        for (let stripe = startX; stripe < endX; stripe++) {
          if (stripe >= 0 && stripe < w && dist < zBuffer[stripe]) {
            const relX = (stripe - startX) / treeWidth;
            // Tronco
            if (relX > 0.42 && relX < 0.58) {
              ctx.fillStyle = '#533b22';
              ctx.fillRect(stripe, drawY + treeHeight * 0.45, 1, treeHeight * 0.55);
            }
            // Copa de folhas verde
            if (relX > 0.1 && relX < 0.9) {
              const leafTop = drawY + Math.abs(relX - 0.5) * (treeHeight * 0.5);
              ctx.fillStyle = '#2d6a1e';
              ctx.fillRect(stripe, leafTop, 1, treeHeight * 0.5);
              ctx.fillStyle = '#3c8b29';
              ctx.fillRect(stripe, leafTop + 4, 1, treeHeight * 0.2);
            }
          }
        }
        return;
      }

      // 4. Cenário: Arbusto
      if (item.type === 'bush') {
        const bushHeight = Math.abs(Math.floor((h / dist) * 0.55));
        const bushWidth = Math.floor(bushHeight * 1.2);
        const drawY = Math.floor(horizon + (h / dist) * 0.15 - bushHeight / 2);
        const startX = Math.floor(spriteScreenX - bushWidth / 2);
        const endX = Math.floor(spriteScreenX + bushWidth / 2);

        if (endX < 0 || startX >= w) return;

        for (let stripe = startX; stripe < endX; stripe++) {
          if (stripe >= 0 && stripe < w && dist < zBuffer[stripe]) {
            const relX = (stripe - startX) / bushWidth;
            if (relX > 0.05 && relX < 0.95) {
              ctx.fillStyle = '#367c22';
              ctx.fillRect(stripe, drawY, 1, bushHeight);
            }
          }
        }
        return;
      }

      // 5. PERSONAGEM HUMANO LOW-POLY (ESTILO MINECRAFT)
      if (item.type === 'human') {
        const enemy = item.obj;
        const spriteHeight = Math.abs(Math.floor((h / dist) * 1.05));
        const spriteWidth = Math.floor(spriteHeight * 0.55);

        // Animação de caminhada com balanço de pernas e braços
        const walkSwing = enemy.isMoving ? Math.sin(enemy.walkCycle) : 0;
        const bodyBounce = enemy.isMoving ? Math.abs(Math.sin(enemy.walkCycle * 2)) * (spriteHeight * 0.03) : Math.sin(enemy.idleCycle) * (spriteHeight * 0.015);

        const drawStartY = Math.floor(horizon - spriteHeight * 0.5 - bodyBounce);
        const startX = Math.floor(spriteScreenX - spriteWidth / 2);
        const endX = Math.floor(spriteScreenX + spriteWidth / 2);

        if (endX < 0 || startX >= w) return;

        const isHurt = enemy.hurtTimer > 0;
        const outfit = enemy.outfit;

        for (let stripe = startX; stripe < endX; stripe++) {
          if (stripe >= 0 && stripe < w && dist < zBuffer[stripe]) {
            const relX = (stripe - startX) / spriteWidth; // 0.0 a 1.0

            renderHumanStripe(ctx, stripe, drawStartY, spriteHeight, relX, walkSwing, outfit, isHurt, dist);
          }
        }

        // Barra de Vida flutuante sobre o personagem
        const midX = Math.floor(spriteScreenX);
        if (midX >= 0 && midX < w && dist < zBuffer[midX] && enemy.hp < enemy.maxHp) {
          const barW = Math.max(26, Math.floor(spriteWidth * 0.8));
          const barH = 4;
          const barX = midX - barW / 2;
          const barY = drawStartY - 12;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(barX, barY, barW * Math.max(0, enemy.hp / enemy.maxHp), barH);
        }
      }
    });
  }

  /**
   * Renderiza a coluna do personagem humano cúbico/low-poly (estilo Minecraft):
   * Cabeça (Cubo com cabelo, olhos e pele), Tronco (Camisa), Braços e Pernas alternando
   */
  function renderHumanStripe(ctx, screenX, topY, height, relX, walkSwing, outfit, isHurt, dist) {
    const headHeight = height * 0.26;
    const bodyHeight = height * 0.36;
    const legsHeight = height * 0.38;

    const headTop = topY;
    const bodyTop = headTop + headHeight;
    const legsTop = bodyTop + bodyHeight;

    const shade = Math.min(1.0, 1.4 / (1.0 + dist * 0.16));

    function applyColor(hex) {
      if (isHurt) {
        ctx.fillStyle = '#ef4444'; // Pisca em vermelho ao sofrer dano
        return;
      }
      ctx.fillStyle = hex;
    }

    // 1. CABEÇA (Cúbica / Bloco 0.25 a 0.75 da largura)
    if (relX >= 0.25 && relX <= 0.75) {
      // Cabelo no topo da cabeça
      applyColor(outfit.hair);
      ctx.fillRect(screenX, headTop, 1, headHeight * 0.35);

      // Rosto (Tom de pele)
      applyColor(outfit.skin);
      ctx.fillRect(screenX, headTop + headHeight * 0.35, 1, headHeight * 0.65);

      // Olhos pretos (pixels nas colunas centrais)
      if ((relX >= 0.36 && relX <= 0.44) || (relX >= 0.56 && relX <= 0.64)) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(screenX, headTop + headHeight * 0.45, 1, headHeight * 0.18);
      }
    }

    // 2. TRONCO E BRAÇOS
    // Braço Esquerdo (0.05 a 0.22)
    if (relX >= 0.05 && relX < 0.24) {
      const armSwingOffset = walkSwing * (height * 0.08);
      applyColor(outfit.shirt);
      ctx.fillRect(screenX, bodyTop + armSwingOffset, 1, bodyHeight * 0.75);
      // Mão (pele)
      applyColor(outfit.skin);
      ctx.fillRect(screenX, bodyTop + armSwingOffset + bodyHeight * 0.75, 1, bodyHeight * 0.25);
    }
    // Tronco Central (Camisa: 0.24 a 0.76)
    else if (relX >= 0.24 && relX <= 0.76) {
      applyColor(outfit.shirt);
      ctx.fillRect(screenX, bodyTop, 1, bodyHeight);
    }
    // Braço Direito (0.76 a 0.95)
    else if (relX > 0.76 && relX <= 0.95) {
      const armSwingOffset = -walkSwing * (height * 0.08);
      applyColor(outfit.shirt);
      ctx.fillRect(screenX, bodyTop + armSwingOffset, 1, bodyHeight * 0.75);
      // Mão (pele)
      applyColor(outfit.skin);
      ctx.fillRect(screenX, bodyTop + armSwingOffset + bodyHeight * 0.75, 1, bodyHeight * 0.25);
    }

    // 3. PERNAS (Calça e Botas)
    // Perna Esquerda (0.25 a 0.48)
    if (relX >= 0.25 && relX <= 0.48) {
      const legSwingOffset = -walkSwing * (height * 0.07);
      applyColor(outfit.pants);
      ctx.fillRect(screenX, legsTop + legSwingOffset, 1, legsHeight * 0.78);
      // Bota / Sapato escuro
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(screenX, legsTop + legSwingOffset + legsHeight * 0.78, 1, legsHeight * 0.22);
    }
    // Perna Direita (0.52 a 0.75)
    else if (relX >= 0.52 && relX <= 0.75) {
      const legSwingOffset = walkSwing * (height * 0.07);
      applyColor(outfit.pants);
      ctx.fillRect(screenX, legsTop + legSwingOffset, 1, legsHeight * 0.78);
      // Bota / Sapato escuro
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(screenX, legsTop + legSwingOffset + legsHeight * 0.78, 1, legsHeight * 0.22);
    }
  }

  /* ============================================================================
     14. RENDERIZAÇÃO DA ARMA FPS (PISTOLA CENTRALIZADA E ALINHADA COM A MIRA)
     ============================================================================ */
  function renderCenteredWeapon(w, h) {
    ctx.save();

    // Dimensões da pistola em proporção à tela
    const gunWidth = Math.min(w * 0.32, 280);
    const gunHeight = gunWidth * 1.15;

    // Bobbing da caminhada (oscilação natural mantendo a centralização)
    const bobX = Math.cos(player.bobbingTime * 0.5) * 4;
    const bobY = Math.abs(Math.sin(player.bobbingTime)) * 7;

    // POSIÇÃO RIGOROSAMENTE CENTRALIZADA NO INFERIOR DA TELA
    const posX = (w / 2) + weaponSwayX * 0.4 + bobX;
    const posY = h - gunHeight * 0.88 + weaponRecoil * 1.1 + weaponSwayY * 0.4 + bobY;

    ctx.translate(posX, posY);

    // Pequena elevação angular no recuo
    if (weaponRecoil > 0.5) {
      ctx.rotate(-weaponRecoil * 0.004);
    }

    // 1. Mão/Luva segurando a empunhadura por baixo
    ctx.fillStyle = '#374151'; // Luva tática cinza escuro
    ctx.beginPath();
    ctx.arc(0, gunHeight * 0.65, gunWidth * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // 2. Empunhadura da Pistola (Grip central)
    ctx.fillStyle = '#181b22';
    ctx.fillRect(-gunWidth * 0.16, gunHeight * 0.28, gunWidth * 0.32, gunHeight * 0.5);

    // Textura de aderência no cabo
    ctx.strokeStyle = '#272d3b';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-gunWidth * 0.13, gunHeight * 0.38 + i * 14);
      ctx.lineTo(gunWidth * 0.13, gunHeight * 0.38 + i * 14);
      ctx.stroke();
    }

    // 3. Ferrolho Superior e Cano (Alinhado diretamente para a frente / mira)
    const slideKick = weaponRecoil * 0.6;
    ctx.fillStyle = '#2a313d'; // Aço fosco escuro
    ctx.fillRect(-gunWidth * 0.18, -slideKick, gunWidth * 0.36, gunHeight * 0.36);

    // Relevo superior do ferrolho
    ctx.fillStyle = '#1e242d';
    ctx.fillRect(-gunWidth * 0.14, -slideKick + 4, gunWidth * 0.28, gunHeight * 0.3);

    // 4. MIRA DA ARMA (Alça e Massa de mira perfeitamente visíveis e alinhadas ao centro)
    // Alça de mira traseira (notches laterais)
    ctx.fillStyle = '#0f1217';
    ctx.fillRect(-gunWidth * 0.15, -slideKick - 8, gunWidth * 0.08, 9);
    ctx.fillRect(gunWidth * 0.07, -slideKick - 8, gunWidth * 0.08, 9);

    // Massa de mira frontal (Poste frontal central com ponto verde de contraste)
    ctx.fillStyle = '#0f1217';
    ctx.fillRect(-3, -slideKick - 12, 6, 12);
    ctx.fillStyle = '#22c55e'; // Ponto verde luminoso alinhado com a mira da tela
    ctx.beginPath();
    ctx.arc(0, -slideKick - 9, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Clarão do Disparo (Muzzle Flash no topo do cano)
    if (muzzleFlashTimer > 0) {
      muzzleFlashTimer--;
      const muzzleY = -slideKick - 18;

      ctx.save();
      ctx.translate(0, muzzleY);

      // Clarão quente de fogo
      const flashGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 55);
      flashGrad.addColorStop(0, '#ffffff');
      flashGrad.addColorStop(0.35, '#facc15');
      flashGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.4)');
      flashGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.fill();

      // Picos de chama
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      for (let a = 0; a < 6; a++) {
        const ang = (a * Math.PI) / 3 + (Math.random() * 0.3 - 0.15);
        const len = 35 + Math.random() * 25;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /* ============================================================================
     15. RADAR MINIMAPA DO TERRENO
     ============================================================================ */
  function renderMinimap() {
    if (!minimapCtx) return;
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;

    minimapCtx.clearRect(0, 0, mw, mh);

    const cellW = mw / MAP_W;
    const cellH = mh / MAP_H;

    // Fundo do terreno
    minimapCtx.fillStyle = '#1b331e';
    minimapCtx.fillRect(0, 0, mw, mh);

    // Paredes e Rochas
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = worldMap[y][x];
        if (tile > 0) {
          minimapCtx.fillStyle = tile === 2 ? '#6e4c3e' : '#57606a';
          minimapCtx.fillRect(x * cellW, y * cellH, cellW, cellH);
        }
      }
    }

    // Árvores do cenário (pontos verdes no mapa)
    sceneryProps.forEach((prop) => {
      minimapCtx.fillStyle = prop.type === 'tree' ? '#2d6a1e' : '#3c8b29';
      minimapCtx.fillRect(prop.x * cellW - 1, prop.y * cellH - 1, 3, 3);
    });

    // Inimigos Humanos (Pontos Vermelhos)
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      minimapCtx.fillStyle = '#ef4444';
      minimapCtx.beginPath();
      minimapCtx.arc(enemy.x * cellW, enemy.y * cellH, 2.5, 0, Math.PI * 2);
      minimapCtx.fill();
    });

    // Cone de Visão do Jogador
    minimapCtx.fillStyle = 'rgba(74, 222, 128, 0.25)';
    minimapCtx.beginPath();
    minimapCtx.moveTo(player.x * cellW, player.y * cellH);
    minimapCtx.lineTo((player.x + (player.dirX - player.planeX) * 3) * cellW, (player.y + (player.dirY - player.planeY) * 3) * cellH);
    minimapCtx.lineTo((player.x + (player.dirX + player.planeX) * 3) * cellW, (player.y + (player.dirY + player.planeY) * 3) * cellH);
    minimapCtx.closePath();
    minimapCtx.fill();

    // Posição do Jogador (Ponto Verde com Direção)
    const px = player.x * cellW;
    const py = player.y * cellH;

    minimapCtx.fillStyle = '#22c55e';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 3.5, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.strokeStyle = '#22c55e';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.beginPath();
    minimapCtx.moveTo(px, py);
    minimapCtx.lineTo(px + player.dirX * 5.5, py + player.dirY * 5.5);
    minimapCtx.stroke();
  }

})();
