// Constants & Configuration
const WORK_TIME = 50 * 60; // 50 minutes in seconds
const BREAK_TIME = 10 * 60; // 10 minutes in seconds

// UI Elements
const timeLeftDisplay = document.getElementById('time-left');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const progressBar = document.getElementById('progress-bar');
const statusLabel = document.getElementById('status-label');
const sessionCounter = document.getElementById('session-counter');
const body = document.body;
const glassCard = document.querySelector('.glass-card');

// State Variables
let timeLeft = WORK_TIME;
let timerId = null;
let isWorkSession = true;
let sessionsCompleted = parseInt(localStorage.getItem('sessionsCompleted')) || 0;
let startTime = null;
let expectedTimeLeft = WORK_TIME;

// Progress Ring Setup
const radius = progressBar.r.baseVal.value;
const circumference = 2 * Math.PI * radius;
progressBar.style.strokeDasharray = `${circumference} ${circumference}`;
progressBar.style.strokeDashoffset = 0;

function setProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    progressBar.style.strokeDashoffset = offset;
}

// Sound System (Web Audio API)
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBingSound() {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // Slide to A4

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1);
}

// Browser Notifications
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function sendNotification(title, bodyText) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: bodyText, icon: "favicon.ico" });
    }
}

// Timer Logic
function updateDisplay() {
    const minutes = Math.floor(Math.max(0, timeLeft) / 60);
    const seconds = Math.max(0, timeLeft) % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timeLeftDisplay.textContent = timeString;
    document.title = `${timeString} - ${isWorkSession ? 'Work' : 'Break'}`;

    const totalTime = isWorkSession ? WORK_TIME : BREAK_TIME;
    const percent = ((totalTime - timeLeft) / totalTime) * 100;
    setProgress(percent);
}

function startTimer() {
    initAudio();
    requestNotificationPermission();

    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (!timerId) {
        startTime = Date.now();
        expectedTimeLeft = timeLeft;

        timerId = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            timeLeft = expectedTimeLeft - elapsed;

            updateDisplay();

            if (timeLeft <= 0) {
                handleSessionEnd();
            }
        }, 100); // Check more frequently for better precision, but display updates at 1s intervals effectively
    }

    startBtn.disabled = true;
    startBtn.style.display = 'none';
    pauseBtn.disabled = false;
    pauseBtn.style.display = 'flex';
}

function pauseTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }

    startBtn.disabled = false;
    startBtn.style.display = 'flex';
    pauseBtn.disabled = true;
    pauseBtn.style.display = 'none';
    startBtn.querySelector('span').textContent = 'Resume';
}

function resetTimer() {
    pauseTimer();
    isWorkSession = true;
    timeLeft = WORK_TIME;
    updateDisplay();
    updateTheme();
    startBtn.querySelector('span').textContent = 'Start';
    sessionCounter.textContent = `Session #${sessionsCompleted + 1}`;
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#bb86fc', '#03dac6', '#3700b3', '#cf6679', '#ffffff'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.opacity = Math.random();

        container.appendChild(confetti);

        // Cleanup after animation
        setTimeout(() => confetti.remove(), 5000);
    }
}

function handleSessionEnd() {
    clearInterval(timerId);
    timerId = null;

    playBingSound();

    const title = isWorkSession ? "Work Session Over!" : "Break Over!";
    const msg = isWorkSession ? "Time for a 10-minute break." : "Ready to focus again?";
    sendNotification(title, msg);

    // Visual Alert
    glassCard.classList.add('alert-anim');
    setTimeout(() => glassCard.classList.remove('alert-anim'), 1500);

    if (isWorkSession) {
        createConfetti();
        sessionsCompleted++;
        localStorage.setItem('sessionsCompleted', sessionsCompleted);
        isWorkSession = false;
        timeLeft = BREAK_TIME;
        statusLabel.textContent = 'Break Time!';
    } else {
        isWorkSession = true;
        timeLeft = WORK_TIME;
        statusLabel.textContent = 'Work Session';
    }

    updateTheme();
    updateDisplay();

    startBtn.disabled = false;
    startBtn.style.display = 'flex';
    pauseBtn.disabled = true;
    pauseBtn.style.display = 'none';
    startBtn.querySelector('span').textContent = 'Start ' + (isWorkSession ? 'Work' : 'Break');
    sessionCounter.textContent = `Session #${sessionsCompleted + 1}`;
}

function updateTheme() {
    if (isWorkSession) {
        body.classList.remove('break-mode');
        body.classList.add('work-mode');
    } else {
        body.classList.remove('work-mode');
        body.classList.add('break-mode');
    }
}

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (timerId) pauseTimer();
        else startTimer();
    } else if (e.code === 'Escape') {
        resetTimer();
    }
});

// Initial Call
updateDisplay();
updateTheme();
sessionCounter.textContent = `Session #${sessionsCompleted + 1}`;

// Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

