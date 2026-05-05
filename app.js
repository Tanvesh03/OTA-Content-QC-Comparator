/**
 * OTA Content QC Comparator - Core Logic
 * Compares property website content vs OTA listings
 */

// ===== UTILITY FUNCTIONS =====

function normalize(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function similarity(a, b) {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  a = normalize(a);
  b = normalize(b);
  if (a === b) return 100;

  // Word overlap similarity
  const wordsA = new Set(a.split(/\W+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\W+/).filter(w => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) return 100;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return Math.round((intersection / union) * 100);
}

function parseList(text, delimiter = ',') {
  if (!text || !text.trim()) return [];
  const sep = delimiter === 'newline' ? /\n/ : /,/;
  return text.split(sep)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);
}

function scoreToClass(score) {
  if (score >= 85) return 'match';
  if (score >= 50) return 'partial';
  return 'mismatch';
}

function scoreToFillClass(score) {
  if (score >= 85) return '';
  if (score >= 50) return 'warning';
  return 'danger';
}

function getStatusLabel(score) {
  if (score >= 85) return 'Match';
  if (score >= 50) return 'Partial';
  return 'Mismatch';
}

function getOverallGrade(score) {
  if (score >= 85) return { label: 'Excellent', cls: 'excellent' };
  if (score >= 70) return { label: 'Good', cls: 'good' };
  if (score >= 50) return { label: 'Fair', cls: 'fair' };
  return { label: 'Poor — Review Required', cls: 'poor' };
}

// ===== COMPARISON FUNCTIONS =====

function compareName(webName, otaName) {
  const score = similarity(webName, otaName);
  return { score, webVal: webName || '—', otaVal: otaName || '—' };
}

function compareDescription(webDesc, otaDesc) {
  const score = similarity(webDesc, otaDesc);
  const webLen = webDesc ? webDesc.split(/\s+/).length : 0;
  const otaLen = otaDesc ? otaDesc.split(/\s+/).length : 0;
  const lenDiff = Math.abs(webLen - otaLen);
  const lenNote = lenDiff > 50
    ? `Word count differs by ${lenDiff} words (Website: ${webLen}, OTA: ${otaLen}). Consider aligning descriptions.`
    : null;
  return { score, webLen, otaLen, lenNote };
}

function compareAmenities(webText, otaText) {
  const webList = parseList(webText, ',');
  const otaList = parseList(otaText, ',');

  if (webList.length === 0 && otaList.length === 0) return { score: 100, matched: [], missingOnOTA: [], extraOnOTA: [] };

  const webSet = new Set(webList);
  const otaSet = new Set(otaList);

  const matched = [];
  const missingOnOTA = [];
  const extraOnOTA = [];

  for (const item of webSet) {
    // Fuzzy match: check if similar item exists
    const found = [...otaSet].find(o => similarity(item, o) >= 75);
    if (found) matched.push(item);
    else missingOnOTA.push(item);
  }
  for (const item of otaSet) {
    const found = [...webSet].find(w => similarity(item, w) >= 75);
    if (!found) extraOnOTA.push(item);
  }

  const total = new Set([...webList, ...otaList]).size;
  const score = total > 0 ? Math.round((matched.length / (matched.length + missingOnOTA.length + extraOnOTA.length)) * 100) : 100;
  return { score, matched, missingOnOTA, extraOnOTA };
}

function compareHouseRules(webText, otaText) {
  const webList = parseList(webText, 'newline');
  const otaList = parseList(otaText, 'newline');

  if (webList.length === 0 && otaList.length === 0) return { score: 100, matched: [], missingOnOTA: [], extraOnOTA: [] };

  const matched = [];
  const missingOnOTA = [];
  const extraOnOTA = [];

  const otaRemaining = [...otaList];
  for (const rule of webList) {
    const idx = otaRemaining.findIndex(o => similarity(rule, o) >= 65);
    if (idx !== -1) {
      matched.push(rule);
      otaRemaining.splice(idx, 1);
    } else {
      missingOnOTA.push(rule);
    }
  }
  for (const rule of otaRemaining) {
    const found = webList.find(w => similarity(rule, w) >= 65);
    if (!found) extraOnOTA.push(rule);
  }

  const total = matched.length + missingOnOTA.length + extraOnOTA.length;
  const score = total > 0 ? Math.round((matched.length / total) * 100) : 100;
  return { score, matched, missingOnOTA, extraOnOTA };
}

function comparePhotos(webCount, otaCount) {
  const w = parseInt(webCount) || 0;
  const o = parseInt(otaCount) || 0;
  if (w === 0 && o === 0) return { score: null, diff: 0, webVal: w, otaVal: o };
  if (w === 0 || o === 0) return { score: 0, diff: Math.abs(w - o), webVal: w, otaVal: o };
  const diff = Math.abs(w - o);
  const maxVal = Math.max(w, o);
  const score = Math.round(((maxVal - diff) / maxVal) * 100);
  return { score: Math.max(0, score), diff, webVal: w, otaVal: o };
}

function comparePrice(webPrice, otaPrice) {
  const w = parseFloat(webPrice) || 0;
  const o = parseFloat(otaPrice) || 0;
  if (w === 0 && o === 0) return { score: null, diff: 0, pctDiff: 0, webVal: w, otaVal: o };
  if (w === 0 || o === 0) return { score: 0, diff: Math.abs(w - o), pctDiff: 100, webVal: w, otaVal: o };
  const diff = Math.abs(w - o);
  const pctDiff = Math.round((diff / Math.max(w, o)) * 100);
  let score;
  if (pctDiff <= 5) score = 100;
  else if (pctDiff <= 15) score = 75;
  else if (pctDiff <= 30) score = 50;
  else score = 20;
  return { score, diff: diff.toFixed(2), pctDiff, webVal: w, otaVal: o };
}

// ===== RENDER FUNCTIONS =====

function updateScoreCard(id, score, label) {
  const card = document.getElementById(id);
  if (!card) return;
  const valueEl = card.querySelector('.score-value');
  const fillEl = card.querySelector('.score-fill');

  if (score === null) {
    valueEl.textContent = 'N/A';
    valueEl.className = 'score-value na';
    fillEl.style.width = '0%';
    fillEl.className = 'score-fill';
  } else {
    valueEl.textContent = score + '%';
    valueEl.className = 'score-value ' + scoreToClass(score);
    fillEl.style.width = score + '%';
    fillEl.className = 'score-fill ' + scoreToFillClass(score);
  }
}

function renderDiffList(items, type) {
  if (items.length === 0) return '';
  const icons = { match: '✓', missing: '✗', extra: '+' };
  const badges = { match: 'Match', missing: 'Missing on OTA', extra: 'Extra on OTA' };
  return items.map(item =>
    `<li class="diff-item ${type}">
      <span class="diff-item-icon">${icons[type]}</span>
      <span class="diff-item-text">${escHtml(capitalizeFirst(item))}</span>
      <span class="diff-item-badge">${badges[type]}</span>
    </li>`
  ).join('');
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function renderListDiff(matched, missingOnOTA, extraOnOTA) {
  if (matched.length === 0 && missingOnOTA.length === 0 && extraOnOTA.length === 0) {
    return '<p style="color: var(--text-muted); font-size: 13px;">No items to compare.</p>';
  }
  return `<ul class="diff-list">
    ${renderDiffList(matched, 'match')}
    ${renderDiffList(missingOnOTA, 'missing')}
    ${renderDiffList(extraOnOTA, 'extra')}
  </ul>`;
}

function renderResultBlock(title, score, bodyHtml, note) {
  const statusLabel = score === null ? 'N/A' : getStatusLabel(score);
  const statusCls = score === null ? 'na' : scoreToClass(score);
  const noteHtml = note ? `<div class="result-note">&#9432; ${escHtml(note)}</div>` : '';
  return `
    <div class="result-block">
      <div class="result-block-header">
        <span class="result-block-title">${title}</span>
        <span class="status-pill ${statusCls}">${statusLabel}</span>
      </div>
      <div class="result-block-body">
        ${bodyHtml}
        ${noteHtml}
      </div>
    </div>`;
}

function renderCompareGrid(webLabel, otaLabel, webVal, otaVal) {
  return `<div class="compare-grid">
    <div>
      <div class="compare-col-label website">${webLabel}</div>
      <div class="compare-value">${escHtml(String(webVal || '—'))}</div>
    </div>
    <div>
      <div class="compare-col-label ota">${otaLabel}</div>
      <div class="compare-value">${escHtml(String(otaVal || '—'))}</div>
    </div>
  </div>`;
}

function renderSimilarityMeter(score) {
  if (score === null) return '';
  const cls = scoreToFillClass(score);
  const color = cls === '' ? 'var(--success)' : cls === 'warning' ? 'var(--warning)' : 'var(--danger)';
  return `<div class="similarity-row">
    <span>Content Similarity</span>
    <div class="similarity-bar"><div class="similarity-fill" style="width:${score}%; background:${color};"></div></div>
    <span style="min-width:40px; text-align:right; color:${color}; font-weight:700;">${score}%</span>
  </div>`;
}

// ===== MAIN COMPARISON =====

function runComparison() {
  const webName = document.getElementById('website-name').value.trim();
  const webDesc = document.getElementById('website-description').value.trim();
  const webAmenities = document.getElementById('website-amenities').value.trim();
  const webRules = document.getElementById('website-rules').value.trim();
  const webPhotos = document.getElementById('website-photos').value.trim();
  const webPrice = document.getElementById('website-price').value.trim();

  const otaName = document.getElementById('ota-name').value.trim();
  const otaDesc = document.getElementById('ota-description').value.trim();
  const otaAmenities = document.getElementById('ota-amenities').value.trim();
  const otaRules = document.getElementById('ota-rules').value.trim();
  const otaPhotos = document.getElementById('ota-photos').value.trim();
  const otaPrice = document.getElementById('ota-price').value.trim();
  const otaPlatform = document.getElementById('ota-platform').value;

  // Run comparisons
  const nameResult = compareName(webName, otaName);
  const descResult = compareDescription(webDesc, otaDesc);
  const amenitiesResult = compareAmenities(webAmenities, otaAmenities);
  const rulesResult = compareHouseRules(webRules, otaRules);
  const photosResult = comparePhotos(webPhotos, otaPhotos);
  const priceResult = comparePrice(webPrice, otaPrice);

  // Update score cards
  updateScoreCard('score-name', nameResult.score, 'Name');
  updateScoreCard('score-desc', descResult.score, 'Description');
  updateScoreCard('score-amenities', amenitiesResult.score, 'Amenities');
  updateScoreCard('score-rules', rulesResult.score, 'Rules');
  updateScoreCard('score-photos', photosResult.score, 'Photos');
  updateScoreCard('score-price', priceResult.score, 'Price');

  // Calculate overall score
  const scores = [nameResult.score, descResult.score, amenitiesResult.score, rulesResult.score];
  if (photosResult.score !== null) scores.push(photosResult.score);
  if (priceResult.score !== null) scores.push(priceResult.score);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const grade = getOverallGrade(overallScore);

  const badge = document.getElementById('overall-score-badge');
  badge.textContent = 'Overall: ' + overallScore + '% — ' + grade.label;
  badge.className = 'overall-score-badge ' + grade.cls;

  // Build detailed results
  const platformName = { airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'VRBO', expedia: 'Expedia', other: 'OTA' }[otaPlatform] || 'OTA';
  let detailHtml = '';

  // Name block
  detailHtml += renderResultBlock(
    'Property Name',
    nameResult.score,
    renderCompareGrid('Website Name', platformName + ' Name', webName || '—', otaName || '—') +
    renderSimilarityMeter(nameResult.score)
  );

  // Description block
  detailHtml += renderResultBlock(
    'Property Description',
    descResult.score,
    renderSimilarityMeter(descResult.score) +
    `<div style="margin-top:10px; font-size:13px; color:var(--text-muted);">
      Website: <strong style="color:var(--text);">${descResult.webLen}</strong> words &nbsp;|&nbsp;
      ${platformName}: <strong style="color:var(--text);">${descResult.otaLen}</strong> words
    </div>`,
    descResult.lenNote
  );

  // Amenities block
  const amenBody = renderListDiff(amenitiesResult.matched, amenitiesResult.missingOnOTA, amenitiesResult.extraOnOTA);
  detailHtml += renderResultBlock(
    'Amenities',
    amenitiesResult.score,
    amenBody,
    amenitiesResult.missingOnOTA.length > 0
      ? `${amenitiesResult.missingOnOTA.length} amenity(ies) on website not found on ${platformName}. Update OTA listing to include all amenities.`
      : null
  );

  // House Rules block
  const rulesBody = renderListDiff(rulesResult.matched, rulesResult.missingOnOTA, rulesResult.extraOnOTA);
  detailHtml += renderResultBlock(
    'House Rules',
    rulesResult.score,
    rulesBody,
    rulesResult.missingOnOTA.length > 0
      ? `${rulesResult.missingOnOTA.length} rule(s) on website not reflected on ${platformName}. Ensure all rules are communicated to guests.`
      : null
  );

  // Photos block
  let photosBody;
  if (photosResult.score === null) {
    photosBody = '<p style="color:var(--text-muted); font-size:13px;">No photo counts provided.</p>';
  } else {
    photosBody = renderCompareGrid('Website Photos', platformName + ' Photos', photosResult.webVal, photosResult.otaVal) +
      renderSimilarityMeter(photosResult.score);
  }
  detailHtml += renderResultBlock(
    'Photo Count',
    photosResult.score,
    photosBody,
    photosResult.diff > 5 ? `Photo count differs by ${photosResult.diff}. Ensure consistent visual representation across channels.` : null
  );

  // Price block
  let priceBody;
  if (priceResult.score === null) {
    priceBody = '<p style="color:var(--text-muted); font-size:13px;">No price data provided.</p>';
  } else {
    priceBody = renderCompareGrid('Website Price', platformName + ' Price',
      priceResult.webVal ? `$${priceResult.webVal}` : '—',
      priceResult.otaVal ? `$${priceResult.otaVal}` : '—') +
      renderSimilarityMeter(priceResult.score);
  }
  detailHtml += renderResultBlock(
    'Price per Night',
    priceResult.score,
    priceBody,
    priceResult.pctDiff > 15 ? `Price differs by ${priceResult.pctDiff}% ($${priceResult.diff}). Review channel pricing strategy.` : null
  );

  document.getElementById('detailed-results').innerHTML = detailHtml;
  document.getElementById('results-section').style.display = 'block';
  document.getElementById('export-btn').style.display = 'flex';
  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== CLEAR ALL =====

function clearAll() {
  const ids = ['website-name', 'website-description', 'website-amenities', 'website-rules', 'website-photos', 'website-price',
                'ota-name', 'ota-description', 'ota-amenities', 'ota-rules', 'ota-photos', 'ota-price'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('export-btn').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== EXPORT REPORT =====

function exportReport() {
  const webName = document.getElementById('website-name').value || 'Property';
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const resultsHtml = document.getElementById('results-section').innerHTML;
  const platform = document.getElementById('ota-platform');
  const platformName = platform ? platform.options[platform.selectedIndex].text : 'OTA';

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>QC Report - ${escHtml(webName)}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 24px; background: #fff; color: #1a1a2e; }
    h1 { color: #4f8ef7; }
    .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
    ${document.querySelector('style') ? '' : ''}
  </style>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <h1>OTA Content QC Report</h1>
  <div class="meta">
    Property: <strong>${escHtml(webName)}</strong> &nbsp;|&nbsp;
    Platform: <strong>${escHtml(platformName)}</strong> &nbsp;|&nbsp;
    Generated: ${now}
  </div>
  ${resultsHtml}
</body>
</html>`;

  const blob = new Blob([reportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `QC-Report-${webName.replace(/\s+/g, '-')}-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
