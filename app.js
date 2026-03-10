// Default Sequence
const DEFAULT_SEQUENCE = [
    { type: 'work', duration: 25 },
    { type: 'break', duration: 5 },
    { type: 'work', duration: 25 },
    { type: 'break', duration: 5 },
    { type: 'work', duration: 25 },
    { type: 'break', duration: 5 },
    { type: 'work', duration: 25 },
    { type: 'break', duration: 30 }
];

// UI Elements
const timeLeftDisplay = document.getElementById('time-left');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const progressBar = document.getElementById('progress-bar');
const statusLabel = document.getElementById('status-label');
const sessionNameDisplay = document.getElementById('session-name');
const sessionDescPreview = document.getElementById('session-desc-preview');
const body = document.body;
const glassCard = document.querySelector('.glass-card');

// Modal Elements
const settingsBtn = document.getElementById('settings-btn');
const sessionInfoClickable = document.getElementById('session-info-clickable');
const sessionModal = document.getElementById('session-modal');
const saveSessionBtn = document.getElementById('save-session-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsModal = document.getElementById('close-settings-modal');
const historyList = document.getElementById('history-list');
const sequenceList = document.getElementById('sequence-list');
const addStepBtn = document.getElementById('add-step-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Input Elements
const inputSessionName = document.getElementById('input-session-name');
const inputSessionDesc = document.getElementById('input-session-desc');

// Sequence State
let timerSequence = JSON.parse(localStorage.getItem('timerSequence')) || DEFAULT_SEQUENCE;
let currentStepIndex = parseInt(localStorage.getItem('currentStepIndex')) || 0;

let currentStep = timerSequence[currentStepIndex];
let timeLeft = currentStep.duration * 60;
let timerId = null;
let sessionsCompleted = parseInt(localStorage.getItem('sessionsCompleted')) || 0;
let sessionHistory = JSON.parse(localStorage.getItem('sessionHistory')) || [];
let startTime = null;
let expectedTimeLeft = timeLeft;

let currentSession = {
    name: localStorage.getItem('currentSessionName') || `Session #${sessionsCompleted + 1}`,
    description: localStorage.getItem('currentSessionDesc') || ""
};

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

    const displayType = currentStep.type === 'work' ? 'Work' : 'Break';
    document.title = `${timeString} - ${displayType}`;
    statusLabel.textContent = `${displayType} Session`;

    const totalTime = currentStep.duration * 60;
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
    currentStepIndex = 0;
    currentStep = timerSequence[currentStepIndex];
    timeLeft = currentStep.duration * 60;
    updateDisplay();
    updateTheme();
    startBtn.querySelector('span').textContent = 'Start';
    updateSessionUI();
}

// Modal Logic
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function updateSessionUI() {
    sessionNameDisplay.textContent = currentSession.name || `Session #${sessionsCompleted + 1}`;
    sessionDescPreview.textContent = currentSession.description || "Add a description...";

    // Update inputs as well if modal is open
    inputSessionName.value = currentSession.name;
    inputSessionDesc.value = currentSession.description;
}

function saveSessionDetails() {
    currentSession.name = inputSessionName.value.trim() || `Session #${sessionsCompleted + 1}`;
    currentSession.description = inputSessionDesc.value.trim();

    localStorage.setItem('currentSessionName', currentSession.name);
    localStorage.setItem('currentSessionDesc', currentSession.description);

    updateSessionUI();
    closeModal(sessionModal);
}

function saveToHistory() {
    const sessionData = {
        name: currentSession.name,
        description: currentSession.description,
        timestamp: new Date().toLocaleString('de-DE'),
        type: currentStep.type === 'work' ? 'Work' : 'Break',
        duration: currentStep.duration * 60
    };

    sessionHistory.unshift(sessionData);
    if (sessionHistory.length > 50) sessionHistory.pop(); // Keep last 50

    localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));
}

function renderHistory() {
    if (sessionHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No sessions recorded yet.</div>';
        return;
    }

    historyList.innerHTML = sessionHistory.map((session, index) => `
        <div class="history-item" style="animation-delay: ${index * 0.05}s">
            <div class="history-item-header">
                <span class="history-item-title">${session.name}</span>
                <span class="history-item-date">${session.timestamp}</span>
            </div>
            ${session.description ? `<p class="history-item-desc">${session.description}</p>` : ''}
        </div>
    `).join('');
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

    const isLastStep = currentStepIndex === timerSequence.length - 1;
    const title = currentStep.type === 'work' ? "Work Session Over!" : "Break Over!";
    const msg = isLastStep ? "Sequence completed! Starting over." : "Ready for the next step?";
    sendNotification(title, msg);

    // Visual Alert
    glassCard.classList.add('alert-anim');
    setTimeout(() => glassCard.classList.remove('alert-anim'), 1500);

    // Save before switching (only if it was a work session)
    if (currentStep.type === 'work') {
        saveToHistory();
        createConfetti();
        sessionsCompleted++;
        localStorage.setItem('sessionsCompleted', sessionsCompleted);
    }

    // Advance Sequence
    currentStepIndex = (currentStepIndex + 1) % timerSequence.length;
    localStorage.setItem('currentStepIndex', currentStepIndex);
    currentStep = timerSequence[currentStepIndex];
    timeLeft = currentStep.duration * 60;

    updateTheme();
    updateDisplay();

    // Reset current session name for next work session if it was a default one
    if (currentStep.type === 'work') {
        currentSession.name = `Session #${sessionsCompleted + 1}`;
        currentSession.description = "";
        localStorage.removeItem('currentSessionName');
        localStorage.removeItem('currentSessionDesc');
    }

    startBtn.disabled = false;
    startBtn.style.display = 'flex';
    pauseBtn.disabled = true;
    pauseBtn.style.display = 'none';
    startBtn.querySelector('span').textContent = 'Start ' + (currentStep.type === 'work' ? 'Work' : 'Break');
    updateSessionUI();
}

function updateTheme() {
    if (currentStep.type === 'work') {
        body.classList.remove('break-mode');
        body.classList.add('work-mode');
    } else {
        body.classList.remove('work-mode');
        body.classList.add('break-mode');
    }
}

// Sequence Management
let draggedItemIndex = null;

function renderSequence() {
    sequenceList.innerHTML = timerSequence.map((step, index) => `
        <div class="sequence-item" data-index="${index}" data-type="${step.type}" draggable="true" 
            ondragstart="dragStart(event, ${index})" 
            ondragover="dragOver(event)" 
            ondragenter="dragEnter(event)" 
            ondragleave="dragLeave(event)" 
            ondrop="drop(event, ${index})" 
            ondragend="dragEnd(event)">
            <div class="sequence-item-drag">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
            </div>
            <div class="sequence-item-type">
                <select draggable="false" onchange="updateStep(${index}, 'type', this.value)">
                    <option value="work" ${step.type === 'work' ? 'selected' : ''}>Focus</option>
                    <option value="break" ${step.type === 'break' ? 'selected' : ''}>Break</option>
                </select>
            </div>
            <div class="sequence-item-duration">
                <input type="number" draggable="false" value="${step.duration}" min="1" max="1440" 
                    onfocus="this.select()"
                    onchange="updateStep(${index}, 'duration', parseInt(this.value))">
                <span>min</span>
            </div>
            <div class="sequence-item-actions">
                <button class="btn-icon btn-delete" onclick="deleteStep(${index})">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

window.dragStart = function (e, index) {
    draggedItemIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('dragging'), 0);
};

window.dragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
};

window.dragEnter = function (e) {
    e.preventDefault();
    const target = e.currentTarget;
    if (target.classList && target.classList.contains('sequence-item')) {
        target.classList.add('drag-over');
    }
};

window.dragLeave = function (e) {
    const target = e.currentTarget;
    if (target.classList && target.classList.contains('sequence-item')) {
        target.classList.remove('drag-over');
    }
};

window.drop = function (e, dropIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    // Remove item from old position
    const item = timerSequence.splice(draggedItemIndex, 1)[0];
    // Insert item at new position
    timerSequence.splice(dropIndex, 0, item);

    localStorage.setItem('timerSequence', JSON.stringify(timerSequence));

    // Update currentStepIndex if affected
    if (currentStepIndex === draggedItemIndex) {
        currentStepIndex = dropIndex;
    } else if (draggedItemIndex < currentStepIndex && dropIndex >= currentStepIndex) {
        currentStepIndex--;
    } else if (draggedItemIndex > currentStepIndex && dropIndex <= currentStepIndex) {
        currentStepIndex++;
    }
    localStorage.setItem('currentStepIndex', currentStepIndex);

    currentStep = timerSequence[currentStepIndex];

    renderSequence();
    updateDisplay();
};

window.dragEnd = function (e) {
    e.target.classList.remove('dragging');
    draggedItemIndex = null;
    const items = document.querySelectorAll('.sequence-item');
    items.forEach(item => item.classList.remove('drag-over'));
};

window.updateStep = function (index, field, value) {
    timerSequence[index][field] = value;
    localStorage.setItem('timerSequence', JSON.stringify(timerSequence));

    // If we're currently on this step, update the timer immediately
    if (index === currentStepIndex) {
        currentStep = timerSequence[currentStepIndex];
        if (!timerId) {
            timeLeft = currentStep.duration * 60;
            updateDisplay();
        }
    }
};

window.deleteStep = function (index) {
    if (timerSequence.length <= 1) return;
    timerSequence.splice(index, 1);

    if (currentStepIndex >= timerSequence.length) {
        currentStepIndex = 0;
    }

    localStorage.setItem('timerSequence', JSON.stringify(timerSequence));
    localStorage.setItem('currentStepIndex', currentStepIndex);

    currentStep = timerSequence[currentStepIndex];
    if (!timerId) {
        timeLeft = currentStep.duration * 60;
    }

    renderSequence();
    updateDisplay();
};

addStepBtn.addEventListener('click', () => {
    const lastType = timerSequence[timerSequence.length - 1].type;
    const newType = lastType === 'work' ? 'break' : 'work';
    const newDuration = newType === 'work' ? 25 : 5;

    timerSequence.push({ type: newType, duration: newDuration });
    localStorage.setItem('timerSequence', JSON.stringify(timerSequence));
    renderSequence();
    updateDisplay(); // For the step counter
});

// Tab Switching
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');

        if (tab === 'history') renderHistory();
        if (tab === 'sequence') renderSequence();
    });
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName.toUpperCase());
    if (isInput) return;

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
updateSessionUI();
renderSequence();

// Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

sessionInfoClickable.addEventListener('click', () => {
    inputSessionName.value = currentSession.name;
    inputSessionDesc.value = currentSession.description;
    openModal(sessionModal);
});

settingsBtn.addEventListener('click', () => {
    // Open default tab
    tabButtons[0].click();
    openModal(settingsModal);
});

closeSettingsModal.addEventListener('click', () => closeModal(settingsModal));
saveSessionBtn.addEventListener('click', saveSessionDetails);
document.getElementById('close-session-modal').addEventListener('click', () => closeModal(sessionModal));

// Close modals on overlay click
[sessionModal, settingsModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

