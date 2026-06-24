# Weather Decision Support Tool

A web-based decision aid to evaluate weather risk across university campuses. The tool aggregates forecast inputs into consistent risk scores.

## Overview

The tool scores three risk dimensions from manually entered forecast data:

- **Campus Operations** — informs closure, delayed start, and early release decisions
- **Outdoor Exposure** — informs decisions about events, tours, and outdoor work
- **Road & Travel** — informs communication to commuter students and staff

Each score maps to a four-level stoplight (Green / Yellow / Amber / Red) with a plain-English condition summary explaining the contributing factors.

### Disclaimer

This tool supports decision-making. It does not make decisions. Final authority for campus operations and outdoor activity suspension rests with university leadership.

## Development Roadmap

### Near Term
- **Improved PDF Export** - Generate a clean assessment report including date, assessor, inputs, scores, and condition summary.
- **Form Validation** - Require critical fields before calculation. Add clear inline error messages for missing or invalid inputs.
- **Assessment Comparison** - Compare two assessments side by side. Highlight delta.

### Medium Term
- **Persistent Data Storage** - Store assessments with timestamps, assessor information, inputs, and results. Create a searchable decision history for record-keeping and audits.
- **User Authentication** - Associate assessments with individual users.
- **Historical Trends and Reporting** - View assessment history over time. Analyze trends and compare decisions against observed conditions.
- **Multi-Location Dashboard** - Monitor assessment status across multiple campuses or locations from a single view.

### Long Term
- **National Weather Service Integration** - Auto-populate weather alerts and watch/warning information.
- **Mesonet Integration** -  Import weather observations such as temperature, wind, and precipitation.

### Usability Enhancements

- **Seasonal Assessment Modes** - Adjust displayed hazards based on the current season to reduce unnecessary inputs and streamline assessments.

---

## Scoring Methodology

The tool produces three independent scores on a 0–100 scale:

| Score | What it supports |
|---|---|
| **Campus Operations** | Closure, delayed start, early release decisions |
| **Outdoor Exposure** | Events, tours, outdoor work, gatherings |
| **Road & Travel** | Commuter notifications, access restrictions |

Each score is calculated by running weather inputs through category sub-scorers, then combining those sub-scores using weighted percentages. The weights reflect how much each hazard type typically drives decisions in that category.

---

### Stoplight Thresholds

| Score Range | Color | Label | Recommended Posture |
|---|---|---|---|
| 0 – 24 | Green | Normal Operations | No weather-based action needed |
| 25 – 49 | Yellow | Elevated Caution | Increase monitoring and notify decision makers |
| 50 – 74 | Amber | High Risk | Evaluate delays, modifications, or contingency activation |
| 75 – 100 | Red | Severe Risk | Evaluate closure, cancellation, or emergency procedures |

---

### Bypass Conditions

Two conditions bypass scoring entirely and force a score to Red regardless of other inputs:

| Condition | Effect |
|---|---|
| Tornado Warning / PDS / Emergency in effect | Campus Operations and Outdoor Exposure both forced to 100 (Red) |
| Active lightning within 8 miles | Outdoor Exposure forced to 100 (Red) |

---

### Category Sub-Scorers

Each hazard category produces a sub-score from 0 to 100. These sub-scores are then combined using the weights in the next section.

#### Severe Weather

| Input | None | Low | Moderate | High |
|---|---|---|---|---|
| NWS Alert Level | 0 pts | Statement: 10 / Advisory: 20 | Watch: 40 | Warning: 60 / Tornado PDS: 90 |
| Tornado Watch | 0 pts | — | Tornado Watch: +20 | PDS Watch: +35 |
| Hail Threat | 0 pts | Small (<1"): +10 | Large (≥1"): +20 | — |

#### Flood Hazard

| Input | Points |
|---|---|
| None | 0 |
| Localized nuisance flooding possible | 35 |
| Flash Flood Watch | 70 |
| Flash Flood Warning | 100 |

#### Winter Hazards

| Input | None | Tier 1 | Tier 2 | Tier 3 | Max Contribution |
|---|---|---|---|---|---|
| Ice Accumulation | 0 | Trace–0.10": 13 | 0.10–0.25": 27 | >0.25": 40 | 40 pts |
| Snow Accumulation | 0 | 1–3": 7 | 3–6": 13 | >6": 20 | 20 pts |
| Wind Chill | 0 | 0–20°F: 7 | -10–0°F: 13 | <-10°F: 20 | 20 pts |
| Precipitation Type | 0 | Rain+Wind: 3 | Freezing Drizzle: 8 | Freezing Rain: 11 / Sleet-Ice: 15 | 15 pts |
| Freeze-Thaw Cycle | 0 | — | Yes: +10 | — | 10 pts |

Note: Ice accumulation carries the most weight because it is the primary campus closure driver in Oklahoma historically.

Precipitation type scoring reflects the relative severity of each type:

| Precipitation Type | Raw Score | Rationale |
|---|---|---|
| None / Rain only | 0 | No winter hazard |
| Rain + gusty wind | 20 | Hazardous but not frozen |
| Freezing drizzle | 50 | Invisible accumulation; high black ice risk |
| Freezing rain | 75 | Visible accumulation on all surfaces |
| Sleet / ice mix | 100 | Most operationally disruptive combination |

#### Heat Hazards

If Wet Bulb Globe Temperature (WBGT) is entered, it overrides Heat Index in the calculation. WBGT is the preferred measure.

**WBGT:**

| WBGT Range | Sub-score |
|---|---|
| Below 80°F | 0 |
| 80°F – 85°F | 33 |
| 85°F – 90°F | 67 |
| Above 90°F | 100 |

**Heat Index (when WBGT is not available):**

| Heat Index Range | Sub-score |
|---|---|
| Below 90°F | 0 |
| 90°F – 100°F (Caution) | 33 |
| 100°F – 108°F (Danger) | 67 |
| Above 108°F (Extreme Danger) | 100 |

#### Wind

| Input | None | Tier 1 | Tier 2 | Tier 3 | Max Contribution |
|---|---|---|---|---|---|
| Sustained Wind | <20 mph: 0 | 20–35 mph: 20 | 35–50 mph: 40 | >50 mph: 60 | 60 pts |
| Gusts | <30 mph: 0 | 30–45 mph: 13 | 45–60 mph: 27 | >60 mph: 40 | 40 pts |

#### Road & Travel

Travel is a standalone score. Flood contributes directly to it in addition to through the category weights.

| Input | None | Tier 1 | Tier 2 | Tier 3 | Max Contribution |
|---|---|---|---|---|---|
| Road Conditions | Clear: 0 | Wet: 13 | Patchy ice: 27 | Widespread ice: 40 | 40 pts |
| ODOT Advisory | None: 0 | Advisory: 10 | Warning: 20 | Travel Ban: 30 | 30 pts |
| Visibility | Normal: 0 | <1 mile: 7 | <¼ mile: 13 | Near-zero: 20 | 20 pts |
| Campus Walkways | Clear: 0 | Wet: 3 | Icy patches: 7 | Widespread ice: 10 | 10 pts |
| Flood (direct) | 0 | 7 | 14 | 20 | 20 pts (20% of flood sub-score) |

---

### Final Score Composition

#### Campus Operations

| Category | Weight |
|---|---|
| Severe Weather | 45% |
| Winter Hazards | 20% |
| Flood Hazard | 20% |
| Heat Hazards | 5% |
| Wind | 10% |

#### Outdoor Exposure

Base weights (no outdoor event):

| Category | Weight |
|---|---|
| Severe Weather | 40% |
| Winter Hazards | 15% |
| Flood Hazard | 5% |
| Heat Hazards | 25% |
| Wind | 15% |

##### Outdoor Exposure — Event Modifier

When a major outdoor event is scheduled, the weights shift to reflect that large assembled crowds face greater exposure to real-time hazards (severe weather, heat, wind) than to accumulation-style hazards (winter ice, flooding). The weight shift also scales with estimated attendance.

| Attendance | Severe | Winter | Flood | Heat | Wind |
|---|---|---|---|---|---|
| No event (base) | 40% | 15% | 5% | 25% | 15% |
| Fewer than 100 | 42% | 12% | 3% | 27% | 16% |
| 100 – 1,000 | 45% | 7% | 2% | 29% | 17% |
| 1,000 – 5,000 | 48% | 2% | 1% | 31% | 18% |
| 5,000+ | 50% | 0% | 0% | 33% | 17% |

All rows sum to 100%. The modifier only affects the Outdoor Exposure score — Campus Operations and Travel weights are unchanged.

#### Road & Travel

Travel is calculated directly from its sub-scorer (see Travel section above) and is not composed from category weights. It stands alone.

---

## Forecast Confidence

Forecast confidence (Low / Moderate / High) is entered by the assessor and displayed in the results header and condition summary. It does not alter any scores.

ts purpose is to flag to decision makers whether the underlying forecast data is well-established or subject to significant change before the assessment window.

---

## What the scores do not account for

- **Campus-specific infrastructure** — the tool does not know whether a specific building has been pre-treated, which walkways are sheltered, or which parking lots drain poorly.
- **Population vulnerability** — it does not account for the specific composition of who is on campus (e.g., a large population of international students unfamiliar with Oklahoma tornado procedures, or a disability services event).
- **Forecast error** — all inputs are only as accurate as the forecast data entered.
- **Real-time evolution** — the tool is designed for day-before predictive use. Conditions that evolve rapidly on the day of may require reassessment with updated inputs.

---
