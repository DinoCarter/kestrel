/**
 * Weather Decision Support Tool
 * Oklahoma State University — Office of Emergency Management
 * script.js — Scoring logic, condition summary, and PDF export
 *
 * ARCHITECTURE NOTES:
 * - All scoring is done in calculateScores()
 * - Each hazard category produces a sub-score (0–100 scale)
 * - Sub-scores are weighted into two final scores:
 *     opsScore    = Campus Operations (closure / delay decisions)
 *     outdoorScore = Outdoor Exposure (tours, events, outside work)
 * - Road/travel is a third standalone score affecting ops heavily
 * - A tornado warning or active lightning hard-overrides relevant scores to Red
 * - No external dependencies — runs entirely in the browser
 */

// ── CLOCK ──────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
}
updateClock();
setInterval(updateClock, 30000);

// Set today's date as default
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('assessment-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
});

// ── SCORING WEIGHTS ─────────────────────────────────────────
/**
 * Each category contributes a weighted percentage to each score.
 * Weights must sum to 1.0 for each score type.
 *
 * Categories:
 *   severe    — NWS alert level, tornado watch, hail
 *   winter    — ice, snow, wind chill, precip type, freeze-thaw
 *   heat      — heat index / WBGT
 *   wind      — sustained wind and gusts
 *   travel    — road conditions, ODOT advisory, walkways, visibility
 */
const WEIGHTS = {
  ops: {
    severe: 0.35,
    winter: 0.30,
    heat:   0.05,
    wind:   0.10,
    travel: 0.20
  },
  outdoor: {
    severe: 0.30,
    winter: 0.20,
    heat:   0.30,
    wind:   0.15,
    travel: 0.05
  }
};

// ── SCORING HELPERS ─────────────────────────────────────────
/**
 * Returns integer value of a select element.
 * Returns 0 if element not found or value is not numeric.
 */
function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseInt(el.value, 10);
  return isNaN(v) ? 0 : v;
}

/**
 * Maps a raw 0–3 tier value to a 0–100 subscale score.
 * Tier 0 = no risk, Tier 3 = maximum contribution.
 * maxPts defines how much this input can contribute (all inputs
 * in a category should sum to 100 at max).
 */
function tierToScore(tier, maxPts) {
  const map = [0, 0.33, 0.67, 1.0];
  return Math.round(map[Math.min(tier, 3)] * maxPts);
}

// ── CATEGORY SCORERS ────────────────────────────────────────

function scoreSevere() {
  // NWS alert: 0=none, 1=statement, 2=advisory, 3=watch, 4=warning, 5=tornado/PDS
  // Mapped to 0–60 pts; tornado watch adds 20 pts; hail adds 20 pts
  const alertPts = [0, 10, 20, 40, 60, 90][getVal('nws-alert')] || 0;
  const watchPts = [0, 20, 35][getVal('tornado-watch')] || 0;
  const hailPts  = [0, 10, 20][getVal('hail')] || 0;
  return Math.min(100, alertPts + watchPts + hailPts);
}

function scoreWinter() {
  const icePts      = tierToScore(getVal('ice-accum'),   40); // ice weighted heaviest
  const snowPts     = tierToScore(getVal('snow-accum'),  20);
  const windChillPts= tierToScore(getVal('wind-chill'),  20);
  const precipPts   = tierToScore(getVal('precip-type'), 15);
  const freezePts   = getVal('freeze-thaw') === 1 ? 10 : 0;  // binary bonus
  return Math.min(100, icePts + snowPts + windChillPts + precipPts + freezePts);
}

function scoreHeat() {
  const wbgt = getVal('wbgt');
  // If WBGT is entered (value >= 0), it overrides heat index
  if (wbgt >= 0) {
    return tierToScore(wbgt, 100);
  }
  return tierToScore(getVal('heat-index'), 100);
}

function scoreWind() {
  const windPts  = tierToScore(getVal('wind-speed'), 60);
  const gustPts  = tierToScore(getVal('wind-gusts'), 40);
  return Math.min(100, windPts + gustPts);
}

function scoreTravel() {
  const roadPts  = tierToScore(getVal('road-conditions'),  45);
  const odotPts  = tierToScore(getVal('odot-advisory'),    35);
  const walkPts  = tierToScore(getVal('campus-walkways'),  15);
  const visPts   = tierToScore(getVal('visibility'),       10);
  return Math.min(100, roadPts + odotPts + walkPts + visPts);
}

// ── FINAL SCORE CALCULATION ─────────────────────────────────

function calculateScores() {
  const severe = scoreSevere();
  const winter = scoreWinter();
  const heat   = scoreHeat();
  const wind   = scoreWind();
  const travel = scoreTravel();

  // Weighted composites
  let opsScore = Math.round(
    severe * WEIGHTS.ops.severe +
    winter * WEIGHTS.ops.winter +
    heat   * WEIGHTS.ops.heat   +
    wind   * WEIGHTS.ops.wind   +
    travel * WEIGHTS.ops.travel
  );

  let outdoorScore = Math.round(
    severe * WEIGHTS.outdoor.severe +
    winter * WEIGHTS.outdoor.winter +
    heat   * WEIGHTS.outdoor.heat   +
    wind   * WEIGHTS.outdoor.wind   +
    travel * WEIGHTS.outdoor.travel
  );

  let travelScore = travel; // standalone

  // ── HARD OVERRIDES ──
  const tornadoWarning = getVal('nws-alert') === 5;
  const lightningActive = getVal('lightning') === 1;

  let opsOverride     = null;
  let outdoorOverride = null;

  if (tornadoWarning) {
    opsScore     = 100;
    outdoorScore = 100;
    opsOverride     = 'Tornado Warning / PDS in effect — automatic Red.';
    outdoorOverride = 'Tornado Warning / PDS in effect — automatic Red.';
  }

  if (lightningActive && !tornadoWarning) {
    outdoorScore    = 100;
    outdoorOverride = 'Active lightning warning within 8 miles — outdoor exposure automatic Red.';
  }

  // Clamp scores to 0–100
  opsScore     = Math.min(100, Math.max(0, opsScore));
  outdoorScore = Math.min(100, Math.max(0, outdoorScore));
  travelScore  = Math.min(100, Math.max(0, travelScore));

  // Build condition summary
  const conditions = buildConditionSummary(
    severe, winter, heat, wind, travel,
    tornadoWarning, lightningActive
  );

  // Render everything
  renderResults(opsScore, outdoorScore, travelScore, conditions, opsOverride, outdoorOverride);
}

// ── STOPLIGHT LOGIC ─────────────────────────────────────────

function scoreToLevel(score) {
  if (score < 30) return { level: 'green',  label: 'Normal Operations' };
  if (score < 55) return { level: 'yellow', label: 'Elevated Caution' };
  if (score < 75) return { level: 'orange', label: 'High Risk' };
  return               { level: 'red',    label: 'Severe Risk' };
}

const SCORE_DESCRIPTIONS = {
  ops: {
    green:  'Weather conditions do not indicate a need for operational changes.',
    yellow: 'Monitor conditions closely. Begin contingency planning.',
    orange: 'Seriously consider delayed start, early release, or modified operations.',
    red:    'Closure or suspension of normal operations strongly indicated.'
  },
  outdoor: {
    green:  'Outdoor activities can proceed normally. Stay weather-aware.',
    yellow: 'Outdoor activities should be monitored. Plan for quick modifications.',
    orange: 'Outdoor activities should be modified, shortened, or moved indoors.',
    red:    'Outdoor activities should be cancelled or suspended.'
  },
  travel: {
    green:  'Travel conditions are normal.',
    yellow: 'Allow extra travel time. Reduce speed in wet conditions.',
    orange: 'Travel is hazardous. Essential travel only; notify commuters.',
    red:    'Travel is extremely dangerous. Campus access may be restricted.'
  }
};

// ── CONDITION SUMMARY BUILDER ────────────────────────────────

function buildConditionSummary(severe, winter, heat, wind, travel, tornadoWarning, lightningActive) {
  const items = [];
  const county = getCountyLabel();
  const window = getWindowLabel();

  // Helper: pick color based on sub-score
  function riskColor(score) {
    if (score < 30) return 'green';
    if (score < 55) return 'yellow';
    if (score < 75) return 'orange';
    return 'red';
  }

  // ── Overrides ──
  if (tornadoWarning) {
    items.push({ color: 'red', icon: 'Tornado',
      text: `Tornado Warning or PDS Tornado Watch is active in or near ${county}. All outdoor activities should be suspended immediately and shelter-in-place protocols activated.` });
  }
  if (lightningActive) {
    items.push({ color: 'red', icon: 'Lightning',
      text: `Active lightning detected within 8 miles. All outdoor activities must suspend immediately per the 30-30 rule. Do not resume until 30 minutes after the last lightning strike.` });
  }

  // ── Severe weather ──
  const nwsAlert = getVal('nws-alert');
  const alertLabels = ['', 'Special Weather Statement', 'Advisory', 'Watch', 'Warning', 'Tornado Warning / PDS / Emergency'];
  if (nwsAlert > 0 && !tornadoWarning) {
    items.push({ color: riskColor(severe), icon: 'Severe Weather',
      text: `NWS has issued a ${alertLabels[nwsAlert]} for ${county} during the ${window}. Monitor official NWS products for updates.` });
  }
  const tornadoWatch = getVal('tornado-watch');
  if (tornadoWatch > 0 && !tornadoWarning) {
    items.push({ color: riskColor(severe), icon: 'Tornado Watch',
      text: tornadoWatch === 2
        ? `A Particularly Dangerous Situation (PDS) Tornado Watch is in effect. This is an elevated threat level — identify shelter locations and notify campus community now.`
        : `A Tornado Watch is in effect for ${county}. Conditions are favorable for tornado development. Identify shelter locations and stay alert for warnings.` });
  }
  if (getVal('hail') === 2) {
    items.push({ color: 'orange', icon: 'Hail',
      text: `Large hail (≥1") is possible during the ${window}. Damage to vehicles, equipment, and outdoor structures is a concern. Advise campus community to shelter vehicles if possible.` });
  }

  // ── Winter ──
  const iceLevel = getVal('ice-accum');
  if (iceLevel > 0) {
    const iceMessages = [
      '',
      `Trace to 0.10" of ice accumulation is forecast for ${county} during the ${window}. Walkways and road surfaces may become slippery — pre-treatment and monitoring recommended.`,
      `0.10" – 0.25" of ice accumulation is forecast. This range creates hazardous walking and driving conditions. Delays or modified operations should be considered.`,
      `Ice accumulation exceeding 0.25" is forecast — this meets or exceeds the Ice Storm Warning threshold. Campus operations closure is strongly indicated.`
    ];
    items.push({ color: riskColor(winter), icon: 'Ice', text: iceMessages[iceLevel] });
  }

  const snowLevel = getVal('snow-accum');
  if (snowLevel >= 2) {
    const snowMessages = ['','','3" – 6" of snow is forecast. Plowing and de-icing will be needed; allow extra time for travel and campus access.','More than 6" of snow is forecast. Significant travel and access disruptions expected.'];
    items.push({ color: riskColor(winter), icon: 'Snow', text: snowMessages[snowLevel] });
  }

  const windChill = getVal('wind-chill');
  if (windChill >= 2) {
    items.push({ color: riskColor(winter), icon: 'Wind Chill',
      text: windChill === 3
        ? `Wind chill values below -10°F are forecast. Frostbite can occur in less than 30 minutes. Extended outdoor exposure should not be permitted.`
        : `Wind chill values between -10°F and 0°F are forecast. Outdoor activity should be limited and cold weather PPE required for extended exposure.` });
  }

  if (getVal('freeze-thaw') === 1) {
    items.push({ color: 'orange', icon: 'Freeze-Thaw',
      text: `A freeze-thaw cycle is forecast — temperatures crossing 32°F increase black ice risk, particularly on elevated surfaces, bridge decks, and shadowed walkways. Morning hours are highest risk.` });
  }

  // ── Heat ──
  const wbgt = getVal('wbgt');
  const useWBGT = wbgt >= 0;
  if (useWBGT && wbgt > 0) {
    const wbgtMessages = ['','','WBGT of 85°F – 90°F indicates high heat stress conditions. Outdoor athletic and labor activities should be modified with mandatory rest breaks.','WBGT above 90°F indicates extreme heat stress. Outdoor athletic activities should be suspended. Heat illness risk is high without significant rest and hydration.'];
    items.push({ color: riskColor(heat), icon: 'WBGT', text: wbgtMessages[wbgt] });
  } else if (!useWBGT) {
    const hiLevel = getVal('heat-index');
    if (hiLevel > 0) {
      const hiMessages = ['','Heat index of 90°F – 100°F forecast. Caution is warranted for extended outdoor exposure. Encourage hydration and shade breaks.','Heat index of 100°F – 108°F forecast (Danger range). Outdoor activity should be shortened and high-intensity work rescheduled to cooler hours.','Heat index above 108°F forecast (Extreme Danger). Outdoor activities should be cancelled or moved indoors.'];
      items.push({ color: riskColor(heat), icon: 'Heat Index', text: hiMessages[hiLevel] });
    }
  }

  // ── Wind ──
  const windSpeed = getVal('wind-speed');
  const windGusts = getVal('wind-gusts');
  if (windSpeed >= 2 || windGusts >= 2) {
    const maxWind = Math.max(windSpeed, windGusts);
    const windMessages = ['','','Winds of 35–50 mph with gusts to 60 mph possible. Outdoor structures, signage, and canopies may be unsafe. Outdoor events should be evaluated for relocation.','Sustained winds above 50 mph with extreme gusts are forecast. High wind warning conditions — outdoor activities should not be held.'];
    items.push({ color: riskColor(wind), icon: 'Wind', text: windMessages[Math.min(maxWind, 3)] });
  }

  // ── Travel ──
  const roadLevel = getVal('road-conditions');
  const odotLevel = getVal('odot-advisory');
  if (odotLevel >= 2) {
    const odotMessages = ['','','An ODOT Travel Warning is in effect — non-essential travel should be avoided. Commuter campus staff and students should be notified before attempting travel.','An Emergency Travel Ban is in effect. Campus access for commuters is not recommended. Only essential personnel should be on campus.'];
    items.push({ color: 'red', icon: 'Travel', text: odotMessages[odotLevel] });
  } else if (roadLevel >= 2) {
    const roadMessages = ['','','Patchy ice or snow on primary routes to campus. Commuters should allow significantly more travel time and use caution.','Widespread ice or packed snow on roads. Travel is hazardous. Consider notifying commuter students and staff before morning departure.'];
    items.push({ color: riskColor(travel), icon: 'Roads', text: roadMessages[roadLevel] });
  }

  const walkLevel = getVal('campus-walkways');
  if (walkLevel >= 2) {
    items.push({ color: riskColor(travel), icon: 'Walkways',
      text: walkLevel === 3
        ? `Campus walkways and parking lots have widespread ice — fall risk is significant. Consider limiting outdoor movement and pre-positioning additional salt/sand resources.`
        : `Icy patches have been reported on campus walkways. High-traffic areas should be treated. Advise campus community to use main walkways and exercise caution.` });
  }

  if (getVal('visibility') >= 1) {
    items.push({ color: 'yellow', icon: 'Visibility',
      text: `Reduced visibility due to fog is forecast. Commuters and pedestrians should exercise extra caution. Ensure campus exterior lighting is functional.` });
  }

  // ── All clear ──
  if (items.length === 0) {
    items.push({ color: 'green', icon: 'All Clear',
      text: `No significant weather concerns identified for ${county} during the ${window}. Conditions support normal campus operations and outdoor activities.` });
  }

  return items;
}

// ── RENDER RESULTS ──────────────────────────────────────────

function renderResults(opsScore, outdoorScore, travelScore, conditions, opsOverride, outdoorOverride) {

  const opsLevel     = scoreToLevel(opsScore);
  const outdoorLevel = scoreToLevel(outdoorScore);
  const travelLevel  = scoreToLevel(travelScore);

  // Score cards
  setScoreCard('ops',     opsScore,     opsLevel,     SCORE_DESCRIPTIONS.ops[opsLevel.level],         opsOverride);
  setScoreCard('outdoor', outdoorScore, outdoorLevel, SCORE_DESCRIPTIONS.outdoor[outdoorLevel.level],  outdoorOverride);
  setScoreCard('travel',  travelScore,  travelLevel,  SCORE_DESCRIPTIONS.travel[travelLevel.level],    null);

  // Context line
  document.getElementById('results-context-line').textContent =
    `${getCountyLabel()} · ${getDateLabel()} · ${getWindowLabel()} · Assessed ${new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}` +
    (document.getElementById('assessor-name').value ? ` by ${document.getElementById('assessor-name').value}` : '');

  // Condition list
  const ul = document.getElementById('condition-list');
  ul.innerHTML = '';
  conditions.forEach(c => {
    const li = document.createElement('li');
    li.className = `c-${c.color}`;
    li.innerHTML = `<span class="cond-tag">${c.icon}</span><span>${c.text}</span>`;
    ul.appendChild(li);
  });

  // Show results, scroll to them
  const panel = document.getElementById('results-panel');
  panel.style.display = 'flex';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setScoreCard(id, score, levelObj, description, overrideText) {
  document.getElementById(`dot-${id}`).className    = `stoplight-dot ${levelObj.level}`;
  document.getElementById(`status-${id}`).className = `score-status ${levelObj.level}`;
  document.getElementById(`status-${id}`).textContent = levelObj.label;
  document.getElementById(`number-${id}`).textContent = overrideText ? 'Override' : `Score: ${score}/100`;
  document.getElementById(`desc-${id}`).textContent   = overrideText || description;
  document.getElementById(`score-card-${id}`).className = `score-card ${levelObj.level}`;
}

// ── TOGGLE SUMMARY ──────────────────────────────────────────

function toggleSummary() {
  const summary = document.getElementById('condition-summary');
  const btn     = document.getElementById('summary-toggle');
  const isHidden = summary.style.display === 'none';
  summary.style.display = isHidden ? 'block' : 'none';
  btn.textContent = isHidden ? '▼ Hide Condition Summary' : '▶ View Condition Summary';
  if (isHidden) {
    summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── HELPERS ─────────────────────────────────────────────────

function getCountyLabel() {
  const map = {
    payne: 'Payne County',
    tulsa: 'Tulsa County',
    cherokee: 'Cherokee County'
  };
  return map[document.getElementById('county').value] || 'Selected Location';
}

function getDateLabel() {
  const d = document.getElementById('assessment-date').value;
  if (!d) return 'Date not specified';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getWindowLabel() {
  const map = { full: 'Full Day', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
  return map[document.getElementById('time-window').value] || 'Full Day';
}

// ── RESET ───────────────────────────────────────────────────

function resetForm() {
  // Hide results
  document.getElementById('results-panel').style.display = 'none';
  document.getElementById('condition-summary').style.display = 'none';
  document.getElementById('summary-toggle').textContent = '▶ View Condition Summary';

  // Reset all selects to first option
  document.querySelectorAll('select').forEach(sel => sel.selectedIndex = 0);
  // Reset text inputs
  document.getElementById('assessor-name').value = '';
  document.getElementById('notes').value = '';
  // Reset date to today
  document.getElementById('assessment-date').value = new Date().toISOString().split('T')[0];

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── PDF EXPORT ──────────────────────────────────────────────
/**
 * PDF export uses the browser's built-in print dialog.
 * print styles in styles.css handle layout for the print view.
 * This is reliable, requires no dependencies, and produces
 * a clean record that can be saved or printed.
 *
 * NOTE: For future versions, a proper PDF library (like jsPDF
 * or Puppeteer on a server) would give more control over
 * formatting. The print approach is the right call for a
 * zero-dependency HTML tool.
 */
function exportPDF() {
  // Make sure summary is visible for the print
  const summary = document.getElementById('condition-summary');
  const wasHidden = summary.style.display === 'none';
  summary.style.display = 'block';

  // Build a print-friendly title
  const origTitle = document.title;
  document.title = `OSU Weather Assessment — ${getCountyLabel()} — ${getDateLabel()}`;

  window.print();

  // Restore state after print dialog closes
  document.title = origTitle;
  if (wasHidden) summary.style.display = 'none';
}
