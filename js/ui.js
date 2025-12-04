// UI Module - Screen flash, number display, input handling

// Screen elements
const screens = {
  start: null,
  pretest: null,
  training: null,
  recognition: null,
  rest: null,
  results: null,
  singback: null,
  levelup: null
};

const elements = {
  flashOverlay: null,
  numberPad: null,
  app: null
};

let currentScreen = 'start';
let inputEnabled = false;
let inputCallback = null;
let keydownHandler = null;

// Initialize UI
export function initUI() {
  // Cache screen elements
  screens.start = document.getElementById('start-screen');
  screens.pretest = document.getElementById('pretest-screen');
  screens.training = document.getElementById('training-screen');
  screens.recognition = document.getElementById('recognition-screen');
  screens.rest = document.getElementById('rest-screen');
  screens.results = document.getElementById('results-screen');
  screens.singback = document.getElementById('singback-screen');
  screens.levelup = document.getElementById('levelup-screen');

  elements.flashOverlay = document.getElementById('flash-overlay');
  elements.numberPad = document.getElementById('number-pad');
  elements.app = document.getElementById('app');

  // Setup number pad click handlers
  const numButtons = document.querySelectorAll('.num-btn');
  numButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (inputEnabled && inputCallback) {
        const num = parseInt(btn.dataset.num, 10);
        inputCallback(num);
      }
    });
  });

  // Setup keyboard input
  keydownHandler = (e) => {
    if (!inputEnabled || !inputCallback) return;

    // Handle number keys
    if (e.key >= '0' && e.key <= '9') {
      inputCallback(parseInt(e.key, 10));
    }
    // Handle 'a' or 'A' for 10
    else if (e.key === 'a' || e.key === 'A') {
      inputCallback(10);
    }
    // Handle 'b' or 'B' for 11
    else if (e.key === 'b' || e.key === 'B') {
      inputCallback(11);
    }
  };

  document.addEventListener('keydown', keydownHandler);
}

// Show a specific screen
export function showScreen(screenName) {
  Object.keys(screens).forEach(name => {
    if (screens[name]) {
      screens[name].classList.toggle('active', name === screenName);
    }
  });
  currentScreen = screenName;
}

// Flash the screen (for entrainment)
export function flash(duration = 100) {
  if (!elements.flashOverlay) return;

  elements.flashOverlay.classList.add('flash');

  setTimeout(() => {
    elements.flashOverlay.classList.remove('flash');
  }, duration);
}

// Show number on display
export function showNumber(number, displayId = 'training-display') {
  const display = document.getElementById(displayId);
  if (display) {
    display.textContent = number !== null && number !== undefined ? number : '';
  }
}

// Clear display
export function clearDisplay(displayId = 'training-display') {
  const display = document.getElementById(displayId);
  if (display) {
    display.textContent = '';
  }
}

// Show phase indicator
export function showPhaseIndicator(text) {
  const indicator = document.getElementById('phase-indicator');
  if (indicator) {
    indicator.textContent = text;
  }
}

// Show phase instructions
export function showPhaseInstructions(text) {
  const instructions = document.getElementById('phase-instructions');
  if (instructions) {
    instructions.textContent = text;
  }
}

// Enable/disable number input
export function enableInput(callback) {
  inputEnabled = true;
  inputCallback = callback;
  if (elements.numberPad) {
    elements.numberPad.classList.remove('hidden');
  }
}

export function disableInput() {
  inputEnabled = false;
  inputCallback = null;
  if (elements.numberPad) {
    elements.numberPad.classList.add('hidden');
  }
}

// Show feedback (correct/incorrect border flash)
export function showFeedback(correct, duration = 100) {
  if (!elements.app) return;

  const className = correct ? 'feedback-correct' : 'feedback-incorrect';
  elements.app.classList.add(className);

  setTimeout(() => {
    elements.app.classList.remove(className);
  }, duration);
}

// Update pre-test progress
export function updatePretestProgress(current, total = 12) {
  const trialEl = document.getElementById('pretest-trial');
  if (trialEl) {
    trialEl.textContent = current;
  }
}

// Show pre-test instructions
export function showPretestInstructions(show = true) {
  const el = document.getElementById('pretest-instructions');
  if (el) {
    el.style.visibility = show ? 'visible' : 'hidden';
  }
}

// Update recognition timer visual
export function setTimerDuration(ms) {
  const timer = document.getElementById('recognition-timer');
  if (timer) {
    timer.style.setProperty('--time-limit', `${ms}ms`);
  }
}

export function startTimer() {
  const screen = screens.recognition;
  if (screen) {
    screen.classList.add('timer-active');
  }
}

export function resetTimer() {
  const screen = screens.recognition;
  if (screen) {
    screen.classList.remove('timer-active');
    // Force reflow to restart animation
    void screen.offsetWidth;
  }
}

// Update rest timer display
export function updateRestTimer(seconds) {
  const timer = document.getElementById('rest-timer');
  if (timer) {
    timer.textContent = seconds > 0 ? seconds : '';
  }
}

// Update results screen
export function updateResults(metrics) {
  const latencyEl = document.getElementById('metric-latency');
  const worstPitchEl = document.getElementById('metric-worst-pitch');
  const floorEl = document.getElementById('metric-floor');
  const progressEl = document.getElementById('metric-progress');

  if (latencyEl) {
    latencyEl.textContent = metrics.worstLatency ? `${metrics.worstLatency}ms` : '--';
  }

  if (worstPitchEl) {
    worstPitchEl.textContent = metrics.worstPitch !== null ? metrics.worstPitch : '--';
  }

  if (floorEl) {
    floorEl.textContent = metrics.floorScore !== null ? metrics.floorScore : '--';
  }

  if (progressEl) {
    if (metrics.floorChange !== null && metrics.floorChange !== undefined) {
      if (metrics.floorChange < 0) {
        progressEl.textContent = `Floor score: ${metrics.previousFloor} → ${metrics.floorScore} (improving)`;
        progressEl.parentElement.classList.remove('worse');
      } else if (metrics.floorChange > 0) {
        progressEl.textContent = `Floor score: ${metrics.previousFloor} → ${metrics.floorScore} (regressing)`;
        progressEl.parentElement.classList.add('worse');
      } else {
        progressEl.textContent = `Floor score: ${metrics.floorScore} (stable)`;
        progressEl.parentElement.classList.remove('worse');
      }
    } else {
      progressEl.textContent = '';
    }
  }
}

// Update level display
export function updateLevelDisplay(level) {
  const levelEl = document.getElementById('level-display');
  const containerEl = document.getElementById('current-level');

  if (levelEl) {
    levelEl.textContent = level;
  }

  if (containerEl) {
    containerEl.classList.remove('hidden');
  }
}

// Show level up screen
export function showLevelUp(level, description) {
  const levelEl = document.getElementById('new-level');
  const descEl = document.getElementById('level-description');

  if (levelEl) {
    levelEl.textContent = level;
  }

  if (descEl) {
    descEl.textContent = description;
  }

  showScreen('levelup');
}

// Update singback screen
export function updateSingbackTarget(pitch) {
  const targetEl = document.getElementById('singback-target');
  if (targetEl) {
    targetEl.textContent = pitch;
  }
}

export function updateSingbackFeedback(result, cents) {
  const feedbackEl = document.getElementById('singback-feedback');
  const deviationEl = document.getElementById('singback-deviation');

  if (feedbackEl) {
    switch (result) {
      case 'correct':
        feedbackEl.textContent = 'Correct!';
        feedbackEl.style.color = '#22c55e';
        break;
      case 'close':
        feedbackEl.textContent = 'Close';
        feedbackEl.style.color = '#eab308';
        break;
      case 'incorrect':
        feedbackEl.textContent = 'Try again';
        feedbackEl.style.color = '#ef4444';
        break;
      case 'no_pitch':
        feedbackEl.textContent = 'Sing louder';
        feedbackEl.style.color = '#666';
        break;
      default:
        feedbackEl.textContent = '';
    }
  }

  if (deviationEl) {
    if (cents !== null && cents !== undefined) {
      const direction = cents > 0 ? 'sharp' : 'flat';
      deviationEl.textContent = `${Math.abs(Math.round(cents))} cents ${direction}`;
    } else {
      deviationEl.textContent = '';
    }
  }
}

// Button handlers (return promises)
export function onButtonClick(buttonId) {
  return new Promise(resolve => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      const handler = () => {
        btn.removeEventListener('click', handler);
        resolve();
      };
      btn.addEventListener('click', handler);
    }
  });
}

// Cleanup
export function destroyUI() {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
  }
  inputEnabled = false;
  inputCallback = null;
}
