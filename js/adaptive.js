// Adaptive Algorithm - Worst Performance Rule implementation

import { updatePitchHistory, updateGlobalParams, getSession } from './storage.js';

// Thresholds
const ACCURACY_HIGH = 0.8;
const ACCURACY_LOW = 0.5;
const LATENCY_HIGH = 1000; // ms
const LATENCY_LOW = 600; // ms
const CHAOS_ACCURACY_HIGH = 0.7;

// Level definitions
export const LEVELS = {
  1: {
    pitches: [0, 4, 7, 9], // C, E, G, A (four pitches)
    timeLimit: 2000,
    chaosLevel: 0.3,
    toneDuration: 1.5,
    description: 'Four basic pitches (C, E, G, A)'
  },
  2: {
    pitches: [0, 2, 4, 7, 9, 11], // C, D, E, G, A, B (six)
    timeLimit: 1500,
    chaosLevel: 0.5,
    toneDuration: 1.0,
    description: 'Six pitches with tighter timing'
  },
  3: {
    pitches: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All 12
    timeLimit: 1500,
    chaosLevel: 0.5,
    toneDuration: 1.0,
    description: 'All 12 pitches'
  },
  4: {
    pitches: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    timeLimit: 1000,
    chaosLevel: 0.7,
    toneDuration: 0.75,
    description: 'All 12 pitches with high chaos'
  },
  5: {
    pitches: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    timeLimit: 1000,
    chaosLevel: 0.9,
    toneDuration: 0.5,
    description: 'Master level - all pitches, maximum chaos'
  }
};

// Calculate block metrics (floor-focused)
export function calculateBlockMetrics(trials, activePitches) {
  if (!trials || trials.length === 0) {
    return {
      floorScore: activePitches.length,
      worstLatency: null,
      worstPitch: null,
      pitchStats: {}
    };
  }

  // Per-pitch stats
  const pitchStats = {};
  activePitches.forEach(pitch => {
    pitchStats[pitch] = {
      attempts: 0,
      correct: 0,
      latencies: [],
      worstLatency: 0,
      chaosAccuracy: 0
    };
  });

  // Process trials
  let worstLatency = 0;
  let floorScore = 0;

  trials.forEach(trial => {
    const stats = pitchStats[trial.pitch];
    if (!stats) return;

    stats.attempts++;

    if (trial.correct) {
      stats.correct++;
      stats.latencies.push(trial.latency);
      if (trial.latency > stats.worstLatency) {
        stats.worstLatency = trial.latency;
      }
      if (trial.latency > worstLatency) {
        worstLatency = trial.latency;
      }
    }

    // Count floor score: trials with latency > 1000ms OR incorrect
    if (!trial.correct || trial.latency > 1000) {
      floorScore++;
    }
  });

  // Calculate accuracy per pitch
  Object.keys(pitchStats).forEach(pitch => {
    const stats = pitchStats[pitch];
    stats.accuracy = stats.attempts > 0 ? stats.correct / stats.attempts : 0;
  });

  // Find worst pitch (lowest accuracy, or highest latency if tied)
  let worstPitch = null;
  let worstAccuracy = 1;
  let worstPitchLatency = 0;

  Object.keys(pitchStats).forEach(pitch => {
    const stats = pitchStats[pitch];
    if (stats.attempts === 0) return;

    if (stats.accuracy < worstAccuracy ||
        (stats.accuracy === worstAccuracy && stats.worstLatency > worstPitchLatency)) {
      worstAccuracy = stats.accuracy;
      worstPitchLatency = stats.worstLatency;
      worstPitch = parseInt(pitch, 10);
    }
  });

  return {
    trials,
    floorScore,
    worstLatency: worstLatency > 0 ? Math.round(worstLatency) : null,
    worstPitch,
    pitchStats
  };
}

// Apply adaptation rules based on block metrics
export function adaptPerPitch(metrics, session) {
  const { pitchStats } = metrics;
  const updates = {};

  Object.keys(pitchStats).forEach(pitchStr => {
    const pitch = parseInt(pitchStr, 10);
    const stats = pitchStats[pitch];
    if (stats.attempts === 0) return;

    const pitchHistory = session.pitchHistory[pitch];
    let currentChaos = pitchHistory?.currentChaosLevel || 0.3;
    let priority = 'medium';

    const accuracy = stats.accuracy;
    const latency = stats.worstLatency;
    const isHighAccuracy = accuracy >= ACCURACY_HIGH;
    const isLowAccuracy = accuracy < ACCURACY_LOW;
    const isHighLatency = latency > LATENCY_HIGH;
    const isLowLatency = latency < LATENCY_LOW;

    if (isHighAccuracy && isLowLatency) {
      // Looks solid—but might be fragile strategy
      // ATTACK IT: increase chaos on this pitch next block
      currentChaos = Math.min(1.0, currentChaos + 0.1);
      priority = 'probe';
    } else if (isHighAccuracy && isHighLatency) {
      // Thinking, not recognition—fragile
      // Increase chaos to destroy thinking path
      currentChaos = Math.min(1.0, currentChaos + 0.2);
      priority = 'high';
    } else if (isLowAccuracy && isHighLatency) {
      // Still destroying, not yet consolidated
      // Maintain chaos, keep destroying
      priority = 'medium';
    } else if (isLowAccuracy && isLowLatency) {
      // Fast and wrong—overchaos, system guessing
      // Back off chaos slightly
      currentChaos = Math.max(0.1, currentChaos - 0.1);
      priority = 'low';
    }

    updates[pitch] = {
      currentChaosLevel: currentChaos,
      priority,
      attempt: stats.correct > 0,
      latency: stats.worstLatency,
      chaosAccuracy: accuracy
    };
  });

  // Apply updates to storage
  Object.keys(updates).forEach(pitch => {
    updatePitchHistory(parseInt(pitch, 10), updates[pitch]);
  });

  return updates;
}

// Adapt global parameters based on floor score progression
export function adaptGlobal(currentMetrics, previousMetrics, session) {
  let globalChaos = session.globalChaos || 0.3;
  let restDuration = session.restDuration || 30;
  let consecutiveGoodBlocks = session.consecutiveGoodBlocks || 0;

  const currentFloor = currentMetrics.floorScore;
  const previousFloor = previousMetrics?.floorScore;

  if (previousFloor !== undefined && previousFloor !== null) {
    if (currentFloor < previousFloor) {
      // Floor is rising (lower score = better)—protocol is working
      // Slightly increase overall difficulty
      globalChaos = Math.min(1.0, globalChaos + 0.05);
      consecutiveGoodBlocks++;
    } else if (currentFloor > previousFloor) {
      // Floor got worse—too much destruction, not enough consolidation
      // Extend rest phase, reduce chaos
      restDuration = Math.min(90, restDuration + 15);
      globalChaos = Math.max(0.1, globalChaos - 0.1);
      consecutiveGoodBlocks = 0;
    } else {
      // Unchanged
      consecutiveGoodBlocks = 0;
    }
  }

  updateGlobalParams({
    globalChaos,
    restDuration,
    consecutiveGoodBlocks
  });

  return {
    globalChaos,
    restDuration,
    consecutiveGoodBlocks,
    floorChange: previousFloor !== undefined ? currentFloor - previousFloor : null,
    previousFloor
  };
}

// Check if user should advance to next level
export function checkLevelAdvancement(session, currentMetrics) {
  const level = session.level;
  const levelConfig = LEVELS[level];

  if (!levelConfig || level >= 5) {
    return { shouldAdvance: false, reason: 'max_level' };
  }

  // Advancement criteria:
  // - Worst latency < 800ms (all correct answers were fast)
  // - Floor score < 2 (at most 1 bad trial per block)
  // - Sustained for 2 consecutive blocks

  const worstLatency = currentMetrics.worstLatency;
  const floorScore = currentMetrics.floorScore;
  const consecutiveGood = session.consecutiveGoodBlocks || 0;

  const meetsLatency = worstLatency !== null && worstLatency < 800;
  const meetsFloor = floorScore < 2;
  const meetsSustained = consecutiveGood >= 2;

  if (meetsLatency && meetsFloor && meetsSustained) {
    return {
      shouldAdvance: true,
      newLevel: level + 1,
      reason: 'criteria_met'
    };
  }

  return {
    shouldAdvance: false,
    reason: 'criteria_not_met',
    progress: {
      latency: { current: worstLatency, target: 800, met: meetsLatency },
      floor: { current: floorScore, target: 2, met: meetsFloor },
      sustained: { current: consecutiveGood, target: 2, met: meetsSustained }
    }
  };
}

// Get chaos level for a specific pitch (for training)
export function getPitchChaosLevel(pitch, session) {
  const pitchHistory = session.pitchHistory?.[pitch];
  const baseChaos = pitchHistory?.currentChaosLevel || 0.3;
  const globalChaos = session.globalChaos || 0.3;

  // Combine pitch-specific and global chaos
  return Math.min(1.0, (baseChaos + globalChaos) / 2);
}

// Get pitch priority for trial selection
export function getPitchPriority(pitch, session) {
  const pitchHistory = session.pitchHistory?.[pitch];
  return pitchHistory?.priority || 'medium';
}

// Select next pitch for training (weighted by priority)
export function selectNextPitch(activePitches, session, recentPitches = []) {
  // Weight pitches by priority
  const weights = {
    high: 4,
    probe: 3,
    medium: 2,
    low: 1
  };

  // Build weighted pool, excluding recent pitches
  const pool = [];
  activePitches.forEach(pitch => {
    if (recentPitches.includes(pitch)) return;

    const priority = getPitchPriority(pitch, session);
    const weight = weights[priority] || 2;

    for (let i = 0; i < weight; i++) {
      pool.push(pitch);
    }
  });

  // If pool is empty (all recent), just use active pitches
  if (pool.length === 0) {
    return activePitches[Math.floor(Math.random() * activePitches.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// Shuffle array (Fisher-Yates)
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate random interval for chaos phase
export function getChaoticInterval(chaosLevel) {
  // Base interval is 1s, chaos makes it vary from 0.3s to 2.0s
  const minInterval = 300;
  const maxInterval = 2000;
  const baseInterval = 1000;

  const variance = (maxInterval - minInterval) * chaosLevel;
  const min = Math.max(minInterval, baseInterval - variance / 2);
  const max = Math.min(maxInterval, baseInterval + variance / 2);

  return min + Math.random() * (max - min);
}
