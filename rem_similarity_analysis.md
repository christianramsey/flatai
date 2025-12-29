# REM-Similarity Index: Methodology and Analysis

## 1. Conceptual Framework

The REM-Similarity Index (RSI) quantifies how closely a psychedelic-induced EEG pattern resembles REM sleep. This is based on the hypothesis that psychedelics induce hybrid waking-sleep states, with different compounds producing different positions along this continuum.

### 1.1 REM Sleep EEG Signature

REM sleep is characterized by:
- **Theta dominance** (4-8 Hz): Particularly in hippocampal regions
- **Alpha suppression** (8-13 Hz): Similar to waking with eyes open
- **Low-moderate delta** (0.5-4 Hz): Unlike NREM's high delta
- **High signal diversity**: Comparable to or exceeding waking
- **Desynchronized cortical activity**: Fast, low-amplitude patterns

### 1.2 NREM/SWS EEG Signature

NREM/Slow-wave sleep is characterized by:
- **Delta dominance** (0.5-4 Hz): High-amplitude slow waves
- **Theta moderate** (4-8 Hz): Present but not dominant
- **Alpha suppressed** (8-13 Hz): Minimal
- **Low signal diversity**: Highly synchronized
- **K-complexes and sleep spindles**: Characteristic waveforms

---

## 2. REM-Similarity Index Calculation

### 2.1 Component Metrics

**Metric 1: Theta/Alpha Ratio (TAR)**
```
TAR = Power(4-8 Hz) / Power(8-13 Hz)
```
- REM sleep: TAR > 1.5 (theta dominant)
- Waking: TAR < 0.5 (alpha dominant)
- Higher TAR = more REM-like

**Metric 2: Delta Suppression Index (DSI)**
```
DSI = 1 - [Power(0.5-4 Hz) / Total_Power(0.5-30 Hz)]
```
- REM sleep: DSI ~ 0.7-0.8 (delta suppressed)
- NREM: DSI ~ 0.3-0.4 (delta dominant)
- Higher DSI = more REM-like (less NREM-like)

**Metric 3: Alpha Suppression Index (ASI)**
```
ASI = 1 - [Power_drug(8-13 Hz) / Power_baseline(8-13 Hz)]
```
- Positive values indicate alpha suppression
- Higher ASI = more sleep-like (both REM and NREM suppress alpha)

**Metric 4: Signal Diversity Index (SDI)**
```
SDI = Lempel-Ziv_complexity(EEG_signal)
```
- REM sleep: High (comparable to waking)
- NREM: Low
- Waking: Moderate-high
- Higher SDI = more REM-like (vs NREM)

### 2.2 Composite REM-Similarity Index

```
RSI = (w1 × TAR_norm) + (w2 × DSI) + (w3 × ASI) + (w4 × SDI_norm)
```

Where:
- TAR_norm = (TAR - TAR_waking) / (TAR_REM - TAR_waking)
- SDI_norm = (SDI - SDI_NREM) / (SDI_REM - SDI_NREM)
- Weights: w1=0.35, w2=0.25, w3=0.20, w4=0.20 (adjustable based on data)

**Interpretation:**
- RSI ≈ 1.0: Highly REM-like
- RSI ≈ 0.5: Intermediate/hybrid
- RSI ≈ 0.0: Wake-like or NREM-like

---

## 3. NREM-Similarity Index Calculation

For compounds hypothesized to be NREM-like (e.g., 5-MeO-DMT):

**NREM-Similarity Index (NSI)**
```
NSI = (w1 × Delta_Dominance) + (w2 × (1-SDI_norm)) + (w3 × ASI) + (w4 × (1-TAR_norm))
```

Where:
- Delta_Dominance = Power(0.5-4 Hz) / Total_Power(0.5-30 Hz)
- Higher NSI = more NREM/SWS-like

---

## 4. Estimated RSI and NSI Values by Compound

Based on literature extraction (see Table 1 for source data):

| Compound | TAR (est.) | DSI (est.) | ASI (est.) | SDI (est.) | **RSI** | **NSI** | Classification |
|----------|------------|------------|------------|------------|---------|---------|----------------|
| **DMT** | 1.8 | 0.65 | 0.70 | High | **0.82** | 0.35 | REM-like (Class 1) |
| **Ayahuasca** | 1.2 | 0.60 | 0.55 | Mod-high | **0.68** | 0.40 | REM-like (Class 1) |
| **5-MeO-DMT** | 0.6 | 0.35 | 0.75 | Low | 0.28 | **0.78** | NREM-like (Class 2) |
| **Psilocybin** | 0.7 | 0.72 | 0.65 | High | **0.55** | 0.38 | Wake-like (Class 3) |
| **LSD** | 0.6 | 0.70 | 0.70 | High | **0.52** | 0.35 | Wake-like (Class 3) |
| **Mescaline** | 0.5 | 0.68 | 0.55 | Mod | **0.45** | 0.42 | Wake-like (Class 3) |

### 4.1 Notes on Estimation

**DMT:**
- Timmermann 2019 reports delta/theta emergence at peak with strong alpha suppression
- High signal diversity maintained
- Clear REM-like signature with immersive visual worlds

**5-MeO-DMT:**
- Martial 2024 reports delta dominance with theta suppression
- "Sleep-like signatures" in awake animals
- Low signal coherence; formless quality maps to NREM

**Psilocybin/LSD:**
- Broadband desynchronization without theta emergence
- High signal diversity (entropy)
- Alpha suppression present but no shift to delta/theta dominance
- Conceptual/insight experiences rather than immersive worlds

---

## 5. Phenomenology Mapping

| Phenomenological Feature | Expected EEG Signature | Sleep Stage Parallel |
|-------------------------|------------------------|---------------------|
| Immersive visual worlds | ↑ Theta/delta; ↓↓ alpha | REM dreaming |
| Entity encounters | ↑ Theta (medial temporal) | REM/hypnagogia |
| Ego dissolution (with imagery) | Theta emergence + alpha collapse | REM-wake transition |
| Ego dissolution (formless) | ↑↑ Delta; ↓ theta | NREM/SWS |
| Conceptual insights | Broadband desync; high entropy | Enhanced waking |
| Time distortion | Alpha suppression | Sleep-like |
| Sense of significance | DMN disruption | Variable |

---

## 6. Statistical Approach

### 6.1 Cluster Analysis

If raw spectral data were available from multiple studies, we would perform:

1. **Feature extraction**: Extract power in delta, theta, alpha, beta, gamma bands (normalized)
2. **Dimensionality reduction**: PCA or t-SNE on spectral features
3. **Clustering**: K-means or hierarchical clustering
4. **Hypothesis test**: Do clusters align with proposed classification (REM-like, NREM-like, Wake-like) rather than chemical class (tryptamine, phenethylamine)?

### 6.2 Correlation Analyses

1. **Theta emergence × Dream-like phenomenology**
   - H1: r > 0.5 regardless of compound
   - Test: Mixed-effects model with compound as random effect

2. **RSI × Therapeutic outcome**
   - H1: Higher acute RSI predicts greater symptom reduction
   - Test: Regression with RSI as predictor, controlling for dose and set/setting

3. **Compound differentiation by sleep-wake profile**
   - H1: RSI/NSI predicts phenomenological class better than receptor binding affinity
   - Test: Classification accuracy comparison

---

## 7. Limitations of Current Analysis

1. **Data availability**: Most studies report group means, not individual data
2. **Methodological heterogeneity**: Different EEG systems, preprocessing, frequency definitions
3. **Incomplete coverage**: Limited 5-MeO-DMT human EEG; no mescaline modern studies
4. **Temporal dynamics**: Psychedelic effects change over time; peak vs. plateau effects differ
5. **Normalization approaches**: Absolute vs. relative power varies across studies

---

## 8. Code for RSI Calculation

See `analysis_code.py` for implementation.

---

## 9. Key Findings Supporting the Hypothesis

### Evidence FOR the sleep-wake continuum hypothesis:

1. **DMT produces REM-like signatures**: Timmermann 2019 explicitly notes delta/theta emergence parallels REM dreaming
2. **5-MeO-DMT produces NREM-like signatures**: Martial 2024 calls it "paradoxical wakefulness" with SWS-like spectral patterns
3. **Psilocybin/LSD differ from DMT**: No theta emergence; broadband desync pattern distinct from sleep
4. **Phenomenology maps to EEG**: Visual immersion correlates with theta, formlessness with delta dominance

### Evidence AGAINST or requiring refinement:

1. **Ayahuasca shows theta decrease, not increase**: Contradicts simple REM-like classification
2. **Signal diversity high in all psychedelics**: Doesn't differentiate REM-like from Wake-like
3. **Therapeutic correlations with theta are sub-acute, not acute**: May reflect neuroplasticity, not state similarity
4. **Limited direct comparisons**: Few studies compare compounds head-to-head with same methods
