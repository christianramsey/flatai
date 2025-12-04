// Audio Engine - Tone generation, noise, and pitch detection

// Pitch frequencies (C4 to B4)
export const PITCH_FREQUENCIES = {
  0: 261.63,   // C4
  1: 277.18,   // C#4
  2: 293.66,   // D4
  3: 311.13,   // D#4
  4: 329.63,   // E4
  5: 349.23,   // F4
  6: 369.99,   // F#4
  7: 392.00,   // G4
  8: 415.30,   // G#4
  9: 440.00,   // A4
  10: 466.16,  // A#4
  11: 493.88   // B4
};

// Audio context (lazy initialization)
let audioContext = null;
let noiseBuffer = null;

// Initialize audio context (must be called from user gesture)
export function initAudio() {
  if (audioContext) return audioContext;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Pre-generate pink noise buffer
  noiseBuffer = createPinkNoiseBuffer();

  return audioContext;
}

// Resume audio context if suspended
export async function resumeAudio() {
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  return audioContext;
}

// Get audio context
export function getAudioContext() {
  return audioContext;
}

// Create pink noise buffer
function createPinkNoiseBuffer() {
  const bufferSize = 2 * audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  // Pink noise using Paul Kellet's refined method
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;

    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

// Play a pure sine tone
export function playTone(pitchNumber, duration = 1.0, options = {}) {
  const {
    fromNoise = false,
    noiseLevel = 0.5,
    emergeDuration = 1.5,
    volume = 0.5
  } = options;

  const frequency = PITCH_FREQUENCIES[pitchNumber];
  if (!frequency || !audioContext) return null;

  const now = audioContext.currentTime;

  // Create oscillator
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;

  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);

  if (fromNoise && noiseBuffer) {
    // Play noise that fades out while tone fades in
    const noiseSource = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();

    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseSource.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    // Noise starts loud, fades to 0
    noiseGain.gain.setValueAtTime(noiseLevel, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + emergeDuration);

    // Tone starts quiet, emerges
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + emergeDuration);

    noiseSource.start(now);
    noiseSource.stop(now + emergeDuration);

    osc.start(now);
    osc.stop(now + emergeDuration + duration);

    // Fade out at end
    gainNode.gain.setValueAtTime(volume, now + emergeDuration + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + emergeDuration + duration);

    return {
      oscillator: osc,
      gain: gainNode,
      noise: noiseSource,
      noiseGain: noiseGain,
      duration: emergeDuration + duration
    };
  } else {
    // Simple tone with quick attack/release
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.setValueAtTime(volume, now + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    return {
      oscillator: osc,
      gain: gainNode,
      duration: duration
    };
  }
}

// Play pink noise
export function playNoise(duration, options = {}) {
  const {
    fadeOut = true,
    volume = 0.5
  } = options;

  if (!audioContext || !noiseBuffer) return null;

  const now = audioContext.currentTime;

  const noiseSource = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();

  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseSource.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.setValueAtTime(volume, now);

  if (fadeOut) {
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
  }

  noiseSource.start(now);
  noiseSource.stop(now + duration);

  return {
    source: noiseSource,
    gain: gainNode,
    duration: duration
  };
}

// Stop all audio
export function stopAllAudio() {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
    noiseBuffer = null;
  }
}

// ============ Pitch Detection (for sing-back) ============

let analyser = null;
let microphoneStream = null;
let dataArray = null;

// Initialize microphone for pitch detection
export async function initMicrophone() {
  if (!audioContext) {
    initAudio();
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphoneStream = stream;

    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(analyser);
    dataArray = new Float32Array(analyser.fftSize);

    return true;
  } catch (err) {
    console.error('Microphone access denied:', err);
    return false;
  }
}

// Stop microphone
export function stopMicrophone() {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }
  analyser = null;
  dataArray = null;
}

// Detect pitch using autocorrelation
export function detectPitch() {
  if (!analyser || !dataArray) return null;

  analyser.getFloatTimeDomainData(dataArray);

  // Check if there's enough signal
  let rms = 0;
  for (let i = 0; i < dataArray.length; i++) {
    rms += dataArray[i] * dataArray[i];
  }
  rms = Math.sqrt(rms / dataArray.length);

  if (rms < 0.01) return null; // Too quiet

  // Autocorrelation
  const sampleRate = audioContext.sampleRate;
  const bufferSize = dataArray.length;
  const correlations = new Float32Array(bufferSize);

  for (let lag = 0; lag < bufferSize; lag++) {
    let sum = 0;
    for (let i = 0; i < bufferSize - lag; i++) {
      sum += dataArray[i] * dataArray[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find the first peak after the initial decline
  let foundPeak = false;
  let maxCorrelation = -1;
  let maxLag = 0;

  // Start looking after the first zero crossing
  let startLag = 0;
  for (let i = 1; i < bufferSize; i++) {
    if (correlations[i] < correlations[i - 1]) {
      startLag = i;
      break;
    }
  }

  // Find the maximum correlation peak
  for (let lag = startLag; lag < bufferSize; lag++) {
    if (correlations[lag] > maxCorrelation) {
      maxCorrelation = correlations[lag];
      maxLag = lag;
      foundPeak = true;
    }
  }

  if (!foundPeak || maxLag === 0) return null;

  // Parabolic interpolation for better accuracy
  const y1 = correlations[maxLag - 1] || 0;
  const y2 = correlations[maxLag];
  const y3 = correlations[maxLag + 1] || 0;

  const refinedLag = maxLag + (y3 - y1) / (2 * (2 * y2 - y1 - y3));

  const frequency = sampleRate / refinedLag;

  // Sanity check: frequency should be in reasonable vocal range
  if (frequency < 80 || frequency > 1000) return null;

  return frequency;
}

// Convert frequency to cents deviation from target
export function hzToCents(detected, targetPitch) {
  const targetHz = PITCH_FREQUENCIES[targetPitch];
  if (!targetHz || !detected) return null;

  return 1200 * Math.log2(detected / targetHz);
}

// Find closest pitch number to detected frequency
export function hzToPitchNumber(hz) {
  if (!hz) return null;

  let closestPitch = 0;
  let smallestDiff = Infinity;

  for (let i = 0; i < 12; i++) {
    const diff = Math.abs(hzToCents(hz, i) || Infinity);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestPitch = i;
    }
  }

  return { pitch: closestPitch, cents: hzToCents(hz, closestPitch) };
}

// Evaluate sing-back accuracy
export function evaluateSingback(detectedHz, targetPitch) {
  const cents = hzToCents(detectedHz, targetPitch);
  if (cents === null) return { result: 'no_pitch', cents: null };

  const absCents = Math.abs(cents);

  if (absCents < 15) {
    return { result: 'correct', cents };
  } else if (absCents < 30) {
    return { result: 'close', cents };
  } else {
    return { result: 'incorrect', cents };
  }
}
