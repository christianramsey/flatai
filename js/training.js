// Training Module - Block structure and phase logic

import { playTone, initAudio, resumeAudio } from './audio.js';
import {
  showScreen, flash, showNumber, clearDisplay,
  showPhaseIndicator, showPhaseInstructions,
  enableInput, disableInput, showFeedback,
  updateRestTimer, setTimerDuration, startTimer, resetTimer
} from './ui.js';
import {
  LEVELS, calculateBlockMetrics, adaptPerPitch, adaptGlobal,
  checkLevelAdvancement, getPitchChaosLevel, selectNextPitch,
  shuffleArray, getChaoticInterval
} from './adaptive.js';
import { getSession, saveBlockResults, updateLevel } from './storage.js';

// Training state
let currentPhase = null;
let isTraining = false;
let phaseTimeout = null;
let trialTimeout = null;
let currentTrials = [];
let recentPitches = [];

// Phase durations (ms)
const PHASE_DURATIONS = {
  entrainment: 90000,  // 90 seconds
  chaos: 90000,        // 90 seconds
  signalFromNoise: 60000, // 60 seconds
  recognition: 90000,  // 90 seconds
  rest: 30000          // 30 seconds (default, can be adapted)
};

// Stop all training
export function stopTraining() {
  isTraining = false;
  currentPhase = null;

  if (phaseTimeout) {
    clearTimeout(phaseTimeout);
    phaseTimeout = null;
  }
  if (trialTimeout) {
    clearTimeout(trialTimeout);
    trialTimeout = null;
  }

  disableInput();
}

// Run a full training block
export async function runTrainingBlock(session, onComplete) {
  isTraining = true;
  currentTrials = [];
  recentPitches = [];

  const level = session.level;
  const levelConfig = LEVELS[level];
  const activePitches = levelConfig.pitches;
  const globalChaos = session.globalChaos || levelConfig.chaosLevel;

  await resumeAudio();

  // Phase 1: Entrainment
  await runEntrainmentPhase(activePitches, levelConfig.toneDuration);

  if (!isTraining) return;

  // Phase 2: Chaos
  await runChaosPhase(activePitches, levelConfig.toneDuration, globalChaos);

  if (!isTraining) return;

  // Phase 3: Signal from Noise
  await runSignalFromNoisePhase(activePitches, globalChaos);

  if (!isTraining) return;

  // Phase 4: Recognition Test
  await runRecognitionPhase(activePitches, levelConfig, session);

  if (!isTraining) return;

  // Phase 5: Rest
  const restDuration = session.restDuration || 30;
  await runRestPhase(restDuration);

  if (!isTraining) return;

  // Calculate and save results
  const metrics = calculateBlockMetrics(currentTrials, activePitches);

  // Get previous block metrics for comparison
  const previousBlock = session.blocks.length > 0
    ? session.blocks[session.blocks.length - 1]
    : null;
  const previousMetrics = previousBlock?.metrics || null;

  // Adapt per-pitch chaos levels
  adaptPerPitch(metrics, session);

  // Adapt global parameters
  const globalAdaptation = adaptGlobal(metrics, previousMetrics, session);

  // Save block results
  const blockData = {
    blockNumber: session.blocks.length + 1,
    timestamp: Date.now(),
    level: level,
    phases: {
      entrainment: { duration: PHASE_DURATIONS.entrainment },
      chaos: { duration: PHASE_DURATIONS.chaos, globalChaos },
      signalFromNoise: { duration: PHASE_DURATIONS.signalFromNoise },
      recognition: { duration: PHASE_DURATIONS.recognition, trials: currentTrials },
      rest: { duration: restDuration * 1000 }
    },
    metrics: {
      ...metrics,
      floorChange: globalAdaptation.floorChange,
      previousFloor: globalAdaptation.previousFloor
    }
  };

  saveBlockResults(blockData);

  // Check level advancement
  const updatedSession = getSession();
  const advancement = checkLevelAdvancement(updatedSession, metrics);

  isTraining = false;

  if (onComplete) {
    onComplete({
      metrics: blockData.metrics,
      advancement
    });
  }
}

// Phase 1: Entrainment (passive watching, steady 1Hz flash)
async function runEntrainmentPhase(activePitches, toneDuration) {
  return new Promise(resolve => {
    showScreen('training');
    showPhaseIndicator('Entrainment');
    showPhaseInstructions('Watch and listen');
    disableInput();

    const interval = 1000; // 1Hz
    let elapsed = 0;
    const pitches = shuffleArray([...activePitches, ...activePitches, ...activePitches]);
    let pitchIndex = 0;

    const tick = () => {
      if (!isTraining || elapsed >= PHASE_DURATIONS.entrainment) {
        resolve();
        return;
      }

      // Flash and play tone
      const pitch = pitches[pitchIndex % pitches.length];
      flash(100);
      showNumber(pitch, 'training-display');
      playTone(pitch, toneDuration);

      pitchIndex++;
      elapsed += interval;

      phaseTimeout = setTimeout(tick, interval);
    };

    tick();
  });
}

// Phase 2: Chaos (passive watching, random intervals)
async function runChaosPhase(activePitches, toneDuration, chaosLevel) {
  return new Promise(resolve => {
    showScreen('training');
    showPhaseIndicator('Chaos');
    showPhaseInstructions('Watch and listen');
    disableInput();

    let elapsed = 0;
    const pitches = shuffleArray([...activePitches, ...activePitches, ...activePitches]);
    let pitchIndex = 0;

    const tick = () => {
      if (!isTraining || elapsed >= PHASE_DURATIONS.chaos) {
        resolve();
        return;
      }

      // Flash and play tone
      const pitch = pitches[pitchIndex % pitches.length];
      flash(100);
      showNumber(pitch, 'training-display');
      playTone(pitch, toneDuration);

      pitchIndex++;

      // Random interval based on chaos level
      const nextInterval = getChaoticInterval(chaosLevel);
      elapsed += nextInterval;

      phaseTimeout = setTimeout(tick, nextInterval);
    };

    tick();
  });
}

// Phase 3: Signal from Noise (passive, tone emerges from noise)
async function runSignalFromNoisePhase(activePitches, chaosLevel) {
  return new Promise(resolve => {
    showScreen('training');
    showPhaseIndicator('Signal from Noise');
    showPhaseInstructions('Listen for the tone');
    disableInput();

    let elapsed = 0;
    const pitches = shuffleArray([...activePitches, ...activePitches]);
    let pitchIndex = 0;

    const tick = () => {
      if (!isTraining || elapsed >= PHASE_DURATIONS.signalFromNoise) {
        clearDisplay('training-display');
        resolve();
        return;
      }

      const pitch = pitches[pitchIndex % pitches.length];

      // Play tone emerging from noise
      playTone(pitch, 1.5, {
        fromNoise: true,
        noiseLevel: 0.4 + chaosLevel * 0.3,
        emergeDuration: 1.5
      });

      // Show number after tone emerges
      setTimeout(() => {
        if (isTraining) {
          flash(100);
          showNumber(pitch, 'training-display');
        }
      }, 1500);

      pitchIndex++;

      // Interval includes emergence time
      const nextInterval = 3000 + getChaoticInterval(chaosLevel);
      elapsed += nextInterval;

      phaseTimeout = setTimeout(tick, nextInterval);
    };

    tick();
  });
}

// Phase 4: Recognition Test (active responding)
async function runRecognitionPhase(activePitches, levelConfig, session) {
  return new Promise(resolve => {
    showScreen('recognition');
    showPhaseIndicator('Recognition Test');
    disableInput();

    const timeLimit = levelConfig.timeLimit;
    setTimerDuration(timeLimit);

    let elapsed = 0;
    const trialsPerPitch = Math.ceil(PHASE_DURATIONS.recognition / (timeLimit + 1000) / activePitches.length);
    const totalTrials = activePitches.length * trialsPerPitch;
    let trialCount = 0;

    const runTrial = () => {
      if (!isTraining || trialCount >= totalTrials || elapsed >= PHASE_DURATIONS.recognition) {
        disableInput();
        clearDisplay('recognition-display');
        resolve();
        return;
      }

      // Select next pitch (weighted by priority)
      const pitch = selectNextPitch(activePitches, session, recentPitches.slice(-3));
      recentPitches.push(pitch);

      // Get pitch-specific chaos level
      const pitchChaos = getPitchChaosLevel(pitch, session);

      // Clear display
      clearDisplay('recognition-display');
      resetTimer();

      // Play tone (optionally from noise based on chaos)
      const useNoise = pitchChaos > 0.5 && Math.random() < pitchChaos;
      playTone(pitch, levelConfig.toneDuration, {
        fromNoise: useNoise,
        noiseLevel: pitchChaos * 0.4,
        emergeDuration: useNoise ? 1.0 : 0
      });

      const toneStartTime = performance.now();
      let responded = false;

      // Start timer animation
      startTimer();

      // Enable input
      enableInput((response) => {
        if (responded) return;
        responded = true;

        const latency = performance.now() - toneStartTime;
        const correct = response === pitch;

        // Record trial
        currentTrials.push({
          pitch,
          response,
          latency: Math.round(latency),
          correct,
          timeout: false,
          chaos: pitchChaos
        });

        // Show feedback
        showFeedback(correct, 100);

        // Show correct answer briefly
        setTimeout(() => {
          showNumber(pitch, 'recognition-display');
        }, 100);

        // Clear and continue
        if (trialTimeout) clearTimeout(trialTimeout);

        setTimeout(() => {
          disableInput();
          trialCount++;
          elapsed += latency + 500;
          runTrial();
        }, 500);
      });

      // Timeout handler
      trialTimeout = setTimeout(() => {
        if (responded) return;
        responded = true;

        // Record timeout as worst performance
        currentTrials.push({
          pitch,
          response: null,
          latency: timeLimit,
          correct: false,
          timeout: true,
          chaos: pitchChaos
        });

        showFeedback(false, 100);
        showNumber(pitch, 'recognition-display');

        setTimeout(() => {
          disableInput();
          trialCount++;
          elapsed += timeLimit + 500;
          runTrial();
        }, 500);
      }, timeLimit);
    };

    // Small delay before first trial
    setTimeout(() => {
      enableInput(() => {}); // Enable to show pad
      runTrial();
    }, 500);
  });
}

// Phase 5: Rest
async function runRestPhase(durationSeconds) {
  return new Promise(resolve => {
    showScreen('rest');
    disableInput();

    let remaining = durationSeconds;
    updateRestTimer(remaining);

    const tick = () => {
      if (!isTraining || remaining <= 0) {
        resolve();
        return;
      }

      remaining--;
      updateRestTimer(remaining);

      phaseTimeout = setTimeout(tick, 1000);
    };

    phaseTimeout = setTimeout(tick, 1000);
  });
}

// Run pre-test
export async function runPreTest(onTrialComplete, onComplete) {
  await resumeAudio();

  showScreen('pretest');
  disableInput();

  const pitches = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const trials = [];
  let trialIndex = 0;

  const timeLimit = 3000; // 3 seconds

  const runTrial = () => {
    if (trialIndex >= 12) {
      // Calculate baseline metrics
      const correctTrials = trials.filter(t => t.correct);
      const accuracy = correctTrials.length;
      const worstLatency = correctTrials.length > 0
        ? Math.max(...correctTrials.map(t => t.latency))
        : null;

      // Find worst miss
      const incorrectTrials = trials.filter(t => !t.correct);
      let worstMiss = null;
      if (incorrectTrials.length > 0) {
        // Find the one with largest error
        incorrectTrials.forEach(t => {
          const error = t.response !== null
            ? Math.min(Math.abs(t.pitch - t.response), 12 - Math.abs(t.pitch - t.response))
            : 12;
          if (!worstMiss || error > worstMiss.error) {
            worstMiss = { pitch: t.pitch, response: t.response, error };
          }
        });
      }

      const results = {
        trials,
        accuracy,
        worstLatency,
        worstMiss
      };

      disableInput();
      if (onComplete) onComplete(results);
      return;
    }

    const pitch = pitches[trialIndex];

    // Update progress
    if (onTrialComplete) {
      onTrialComplete(trialIndex + 1, 12);
    }

    // Clear display
    clearDisplay('pretest-display');

    // Play tone
    setTimeout(() => {
      playTone(pitch, 1.0);

      const toneStartTime = performance.now();
      let responded = false;

      enableInput((response) => {
        if (responded) return;
        responded = true;

        const latency = performance.now() - toneStartTime;
        const correct = response === pitch;

        trials.push({
          pitch,
          response,
          latency: Math.round(latency),
          correct,
          timeout: false
        });

        disableInput();

        // Brief pause then next trial
        setTimeout(() => {
          trialIndex++;
          runTrial();
        }, 500);
      });

      // Timeout
      setTimeout(() => {
        if (responded) return;
        responded = true;

        trials.push({
          pitch,
          response: null,
          latency: timeLimit,
          correct: false,
          timeout: true
        });

        disableInput();

        setTimeout(() => {
          trialIndex++;
          runTrial();
        }, 500);
      }, timeLimit);
    }, 500);
  };

  // Start first trial
  enableInput(() => {});
  runTrial();
}

// Advance to next level
export function advanceLevel(session) {
  const newLevel = Math.min(5, session.level + 1);
  updateLevel(newLevel);
  return LEVELS[newLevel];
}
