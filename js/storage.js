// Storage Module - Session persistence using localStorage

const STORAGE_KEY = 'pitch_trainer_session';
const HISTORY_KEY = 'pitch_trainer_history';

// Default session structure
function createDefaultSession() {
  return {
    userId: generateUserId(),
    startTime: Date.now(),
    level: 1,
    currentBlock: 0,
    preTestComplete: false,
    preTestResults: null,
    blocks: [],
    pitchHistory: initPitchHistory(),
    consecutiveGoodBlocks: 0,
    globalChaos: 0.3,
    restDuration: 30
  };
}

// Generate simple user ID
function generateUserId() {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Initialize pitch history structure
function initPitchHistory() {
  const history = {};
  for (let i = 0; i < 12; i++) {
    history[i] = {
      attempts: [],
      latencies: [],
      chaosLevels: [],
      chaosAccuracy: [],
      currentChaosLevel: 0.3,
      priority: 'medium'
    };
  }
  return history;
}

// Get current session
export function getSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      // Ensure pitch history exists
      if (!session.pitchHistory) {
        session.pitchHistory = initPitchHistory();
      }
      return session;
    }
  } catch (e) {
    console.error('Error loading session:', e);
  }
  return null;
}

// Save session
export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch (e) {
    console.error('Error saving session:', e);
    return false;
  }
}

// Create new session
export function createSession() {
  const session = createDefaultSession();
  saveSession(session);
  return session;
}

// Clear session
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Error clearing session:', e);
    return false;
  }
}

// Update session field
export function updateSession(updates) {
  const session = getSession();
  if (!session) return null;

  const updated = { ...session, ...updates };
  saveSession(updated);
  return updated;
}

// Save pre-test results
export function savePreTestResults(results) {
  return updateSession({
    preTestComplete: true,
    preTestResults: results
  });
}

// Save block results
export function saveBlockResults(blockData) {
  const session = getSession();
  if (!session) return null;

  session.blocks.push(blockData);
  session.currentBlock = session.blocks.length;

  saveSession(session);
  return session;
}

// Update pitch history
export function updatePitchHistory(pitchNumber, data) {
  const session = getSession();
  if (!session || !session.pitchHistory) return null;

  const pitchData = session.pitchHistory[pitchNumber];
  if (!pitchData) return null;

  if (data.attempt !== undefined) {
    pitchData.attempts.push(data.attempt);
  }
  if (data.latency !== undefined) {
    pitchData.latencies.push(data.latency);
  }
  if (data.chaosLevel !== undefined) {
    pitchData.chaosLevels.push(data.chaosLevel);
  }
  if (data.chaosAccuracy !== undefined) {
    pitchData.chaosAccuracy.push(data.chaosAccuracy);
  }
  if (data.currentChaosLevel !== undefined) {
    pitchData.currentChaosLevel = data.currentChaosLevel;
  }
  if (data.priority !== undefined) {
    pitchData.priority = data.priority;
  }

  saveSession(session);
  return session;
}

// Update level
export function updateLevel(newLevel) {
  return updateSession({ level: newLevel });
}

// Update global parameters
export function updateGlobalParams(params) {
  const session = getSession();
  if (!session) return null;

  if (params.globalChaos !== undefined) {
    session.globalChaos = Math.max(0.1, Math.min(1.0, params.globalChaos));
  }
  if (params.restDuration !== undefined) {
    session.restDuration = Math.max(15, Math.min(90, params.restDuration));
  }
  if (params.consecutiveGoodBlocks !== undefined) {
    session.consecutiveGoodBlocks = params.consecutiveGoodBlocks;
  }

  saveSession(session);
  return session;
}

// Get pitch stats for a specific pitch
export function getPitchStats(pitchNumber) {
  const session = getSession();
  if (!session || !session.pitchHistory) return null;

  const pitchData = session.pitchHistory[pitchNumber];
  if (!pitchData) return null;

  const attempts = pitchData.attempts;
  const latencies = pitchData.latencies;

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter(a => a === true).length;
  const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

  const correctLatencies = latencies.filter((l, i) => attempts[i] === true);
  const worstLatency = correctLatencies.length > 0 ? Math.max(...correctLatencies) : null;
  const avgLatency = correctLatencies.length > 0
    ? correctLatencies.reduce((a, b) => a + b, 0) / correctLatencies.length
    : null;

  return {
    totalAttempts,
    correctAttempts,
    accuracy,
    worstLatency,
    avgLatency,
    currentChaosLevel: pitchData.currentChaosLevel,
    priority: pitchData.priority
  };
}

// Get overall stats
export function getOverallStats() {
  const session = getSession();
  if (!session) return null;

  const stats = {
    level: session.level,
    blocksCompleted: session.blocks.length,
    pitchStats: {}
  };

  for (let i = 0; i < 12; i++) {
    stats.pitchStats[i] = getPitchStats(i);
  }

  // Calculate floor metrics from last block
  if (session.blocks.length > 0) {
    const lastBlock = session.blocks[session.blocks.length - 1];
    if (lastBlock.metrics) {
      stats.lastFloorScore = lastBlock.metrics.floorScore;
      stats.lastWorstLatency = lastBlock.metrics.worstLatency;
      stats.lastWorstPitch = lastBlock.metrics.worstPitch;
    }
  }

  return stats;
}

// Save to history (for long-term tracking)
export function saveToHistory() {
  const session = getSession();
  if (!session) return;

  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push({
      date: Date.now(),
      level: session.level,
      blocksCompleted: session.blocks.length,
      preTestResults: session.preTestResults,
      finalStats: getOverallStats()
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving to history:', e);
  }
}

// Get training history
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) {
    console.error('Error loading history:', e);
    return [];
  }
}

// Check if session exists and has progress
export function hasExistingSession() {
  const session = getSession();
  return session !== null && (session.preTestComplete || session.blocks.length > 0);
}
