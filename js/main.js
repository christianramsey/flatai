// Main Application Entry Point

import { initAudio, resumeAudio, initMicrophone, detectPitch, evaluateSingback, stopMicrophone } from './audio.js';
import {
  initUI, showScreen, showNumber, clearDisplay,
  enableInput, disableInput, updatePretestProgress,
  updateResults, updateLevelDisplay, showLevelUp,
  updateSingbackTarget, updateSingbackFeedback,
  onButtonClick
} from './ui.js';
import {
  getSession, createSession, savePreTestResults,
  hasExistingSession, clearSession
} from './storage.js';
import { runPreTest, runTrainingBlock, stopTraining, advanceLevel } from './training.js';
import { LEVELS } from './adaptive.js';

// App state
let session = null;
let isSingbackActive = false;
let singbackInterval = null;

// Initialize application
function init() {
  initUI();

  // Check for existing session
  if (hasExistingSession()) {
    session = getSession();
    updateLevelDisplay(session.level);
    document.getElementById('btn-training').textContent = 'Continue Training';
  } else {
    document.getElementById('btn-training').classList.add('hidden');
  }

  // Setup button handlers
  setupEventHandlers();
}

// Setup event handlers
function setupEventHandlers() {
  // Pre-test button
  document.getElementById('btn-pretest').addEventListener('click', async () => {
    // Initialize audio on user gesture
    initAudio();
    await resumeAudio();

    // Create new session
    session = createSession();

    startPreTest();
  });

  // Training button
  document.getElementById('btn-training').addEventListener('click', async () => {
    initAudio();
    await resumeAudio();

    if (!session) {
      session = getSession();
    }

    if (!session) {
      session = createSession();
    }

    startTraining();
  });

  // Next block button
  document.getElementById('btn-next-block').addEventListener('click', () => {
    startTraining();
  });

  // Continue after level up
  document.getElementById('btn-continue-level').addEventListener('click', () => {
    startTraining();
  });

  // Singback button
  document.getElementById('btn-start-singback').addEventListener('click', async () => {
    if (isSingbackActive) {
      stopSingback();
    } else {
      await startSingback();
    }
  });
}

// Start pre-test
function startPreTest() {
  showScreen('pretest');

  runPreTest(
    // On each trial
    (current, total) => {
      updatePretestProgress(current, total);
    },
    // On complete
    (results) => {
      // Save results
      savePreTestResults(results);
      session = getSession();

      // Show results screen with baseline metrics
      showScreen('results');
      updateResults({
        worstLatency: results.worstLatency,
        worstPitch: results.worstMiss?.pitch,
        floorScore: 12 - results.accuracy,
        floorChange: null
      });

      // Update button text
      document.getElementById('btn-next-block').textContent = 'Start Training';

      // Show training button on start screen
      document.getElementById('btn-training').classList.remove('hidden');
      document.getElementById('btn-training').textContent = 'Continue Training';
    }
  );
}

// Start training
function startTraining() {
  if (!session) {
    session = getSession();
  }

  if (!session) {
    session = createSession();
  }

  updateLevelDisplay(session.level);

  runTrainingBlock(session, (result) => {
    // Refresh session
    session = getSession();

    // Show results
    showScreen('results');
    updateResults(result.metrics);

    // Check for level advancement
    if (result.advancement.shouldAdvance) {
      const newLevelConfig = advanceLevel(session);
      session = getSession();

      // Show level up screen
      setTimeout(() => {
        showLevelUp(session.level, newLevelConfig.description);
        updateLevelDisplay(session.level);
      }, 2000);
    } else {
      // Update button for next block
      document.getElementById('btn-next-block').textContent = 'Next Block';
    }
  });
}

// Start singback test
async function startSingback() {
  const success = await initMicrophone();
  if (!success) {
    alert('Microphone access is required for the sing-back test.');
    return;
  }

  isSingbackActive = true;
  document.getElementById('btn-start-singback').textContent = 'Stop';

  // Select a random pitch from current level
  const levelConfig = LEVELS[session?.level || 1];
  const pitches = levelConfig.pitches;
  const targetPitch = pitches[Math.floor(Math.random() * pitches.length)];

  updateSingbackTarget(targetPitch);
  updateSingbackFeedback('', null);

  // Start pitch detection loop
  singbackInterval = setInterval(() => {
    const detectedHz = detectPitch();
    if (detectedHz) {
      const result = evaluateSingback(detectedHz, targetPitch);
      updateSingbackFeedback(result.result, result.cents);

      if (result.result === 'correct') {
        // Success! Brief celebration then new pitch
        setTimeout(() => {
          if (isSingbackActive) {
            const newPitch = pitches[Math.floor(Math.random() * pitches.length)];
            updateSingbackTarget(newPitch);
            updateSingbackFeedback('', null);
          }
        }, 1000);
      }
    } else {
      updateSingbackFeedback('no_pitch', null);
    }
  }, 100);
}

// Stop singback test
function stopSingback() {
  isSingbackActive = false;
  document.getElementById('btn-start-singback').textContent = 'Start Listening';

  if (singbackInterval) {
    clearInterval(singbackInterval);
    singbackInterval = null;
  }

  stopMicrophone();
  updateSingbackFeedback('', null);
}

// Keyboard shortcut to access singback (press 'S')
document.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen?.id === 'start-screen' || currentScreen?.id === 'results-screen') {
      showScreen('singback');
    }
  }

  // Press Escape to go back to start
  if (e.key === 'Escape') {
    stopTraining();
    stopSingback();
    showScreen('start');
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
