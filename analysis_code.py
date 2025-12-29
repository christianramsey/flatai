"""
REM-Similarity Index (RSI) Analysis Code
For: Psychedelic Sleep-Wake Continuum Hypothesis

This code provides functions for:
1. Calculating REM-Similarity Index from EEG power spectral data
2. Visualizing compound classifications
3. Statistical tests for hypothesis validation

Requirements: numpy, scipy, pandas, matplotlib, seaborn
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Tuple, Optional
import warnings

# =============================================================================
# CONSTANTS AND NORMATIVE VALUES
# =============================================================================

# Frequency band definitions (Hz)
FREQ_BANDS = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta': (13, 30),
    'gamma': (30, 100)
}

# Normative values from sleep literature (relative power, approximate)
# These would be replaced with actual normative data in a real study
REM_NORMS = {
    'delta': 0.25,      # Low in REM
    'theta': 0.35,      # High in REM
    'alpha': 0.10,      # Suppressed in REM
    'beta': 0.20,
    'gamma': 0.10,
    'signal_diversity': 0.75  # High in REM (normalized 0-1)
}

NREM_NORMS = {
    'delta': 0.55,      # High in NREM/SWS
    'theta': 0.20,      # Moderate in NREM
    'alpha': 0.08,      # Suppressed
    'beta': 0.12,
    'gamma': 0.05,
    'signal_diversity': 0.35  # Low in NREM
}

WAKE_NORMS = {
    'delta': 0.10,      # Low in waking
    'theta': 0.15,      # Low-moderate
    'alpha': 0.35,      # High in waking (eyes closed)
    'beta': 0.30,
    'gamma': 0.10,
    'signal_diversity': 0.60
}

# Weights for RSI calculation
RSI_WEIGHTS = {
    'tar': 0.35,        # Theta/Alpha Ratio
    'dsi': 0.25,        # Delta Suppression Index
    'asi': 0.20,        # Alpha Suppression Index
    'sdi': 0.20         # Signal Diversity Index
}


# =============================================================================
# CORE FUNCTIONS
# =============================================================================

def calculate_tar(theta_power: float, alpha_power: float) -> float:
    """
    Calculate Theta/Alpha Ratio (TAR).

    Higher TAR = more theta-dominant = more REM-like

    Parameters:
    -----------
    theta_power : float
        Power in theta band (4-8 Hz)
    alpha_power : float
        Power in alpha band (8-13 Hz)

    Returns:
    --------
    float : Theta/Alpha Ratio
    """
    if alpha_power <= 0:
        warnings.warn("Alpha power <= 0, returning inf")
        return float('inf')
    return theta_power / alpha_power


def calculate_dsi(delta_power: float, total_power: float) -> float:
    """
    Calculate Delta Suppression Index (DSI).

    DSI = 1 - (delta / total)
    Higher DSI = less delta = more REM-like (vs NREM)

    Parameters:
    -----------
    delta_power : float
        Power in delta band (0.5-4 Hz)
    total_power : float
        Total power (typically 0.5-30 Hz)

    Returns:
    --------
    float : Delta Suppression Index (0-1)
    """
    if total_power <= 0:
        warnings.warn("Total power <= 0, returning 0")
        return 0.0
    return 1 - (delta_power / total_power)


def calculate_asi(alpha_drug: float, alpha_baseline: float) -> float:
    """
    Calculate Alpha Suppression Index (ASI).

    ASI = 1 - (alpha_drug / alpha_baseline)
    Higher ASI = more alpha suppression = more sleep-like

    Parameters:
    -----------
    alpha_drug : float
        Alpha power during drug condition
    alpha_baseline : float
        Alpha power at baseline/placebo

    Returns:
    --------
    float : Alpha Suppression Index (can be negative if alpha increases)
    """
    if alpha_baseline <= 0:
        warnings.warn("Baseline alpha <= 0, returning 0")
        return 0.0
    return 1 - (alpha_drug / alpha_baseline)


def normalize_to_range(value: float, min_val: float, max_val: float) -> float:
    """
    Normalize a value to 0-1 range given expected min and max.

    Parameters:
    -----------
    value : float
        Value to normalize
    min_val : float
        Minimum expected value (maps to 0)
    max_val : float
        Maximum expected value (maps to 1)

    Returns:
    --------
    float : Normalized value (0-1), clipped to range
    """
    if max_val == min_val:
        return 0.5
    normalized = (value - min_val) / (max_val - min_val)
    return np.clip(normalized, 0, 1)


def calculate_rsi(
    theta_power: float,
    alpha_power: float,
    delta_power: float,
    total_power: float,
    alpha_baseline: float,
    signal_diversity: float,
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, float]:
    """
    Calculate REM-Similarity Index (RSI).

    RSI combines four metrics:
    - TAR: Theta/Alpha Ratio (normalized)
    - DSI: Delta Suppression Index
    - ASI: Alpha Suppression Index
    - SDI: Signal Diversity Index (normalized)

    Parameters:
    -----------
    theta_power : float
        Power in theta band
    alpha_power : float
        Power in alpha band
    delta_power : float
        Power in delta band
    total_power : float
        Total power
    alpha_baseline : float
        Baseline alpha power
    signal_diversity : float
        Lempel-Ziv complexity or similar (0-1 scale)
    weights : dict, optional
        Weights for each component (default: RSI_WEIGHTS)

    Returns:
    --------
    dict : Contains 'rsi' (composite) and individual components
    """
    if weights is None:
        weights = RSI_WEIGHTS

    # Calculate raw metrics
    tar = calculate_tar(theta_power, alpha_power)
    dsi = calculate_dsi(delta_power, total_power)
    asi = calculate_asi(alpha_power, alpha_baseline)

    # Normalize TAR: wake ~0.5, REM ~2.0
    tar_norm = normalize_to_range(tar, 0.5, 2.0)

    # Normalize signal diversity: NREM ~0.35, REM ~0.75
    sdi_norm = normalize_to_range(
        signal_diversity,
        NREM_NORMS['signal_diversity'],
        REM_NORMS['signal_diversity']
    )

    # ASI already in useful range (-1 to 1), normalize to 0-1
    asi_norm = normalize_to_range(asi, -0.5, 1.0)

    # Calculate composite RSI
    rsi = (
        weights['tar'] * tar_norm +
        weights['dsi'] * dsi +
        weights['asi'] * asi_norm +
        weights['sdi'] * sdi_norm
    )

    return {
        'rsi': rsi,
        'tar': tar,
        'tar_norm': tar_norm,
        'dsi': dsi,
        'asi': asi,
        'asi_norm': asi_norm,
        'sdi': signal_diversity,
        'sdi_norm': sdi_norm
    }


def calculate_nsi(
    delta_power: float,
    theta_power: float,
    total_power: float,
    alpha_baseline: float,
    alpha_power: float,
    signal_diversity: float
) -> Dict[str, float]:
    """
    Calculate NREM-Similarity Index (NSI).

    For compounds hypothesized to be NREM-like (e.g., 5-MeO-DMT).
    High NSI = more delta-dominant, low diversity, formless.

    Parameters:
    -----------
    delta_power : float
    theta_power : float
    total_power : float
    alpha_baseline : float
    alpha_power : float
    signal_diversity : float

    Returns:
    --------
    dict : Contains 'nsi' and components
    """
    # Delta dominance (opposite of DSI)
    delta_dominance = delta_power / total_power if total_power > 0 else 0

    # Theta suppression (NREM has less theta than REM)
    tar = calculate_tar(theta_power, alpha_power)
    tar_suppression = 1 - normalize_to_range(tar, 0.5, 2.0)

    # Alpha suppression (both NREM and REM suppress alpha)
    asi = calculate_asi(alpha_power, alpha_baseline)
    asi_norm = normalize_to_range(asi, -0.5, 1.0)

    # Low diversity (NREM is synchronized)
    low_diversity = 1 - normalize_to_range(
        signal_diversity,
        NREM_NORMS['signal_diversity'],
        REM_NORMS['signal_diversity']
    )

    # Composite NSI
    nsi = (
        0.35 * delta_dominance +
        0.25 * tar_suppression +
        0.20 * asi_norm +
        0.20 * low_diversity
    )

    return {
        'nsi': nsi,
        'delta_dominance': delta_dominance,
        'tar_suppression': tar_suppression,
        'asi_norm': asi_norm,
        'low_diversity': low_diversity
    }


# =============================================================================
# COMPOUND DATA (from literature review)
# =============================================================================

# Estimated values based on literature extraction
# In a real analysis, these would come from raw data

COMPOUND_DATA = {
    'DMT': {
        'theta_change': 0.25,      # Increase at peak
        'alpha_change': -0.50,     # Strong decrease
        'delta_change': 0.20,      # Increase at peak
        'signal_diversity': 0.80,  # High
        'rsi_estimate': 0.82,
        'nsi_estimate': 0.35,
        'class': 'REM-like'
    },
    'Ayahuasca': {
        'theta_change': -0.30,     # Decrease (anomaly)
        'alpha_change': -0.35,
        'delta_change': -0.20,
        'signal_diversity': 0.70,
        'rsi_estimate': 0.68,
        'nsi_estimate': 0.40,
        'class': 'REM-like (mixed)'
    },
    '5-MeO-DMT': {
        'theta_change': -0.25,     # Decrease
        'alpha_change': -0.40,
        'delta_change': 0.50,      # Strong increase
        'signal_diversity': 0.45,  # Low
        'rsi_estimate': 0.28,
        'nsi_estimate': 0.78,
        'class': 'NREM-like'
    },
    'Psilocybin': {
        'theta_change': -0.15,     # Slight decrease acutely
        'alpha_change': -0.45,
        'delta_change': -0.10,
        'signal_diversity': 0.75,
        'rsi_estimate': 0.55,
        'nsi_estimate': 0.38,
        'class': 'Wake-like'
    },
    'LSD': {
        'theta_change': -0.20,
        'alpha_change': -0.50,
        'delta_change': -0.15,
        'signal_diversity': 0.78,
        'rsi_estimate': 0.52,
        'nsi_estimate': 0.35,
        'class': 'Wake-like'
    },
    'Mescaline': {
        'theta_change': -0.15,
        'alpha_change': -0.35,
        'delta_change': -0.10,
        'signal_diversity': 0.65,
        'rsi_estimate': 0.45,
        'nsi_estimate': 0.42,
        'class': 'Wake-like'
    }
}


def get_compound_dataframe() -> pd.DataFrame:
    """Convert compound data to pandas DataFrame."""
    records = []
    for compound, data in COMPOUND_DATA.items():
        record = {'compound': compound}
        record.update(data)
        records.append(record)
    return pd.DataFrame(records)


# =============================================================================
# STATISTICAL TESTS
# =============================================================================

def test_rsi_phenomenology_correlation(
    rsi_values: np.ndarray,
    dreamlikeness_ratings: np.ndarray
) -> Dict[str, float]:
    """
    Test correlation between RSI and dream-likeness ratings.

    Hypothesis: r > 0.5 regardless of compound

    Parameters:
    -----------
    rsi_values : array
        RSI values for each participant/trial
    dreamlikeness_ratings : array
        Dream-likeness ratings (0-10 scale)

    Returns:
    --------
    dict : Correlation coefficient, p-value, CI
    """
    r, p = stats.pearsonr(rsi_values, dreamlikeness_ratings)

    # Fisher z transformation for CI
    n = len(rsi_values)
    z = np.arctanh(r)
    se = 1 / np.sqrt(n - 3)
    z_lower = z - 1.96 * se
    z_upper = z + 1.96 * se
    ci_lower = np.tanh(z_lower)
    ci_upper = np.tanh(z_upper)

    # Test if r > 0.5 (one-tailed)
    z_test = (z - np.arctanh(0.5)) / se
    p_greater_05 = 1 - stats.norm.cdf(z_test)

    return {
        'r': r,
        'p': p,
        'ci_lower': ci_lower,
        'ci_upper': ci_upper,
        'p_greater_than_0.5': p_greater_05,
        'hypothesis_supported': r > 0.5 and p_greater_05 < 0.05
    }


def test_compound_clustering(
    features: np.ndarray,
    compound_labels: np.ndarray,
    chemical_classes: np.ndarray
) -> Dict[str, float]:
    """
    Test if compounds cluster by sleep-wake profile vs chemical class.

    Uses silhouette score to compare clustering quality.

    Parameters:
    -----------
    features : array (n_samples, n_features)
        EEG features (e.g., delta, theta, alpha, beta power)
    compound_labels : array
        Compound names
    chemical_classes : array
        Chemical class labels (e.g., 'tryptamine', 'phenethylamine')

    Returns:
    --------
    dict : Clustering comparison results
    """
    try:
        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score, adjusted_rand_score
    except ImportError:
        return {'error': 'sklearn not available'}

    # Cluster by k-means (k=3 for REM-like, NREM-like, Wake-like)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(features)

    # Calculate silhouette score for data-driven clusters
    sil_datadriven = silhouette_score(features, cluster_labels)

    # Compare to chemical class labels (if >2 classes)
    unique_chem = np.unique(chemical_classes)
    if len(unique_chem) >= 2:
        sil_chemical = silhouette_score(features, chemical_classes)
        ari = adjusted_rand_score(cluster_labels, chemical_classes)
    else:
        sil_chemical = None
        ari = None

    return {
        'silhouette_datadriven': sil_datadriven,
        'silhouette_chemical': sil_chemical,
        'adjusted_rand_index': ari,
        'datadriven_better': sil_datadriven > sil_chemical if sil_chemical else None
    }


def regression_rsi_outcome(
    rsi_values: np.ndarray,
    symptom_change: np.ndarray,
    covariates: Optional[np.ndarray] = None
) -> Dict[str, float]:
    """
    Regression testing if RSI predicts therapeutic outcome.

    Parameters:
    -----------
    rsi_values : array
        Acute RSI values
    symptom_change : array
        Change in symptom scores (negative = improvement)
    covariates : array, optional
        Additional covariates (e.g., baseline severity)

    Returns:
    --------
    dict : Regression results
    """
    from scipy.stats import linregress

    # Simple linear regression
    slope, intercept, r, p, se = linregress(rsi_values, symptom_change)

    # Negative slope expected (higher RSI → more improvement → more negative change)
    return {
        'slope': slope,
        'intercept': intercept,
        'r': r,
        'r_squared': r**2,
        'p': p,
        'se': se,
        'direction_expected': slope < 0,
        'significant': p < 0.05
    }


# =============================================================================
# VISUALIZATION (requires matplotlib)
# =============================================================================

def plot_compound_classification():
    """
    Create visualization of compound classification on RSI-NSI plane.
    """
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
    except ImportError:
        print("matplotlib/seaborn not available for plotting")
        return

    df = get_compound_dataframe()

    fig, ax = plt.subplots(figsize=(10, 8))

    # Color by class
    colors = {
        'REM-like': '#2ecc71',
        'REM-like (mixed)': '#27ae60',
        'NREM-like': '#3498db',
        'Wake-like': '#e74c3c'
    }

    for _, row in df.iterrows():
        ax.scatter(
            row['rsi_estimate'],
            row['nsi_estimate'],
            c=colors.get(row['class'], 'gray'),
            s=200,
            alpha=0.7
        )
        ax.annotate(
            row['compound'],
            (row['rsi_estimate'], row['nsi_estimate']),
            xytext=(5, 5),
            textcoords='offset points',
            fontsize=10
        )

    # Add reference regions
    ax.axvline(0.6, color='gray', linestyle='--', alpha=0.3)
    ax.axhline(0.6, color='gray', linestyle='--', alpha=0.3)

    # Labels
    ax.set_xlabel('REM-Similarity Index (RSI)', fontsize=12)
    ax.set_ylabel('NREM-Similarity Index (NSI)', fontsize=12)
    ax.set_title('Psychedelic Compounds on Sleep-Wake Continuum', fontsize=14)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)

    # Add region labels
    ax.text(0.8, 0.2, 'REM-like\n(DMT)', ha='center', fontsize=9, alpha=0.5)
    ax.text(0.2, 0.8, 'NREM-like\n(5-MeO-DMT)', ha='center', fontsize=9, alpha=0.5)
    ax.text(0.5, 0.35, 'Wake-like\n(Psilocybin, LSD)', ha='center', fontsize=9, alpha=0.5)

    # Legend
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], marker='o', color='w', markerfacecolor=c, markersize=10, label=l)
        for l, c in colors.items()
    ]
    ax.legend(handles=legend_elements, loc='upper left')

    plt.tight_layout()
    plt.savefig('compound_classification.png', dpi=150)
    plt.close()
    print("Saved: compound_classification.png")


def plot_spectral_comparison():
    """
    Create bar chart comparing spectral changes across compounds.
    """
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
    except ImportError:
        print("matplotlib/seaborn not available for plotting")
        return

    df = get_compound_dataframe()

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    bands = ['delta_change', 'theta_change', 'alpha_change']
    titles = ['Delta (0.5-4 Hz)', 'Theta (4-8 Hz)', 'Alpha (8-13 Hz)']

    for ax, band, title in zip(axes, bands, titles):
        colors = ['#2ecc71' if v > 0 else '#e74c3c' for v in df[band]]
        ax.barh(df['compound'], df[band], color=colors, alpha=0.7)
        ax.axvline(0, color='black', linewidth=0.5)
        ax.set_xlabel('Change from baseline')
        ax.set_title(title)
        ax.set_xlim(-0.6, 0.6)

    plt.suptitle('Spectral Power Changes by Compound', fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig('spectral_comparison.png', dpi=150)
    plt.close()
    print("Saved: spectral_comparison.png")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("REM-Similarity Index Analysis")
    print("=" * 60)

    # Display compound data
    df = get_compound_dataframe()
    print("\nCompound Classification Summary:")
    print(df[['compound', 'rsi_estimate', 'nsi_estimate', 'class']].to_string(index=False))

    # Example RSI calculation
    print("\n" + "-" * 60)
    print("Example RSI Calculation (DMT-like values):")

    result = calculate_rsi(
        theta_power=0.35,
        alpha_power=0.15,
        delta_power=0.25,
        total_power=1.0,
        alpha_baseline=0.35,
        signal_diversity=0.80
    )

    for key, value in result.items():
        print(f"  {key}: {value:.3f}")

    # Example NSI calculation
    print("\n" + "-" * 60)
    print("Example NSI Calculation (5-MeO-DMT-like values):")

    result_nsi = calculate_nsi(
        delta_power=0.50,
        theta_power=0.15,
        total_power=1.0,
        alpha_baseline=0.35,
        alpha_power=0.10,
        signal_diversity=0.40
    )

    for key, value in result_nsi.items():
        print(f"  {key}: {value:.3f}")

    # Simulated hypothesis test
    print("\n" + "-" * 60)
    print("Simulated Correlation Test (RSI × Dream-likeness):")

    # Generate simulated data
    np.random.seed(42)
    n = 50
    rsi_sim = np.random.uniform(0.3, 0.9, n)
    dreamlikeness_sim = 3 + 6 * rsi_sim + np.random.normal(0, 1, n)  # r ≈ 0.6
    dreamlikeness_sim = np.clip(dreamlikeness_sim, 0, 10)

    test_result = test_rsi_phenomenology_correlation(rsi_sim, dreamlikeness_sim)

    for key, value in test_result.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.3f}")
        else:
            print(f"  {key}: {value}")

    # Try to generate plots
    print("\n" + "-" * 60)
    print("Generating visualizations...")

    try:
        plot_compound_classification()
        plot_spectral_comparison()
    except Exception as e:
        print(f"Plotting failed: {e}")

    print("\n" + "=" * 60)
    print("Analysis complete.")
