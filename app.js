/* ============================================================
   Admission Predictor v2 - Full Feature Set
   Multi-select, global similarity, month projection, theme
   ============================================================ */

var RAW = [];
var regionCenterMap = {};
var allCenterRegionMap = {};
var charts = {};
var selectedRegions = [];
var selectedCenters = [];

// ── Theme Toggle ────────────────────────────────────────────
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
(function initTheme() {
  var saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// ── Auto-load CSV ───────────────────────────────────────────
(function autoLoadCSV() {
  showLoading(true, 'Loading admission data...');
  fetch('data.csv').then(function(r) {
    if (!r.ok) throw new Error('Data file not found');
    return r.text();
  }).then(function(csv) {
    parseCSV(csv);
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('fileInfo').textContent = 'Auto-loaded: ' + RAW.length + ' records';
    document.getElementById('fileInfo').classList.add('show');
    document.getElementById('controlsBar').style.display = 'flex';
    buildMultiSelects();
    showLoading(false);
  }).catch(function(e) {
    showLoading(false);
    document.getElementById('uploadSection').style.display = '';
    document.getElementById('errorMsg').textContent = 'Data load failed: ' + e.message;
    document.getElementById('errorBanner').classList.add('show');
  });
})();

// ── File Upload ─────────────────────────────────────────────
document.getElementById('csvFile').addEventListener('change', function(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    parseCSV(ev.target.result);
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('fileInfo').textContent = 'Loaded: ' + file.name + ' (' + RAW.length + ' records)';
    document.getElementById('fileInfo').classList.add('show');
    document.getElementById('controlsBar').style.display = 'flex';
    buildMultiSelects();
  };
  reader.readAsText(file);
});

function loadFromUrl() {
  var url = document.getElementById('csvUrl').value.trim();
  if (!url) { showError('Pehle URL daalo.'); return; }
  showLoading(true, 'Fetching CSV...');
  fetch(url).then(function(r) { return r.text(); }).then(function(csv) {
    parseCSV(csv);
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('fileInfo').textContent = 'Loaded from URL (' + RAW.length + ' records)';
    document.getElementById('fileInfo').classList.add('show');
    document.getElementById('controlsBar').style.display = 'flex';
    buildMultiSelects();
    showLoading(false);
  }).catch(function(e) { showLoading(false); showError('URL se data load nahi hua.'); });
}

// ── CSV Parser ──────────────────────────────────────────────
function parseCSV(text) {
  var lines = text.split('\n');
  RAW = []; regionCenterMap = {}; allCenterRegionMap = {};
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim(); if (!line) continue;
    var parts = parseCSVLine(line);
    if (parts.length < 4) continue;
    var dateStr = parts[0].replace(/"/g, '').trim();
    var region = parts[1].replace(/"/g, '').trim();
    var center = parts[2].replace(/"/g, '').trim();
    var admissions = parseInt(parts[3].replace(/"/g, '').trim(), 10);
    if (!dateStr || isNaN(admissions)) continue;
    var d = new Date(dateStr); if (isNaN(d.getTime())) continue;
    var cycleWeek = getCycleWeek(d);
    RAW.push({
      date: d, dateStr: dateStr, year: d.getFullYear(),
      month: d.getMonth() + 1, day: d.getDate(),
      cycleWeek: cycleWeek, cycleYear: getCycleYear(d),
      region: region, center: center, admissions: admissions
    });
    if (!regionCenterMap[region]) regionCenterMap[region] = {};
    regionCenterMap[region][center] = true;
    allCenterRegionMap[center] = region;
  }
    RAW.sort(function(a, b) { return a.date - b.date; });
  // Compute per-center week numbers: week 1 = first admission date of each center
  var centerFirstDate = {};
  RAW.forEach(function(r) {
    if (!centerFirstDate[r.center] || r.date < centerFirstDate[r.center]) centerFirstDate[r.center] = r.date;
  });
  RAW.forEach(function(r) {
    var first = centerFirstDate[r.center];
    var daysDiff = Math.floor((r.date - first) / 86400000);
    r.cycleWeek = Math.floor(daysDiff / 7) + 1;
  });
}

function parseCSVLine(line) {
  var result = [], current = '', inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; } }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

function getCycleYear(d) {
  var m = d.getMonth() + 1, y = d.getFullYear();
  if (m >= 9) return y + '-' + (y + 1);
  return (y - 1) + '-' + y;
}

function getCycleWeek(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  var monthOffset = m >= 9 ? m - 9 : m + 3;
  return monthOffset * 4 + Math.ceil(day / 7);
}

// ── Multi-Select Component ──────────────────────────────────
function buildMultiSelects() {
  buildMS('regionDropdown', Object.keys(regionCenterMap).sort(), function() { updateCenterOptions(); });
  updateCenterOptions();
}

function buildMS(dropdownId, items, onChange) {
  var dd = document.getElementById(dropdownId);
  var prefix = dropdownId === 'regionDropdown' ? 'region' : 'center';
  var html = '';
  html += '<div class="ms-actions"><button onclick="selectAllMS(\'' + prefix + '\')">Select All</button>';
  html += '<button onclick="clearAllMS(\'' + prefix + '\')">Clear All</button></div>';
  items.forEach(function(item) {
    html += '<label class="ms-option"><input type="checkbox" value="' + esc(item) + '" onchange="onMSChange(\'' + prefix + '\')">' + esc(item) + '</label>';
  });
  dd.innerHTML = html;
  dd._onChange = onChange;
}

function toggleMS(id) {
  var el = document.getElementById(id);
  var wasOpen = el.classList.contains('open');
  // Close all
  document.querySelectorAll('.multi-select').forEach(function(ms) { ms.classList.remove('open'); });
  if (!wasOpen) el.classList.add('open');
}

function selectAllMS(prefix) {
  var dd = document.getElementById(prefix + 'Dropdown');
  dd.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = true; });
  onMSChange(prefix);
}
function clearAllMS(prefix) {
  var dd = document.getElementById(prefix + 'Dropdown');
  dd.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
  onMSChange(prefix);
}

function onMSChange(prefix) {
  var dd = document.getElementById(prefix + 'Dropdown');
  var trigger = document.getElementById(prefix + 'MS').querySelector('.ms-trigger');
  var checked = [];
  dd.querySelectorAll('input[type="checkbox"]:checked').forEach(function(cb) { checked.push(cb.value); });
  if (prefix === 'region') selectedRegions = checked;
  else selectedCenters = checked;

  var total = dd.querySelectorAll('input[type="checkbox"]').length;
  if (checked.length === 0) trigger.textContent = prefix === 'region' ? 'All Regions' : 'All Centers';
  else if (checked.length === total) trigger.textContent = 'All Selected (' + total + ')';
  else if (checked.length <= 2) trigger.textContent = checked.join(', ');
  else trigger.textContent = checked.length + ' selected';

  // Cascade: if regions changed, update centers
  if (prefix === 'region') updateCenterOptions();
}

function updateCenterOptions() {
  var dd = document.getElementById('centerDropdown');
  var allCenters = {};
  if (selectedRegions.length === 0) {
    // Show all
    Object.keys(regionCenterMap).forEach(function(r) {
      Object.keys(regionCenterMap[r]).forEach(function(c) { allCenters[c] = r; });
    });
  } else {
    selectedRegions.forEach(function(r) {
      if (regionCenterMap[r]) Object.keys(regionCenterMap[r]).forEach(function(c) { allCenters[c] = r; });
    });
  }
  var items = Object.keys(allCenters).sort();
  buildMS('centerDropdown', items, null);
  // Restore previously selected if still valid
  var dd2 = document.getElementById('centerDropdown');
  dd2.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    if (selectedCenters.indexOf(cb.value) !== -1) cb.checked = true;
  });
  // Update trigger text
  var trigger = document.getElementById('centerMS').querySelector('.ms-trigger');
  var checkedNow = dd2.querySelectorAll('input[type="checkbox"]:checked').length;
  if (checkedNow === 0) trigger.textContent = 'All Centers';
  else if (checkedNow === items.length) trigger.textContent = 'All Selected (' + items.length + ')';
  else if (checkedNow <= 2) {
    var names = [];
    dd2.querySelectorAll('input[type="checkbox"]:checked').forEach(function(cb) { names.push(cb.value); });
    trigger.textContent = names.join(', ');
  } else trigger.textContent = checkedNow + ' selected';

  selectedCenters = [];
  dd2.querySelectorAll('input[type="checkbox"]:checked').forEach(function(cb) { selectedCenters.push(cb.value); });
}

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.multi-select')) {
    document.querySelectorAll('.multi-select').forEach(function(ms) { ms.classList.remove('open'); });
  }
});

function resetFilters() {
  selectedRegions = []; selectedCenters = [];
  document.getElementById('futureMonths').value = 1;
  document.getElementById('dashboard').classList.remove('show');
  buildMultiSelects();
}

// ── UI Helpers ──────────────────────────────────────────────
function showError(m) { document.getElementById('errorMsg').textContent = m; document.getElementById('errorBanner').classList.add('show'); }
function hideError() { document.getElementById('errorBanner').classList.remove('show'); }
function showLoading(s, t) {
  var e = document.getElementById('loadingOverlay');
  if (s) { e.classList.remove('hidden'); if (t) document.getElementById('loadingText').textContent = t; }
  else { e.classList.add('hidden'); }
}
function switchTab(el, name) {
  el.parentElement.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  el.closest('.section-card').querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
}
function fmt(n) { return n == null ? '0' : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function esc(s) { return s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
function padL(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }
function fmtDateShort(d) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + months[d.getMonth()];
}
function fmtDateShort2(d) { return fmtDateShort(d); }

// ── Main Analysis ───────────────────────────────────────────
function runAnalysis() {
  hideError(); showLoading(true, 'Processing data...');
  var months = parseInt(document.getElementById('futureMonths').value, 10) || 6;
  document.getElementById('analyzeBtn').disabled = true;

  setTimeout(function() {
    try {
      var data = filterData();
      if (data.length === 0) throw new Error('Selected filters mein koi data nahi hai.');

      var monthly = aggregateByMonth(data);
      var monthlyArr = Object.keys(monthly).sort().map(function(k) { return { month: k, admissions: monthly[k] }; });
      var stats = computeStats(monthlyArr);
      var growth = computeGrowth(monthlyArr);
      var seasonality = detectSeasonality(monthlyArr);
      var weeklyTimeline = computeWeeklyTimeline(data);
      var wca = computeWeeklyCenterAnalysis(data);
      var allWca = computeWeeklyCenterAnalysis(RAW); // ALL centers for similarity
      var cc = computeCenterComparison(data, allWca);
      var boost = generateBoostRecs(wca, cc);
      var pred = predictFuture(monthlyArr, 1);
      var projection = computeMonthProjection(data, monthlyArr);

      var result = {
        records: data, monthlyData: monthlyArr, stats: stats, growth: growth,
        seasonality: seasonality, weeklyTimeline: weeklyTimeline,
        wca: wca, allWca: allWca, cc: cc, boost: boost, predictions: pred,
        projection: projection, filters: {
          regions: selectedRegions.length > 0 ? selectedRegions.join(', ') : 'All',
          centers: selectedCenters.length > 0 ? selectedCenters.join(', ') : 'All'
        }
      };

      showLoading(true, 'Generating report...');
      setTimeout(function() {
        result.aiReport = generateAIReport(result);
        showLoading(false);
        document.getElementById('analyzeBtn').disabled = false;
        renderDashboard(result);
      }, 500);
    } catch (e) {
      showLoading(false);
      document.getElementById('analyzeBtn').disabled = false;
      showError(e.message);
    }
  }, 200);
}

function filterData() {
  var d = RAW;
  if (selectedRegions.length > 0) d = d.filter(function(r) { return selectedRegions.indexOf(r.region) !== -1; });
  if (selectedCenters.length > 0) d = d.filter(function(r) { return selectedCenters.indexOf(r.center) !== -1; });
  return d;
}

function aggregateByMonth(records) {
  var m = {};
  records.forEach(function(r) {
    var key = r.date.getFullYear() + '-' + ('0' + (r.date.getMonth() + 1)).slice(-2);
    m[key] = (m[key] || 0) + r.admissions;
  });
  return m;
}

// ── Stats ───────────────────────────────────────────────────
function computeStats(mArr) {
  var a = mArr.map(function(m) { return m.admissions; });
  var total = a.reduce(function(s, v) { return s + v; }, 0);
  var avg = total / a.length;
  var sorted = a.slice().sort(function(x, y) { return x - y; });
  var median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
  var variance = a.reduce(function(s, v) { return s + Math.pow(v - avg, 2); }, 0) / a.length;
  return {
    total: total, average: Math.round(avg), median: median,
    max: Math.max.apply(null, a), min: Math.min.apply(null, a),
    maxMonth: mArr.filter(function(m) { return m.admissions === Math.max.apply(null, a); })[0].month,
    minMonth: mArr.filter(function(m) { return m.admissions === Math.min.apply(null, a); })[0].month,
    count: a.length, cv: avg > 0 ? Math.round(Math.sqrt(variance) / avg * 100) : 0
  };
}

function computeGrowth(mArr) {
  if (mArr.length < 2) return { mom: 0, trend: 'insufficient' };
  var a = mArr.map(function(m) { return m.admissions; });
  var latest = a[a.length - 1], prev = a[a.length - 2];
  var mom = prev > 0 ? (latest - prev) / prev * 100 : 0;
  var n = a.length, xM = (n - 1) / 2, yM = a.reduce(function(s, v) { return s + v; }, 0) / n;
  var num = 0, den = 0;
  for (var i = 0; i < n; i++) { num += (i - xM) * (a[i] - yM); den += Math.pow(i - xM, 2); }
  var slope = den > 0 ? num / den : 0;
  return { mom: Math.round(mom * 100) / 100, trend: slope > 10 ? 'growing' : slope < -10 ? 'declining' : 'stable' };
}

function detectSeasonality(mArr) {
  var mmap = {};
  mArr.forEach(function(m) { var mn = parseInt(m.month.split('-')[1], 10); if (!mmap[mn]) mmap[mn] = []; mmap[mn].push(m.admissions); });
  var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var avgs = {};
  Object.keys(mmap).forEach(function(n) { avgs[mNames[parseInt(n) - 1]] = Math.round(mmap[n].reduce(function(s, v) { return s + v; }, 0) / mmap[n].length); });
  var keys = Object.keys(avgs);
  var allAvg = keys.length > 0 ? keys.reduce(function(s, k) { return s + avgs[k]; }, 0) / keys.length : 0;
  var peak = keys.reduce(function(a, b) { return avgs[b] > avgs[a] ? b : a; }, keys[0] || 'Jan');
  var low = keys.reduce(function(a, b) { return avgs[b] < avgs[a] ? b : a; }, keys[0] || 'Jan');
  return { monthlyAverages: avgs, peakMonth: { name: peak, avg: avgs[peak] || 0 }, lowMonth: { name: low, avg: avgs[low] || 0 }, overallAvg: Math.round(allAvg) };
}

// ── Weekly Timeline ─────────────────────────────────────────
function computeWeeklyTimeline(records) {
  var cmap = {};
  records.forEach(function(r) {
    var wk = r.cycleWeek;
    if (!cmap[wk]) cmap[wk] = { total: 0, count: 0, minDate: r.date, maxDate: r.date };
    cmap[wk].total += r.admissions;
    cmap[wk].count++;
    if (r.date < cmap[wk].minDate) cmap[wk].minDate = r.date;
    if (r.date > cmap[wk].maxDate) cmap[wk].maxDate = r.date;
  });
  var sorted = Object.keys(cmap).map(Number).sort(function(a, b) { return a - b; });
  var timeline = sorted.map(function(wk) {
    var d = cmap[wk];
    var dateRange = fmtDateShort(d.minDate) + '-' + fmtDateShort(d.maxDate);
    return { cycleWeek: wk, label: 'W' + wk, dateRange: dateRange, total: d.total, avg: Math.round(d.total / d.count), count: d.count };
  });
  var prevTotal = 0;
  timeline.forEach(function(w) {
    w.wowGrowth = prevTotal > 0 ? Math.round((w.total - prevTotal) / prevTotal * 10000) / 100 : 0;
    prevTotal = w.total;
  });
  var totals = timeline.map(function(w) { return w.total; });
  var avgWeekly = totals.length > 0 ? Math.round(totals.reduce(function(a, b) { return a + b; }, 0) / totals.length) : 0;
  timeline.forEach(function(w, i) {
    var window = totals.slice(Math.max(0, i - 3), i + 1);
    w.rolling4 = Math.round(window.reduce(function(a, b) { return a + b; }, 0) / window.length);
  });
  return { timeline: timeline, totalWeeks: timeline.length, avgWeekly: avgWeekly,
    bestWeek: totals.length > 0 ? timeline[totals.indexOf(Math.max.apply(null, totals))] : null,
    worstWeek: totals.length > 0 ? timeline[totals.indexOf(Math.min.apply(null, totals))] : null
  };
}

// ── Center Analysis ─────────────────────────────────────────
function computeWeeklyCenterAnalysis(records) {
  var cmap = {};
  records.forEach(function(r) {
    if (!cmap[r.center]) cmap[r.center] = { region: r.region, weeks: {}, total: 0, weekCount: {}, weekDates: {} };
    var wk = r.cycleWeek;
    if (!cmap[r.center].weeks[wk]) cmap[r.center].weeks[wk] = 0;
    cmap[r.center].weeks[wk] += r.admissions;
    cmap[r.center].total += r.admissions;
    if (!cmap[r.center].weekCount[wk]) cmap[r.center].weekCount[wk] = 0;
    cmap[r.center].weekCount[wk]++;
    if (!cmap[r.center].weekDates[wk]) cmap[r.center].weekDates[wk] = { min: r.date, max: r.date };
    if (r.date < cmap[r.center].weekDates[wk].min) cmap[r.center].weekDates[wk].min = r.date;
    if (r.date > cmap[r.center].weekDates[wk].max) cmap[r.center].weekDates[wk].max = r.date;
  });
  var result = {};
  Object.keys(cmap).forEach(function(c) {
    result[c] = { region: cmap[c].region, total: cmap[c].total, weekStats: cmap[c].weeks, weekCount: cmap[c].weekCount, weekDates: cmap[c].weekDates };
  });
  return result;
}

function computeCenterComparison(records, allWca) {
  var centers = Object.keys(allWca);
  if (centers.length < 2) return { rankings: [], similarity: [], mostSimilar: {}, overall: { total: 0, avgPerCenter: 0 } };
  var totalAdm = 0;
  centers.forEach(function(c) { totalAdm += allWca[c].total; });

  var rankings = centers.map(function(c) {
    var wkCount = Object.keys(allWca[c].weekStats).length;
    return { center: c, region: allWca[c].region, total: allWca[c].total, avg: wkCount > 0 ? Math.round(allWca[c].total / wkCount) : 0 };
  }).sort(function(a, b) { return b.total - a.total; });

  // All-weeks vector for similarity
  var allWeeks = {};
  centers.forEach(function(c) { Object.keys(allWca[c].weekStats).forEach(function(w) { allWeeks[w] = true; }); });
  var weekKeys = Object.keys(allWeeks).sort(function(a, b) { return Number(a) - Number(b); });

  var sim = [];
  for (var i = 0; i < centers.length; i++) {
    for (var j = i + 1; j < centers.length; j++) {
      var c1w = allWca[centers[i]].weeks || allWca[centers[i]].weekStats;
      var c2w = allWca[centers[j]].weeks || allWca[centers[j]].weekStats;
      var c1t = allWca[centers[i]].total, c2t = allWca[centers[j]].total;
      var dist = 0;
      weekKeys.forEach(function(w) {
        var p1 = c1t > 0 ? (c1w[w] || 0) / c1t : 0;
        var p2 = c2t > 0 ? (c2w[w] || 0) / c2t : 0;
        dist += Math.pow(p1 - p2, 2);
      });
      dist = Math.sqrt(dist);
      sim.push({ center1: centers[i], center2: centers[j], distance: dist, similarity: Math.max(0, Math.round((1 - dist) * 10000) / 100) });
    }
  }
  sim.sort(function(a, b) { return b.similarity - a.similarity; });

  var ms = {};
  centers.forEach(function(c) {
    var matches = sim.filter(function(s) { return s.center1 === c || s.center2 === c; });
    ms[c] = matches.length > 0
      ? { similarTo: matches[0].center1 === c ? matches[0].center2 : matches[0].center1, similarity: matches[0].similarity }
      : { similarTo: 'N/A', similarity: 0 };
  });
  return { rankings: rankings, similarity: sim.slice(0, 20), mostSimilar: ms, overall: { total: totalAdm, avgPerCenter: Math.round(totalAdm / centers.length) } };
}

function generateBoostRecs(wca, cc) {
  var recs = {};
  var overallW = {}, overallTotal = 0;
  Object.keys(wca).forEach(function(c) {
    Object.keys(wca[c].weekStats).forEach(function(w) {
      overallW[w] = (overallW[w] || 0) + wca[c].weekStats[w];
      overallTotal += wca[c].weekStats[w];
    });
  });
  var overallPcts = {};
  Object.keys(overallW).forEach(function(w) { overallPcts[w] = overallTotal > 0 ? overallW[w] / overallTotal * 100 : 0; });

  Object.keys(wca).forEach(function(c) {
    var cw = wca[c], weak = [], strong = [], r = [];
    Object.keys(cw.weekStats).forEach(function(w) {
      var pct = cw.total > 0 ? cw.weekStats[w] / cw.total * 100 : 0;
      var oPct = overallPcts[w] || 0;
      var diff = Math.round((pct - oPct) * 100) / 100;
      if (diff < -10) weak.push({ week: w, diff: diff, current: pct, expected: oPct });
      else if (diff > 10) strong.push({ week: w, diff: diff, current: pct, expected: oPct });
    });
    weak.sort(function(a, b) { return a.diff - b.diff; });
    weak.forEach(function(ww) {
      var boost = Math.round(cw.total * (ww.expected - ww.current) / 100);
      r.push({ type: 'BOOST', week: 'W' + ww.week, boostNeeded: boost, gap: Math.abs(ww.diff) });
    });
    strong.forEach(function(sw) { r.push({ type: 'STRONG', week: 'W' + sw.week }); });
    recs[c] = { weakWeeks: weak, strongWeeks: strong, recommendations: r,
      strategy: weak.length === 0 ? 'All weeks balanced.' : weak.map(function(w) { return 'W' + w.week; }).join(', ') + ' mein focus karo.' };
  });
  return recs;
}

// ── Month Projection ────────────────────────────────────────
function computeMonthProjection(records, monthlyArr) {
  var now = new Date();
  var currentMonth = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
  var currentWeekInMonth = getWeekOfMonth(now);

  // Get data for current month
  var monthRecords = records.filter(function(r) {
    var key = r.date.getFullYear() + '-' + ('0' + (r.date.getMonth() + 1)).slice(-2);
    return key === currentMonth;
  });

  var totalSoFar = monthRecords.reduce(function(s, r) { return s + r.admissions; }, 0);
  var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  var dayOfMonth = now.getDate();
  var daysElapsed = dayOfMonth;
  var projectedMonthEnd = daysElapsed > 0 ? Math.round(totalSoFar / daysElapsed * daysInMonth) : 0;

  // Week-wise breakdown for current month
  var weekBuckets = {};
  monthRecords.forEach(function(r) {
    var wk = getWeekOfMonth(r.date);
    if (!weekBuckets[wk]) weekBuckets[wk] = { total: 0, count: 0, days: [] };
    weekBuckets[wk].total += r.admissions;
    weekBuckets[wk].count++;
    weekBuckets[wk].days.push(r.day);
  });

  var weeks = [];
  var totalWeeksInMonth = Math.ceil(daysInMonth / 7);
  for (var w = 1; w <= totalWeeksInMonth; w++) {
    var wb = weekBuckets[w] || { total: 0, count: 0 };
    var weekStart = (w - 1) * 7 + 1;
    var weekEnd = Math.min(w * 7, daysInMonth);
    var isPast = dayOfMonth > weekEnd;
    var isCurrent = w === currentWeekInMonth;
    var dailyAvg = daysElapsed > 0 ? totalSoFar / dayOfMonth : 0;
    var projectedWeekEnd = dailyAvg * weekEnd;
    weeks.push({
      week: w, total: wb.total, isPast: isPast, isCurrent: isCurrent,
      weekStart: weekStart, weekEnd: weekEnd,
      projected: isPast ? wb.total : (isCurrent ? Math.round(dailyAvg * weekEnd) : Math.round(dailyAvg * weekEnd)),
      diff: isPast ? wb.total - Math.round(dailyAvg * weekEnd) : 0
    });
  }

  // Previous months comparison
  var prevMonths = monthlyArr.filter(function(m) { return m.month < currentMonth; }).slice(-3);
  var prevAvg = prevMonths.length > 0 ? Math.round(prevMonths.reduce(function(s, m) { return s + m.admissions; }, 0) / prevMonths.length) : 0;

  return {
    currentMonth: currentMonth, currentWeek: currentWeekInMonth, totalSoFar: totalSoFar,
    projectedMonthEnd: projectedMonthEnd, prevMonthAvg: prevAvg,
    daysElapsed: daysElapsed, daysInMonth: daysInMonth, dailyAvg: Math.round(totalSoFar / Math.max(1, dayOfMonth)),
    weeks: weeks, growthVsPrev: prevAvg > 0 ? Math.round((projectedMonthEnd - prevAvg) / prevAvg * 100) : 0
  };
}

function getWeekOfMonth(d) {
  var first = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil((d.getDate() + first.getDay()) / 7);
}

// ── Predictions ─────────────────────────────────────────────
function predictFuture(mArr, monthsAhead) {
  var a = mArr.map(function(m) { return m.admissions; }), n = a.length;
  if (n < 3) return { predictions: [], method: 'insufficient', accuracy: 'Low' };
  var lin = linReg(a, monthsAhead), wma = wmaPred(a, monthsAhead), es = expSmooth(a, monthsAhead), sea = seaPred(a, monthsAhead);
  var lastDate = new Date(mArr[mArr.length - 1].month + '-01');
  var preds = [], acc = n >= 24 ? 'High' : n >= 12 ? 'Medium-High' : n >= 6 ? 'Medium' : 'Low';
  for (var i = 0; i < monthsAhead; i++) {
    var nd = new Date(lastDate); nd.setMonth(nd.getMonth() + i + 1);
    var nm = nd.getFullYear() + '-' + ('0' + (nd.getMonth() + 1)).slice(-2);
    var ens = Math.round(lin[i] * 0.25 + wma[i] * 0.30 + es[i] * 0.30 + sea[i] * 0.15);
    preds.push({ month: nm, predicted: Math.max(0, ens), linear: lin[i], movingAvg: wma[i], expSmoothing: es[i], seasonal: sea[i] });
  }
  var fitted = linReg(a, 0), res = [];
  for (var r = 0; r < n; r++) res.push(a[r] - (fitted[r] != null ? fitted[r] : a[r]));
  var rVar = res.reduce(function(s, v) { return s + v * v; }, 0) / Math.max(res.length - 2, 1);
  var rStd = Math.sqrt(rVar);
  preds.forEach(function(p, idx) { var m = Math.round(rStd * (1 + idx * 0.12)); p.lower = Math.max(0, p.predicted - m); p.upper = p.predicted + m; });
  return { predictions: preds, method: 'ensemble', accuracy: acc };
}

function linReg(data, ahead) {
  var n = data.length, xM = (n - 1) / 2, yM = data.reduce(function(s, v) { return s + v; }, 0) / n;
  var num = 0, den = 0;
  for (var i = 0; i < n; i++) { num += (i - xM) * (data[i] - yM); den += Math.pow(i - xM, 2); }
  var slope = den > 0 ? num / den : 0, intercept = yM - slope * xM;
  if (ahead === 0) { var p0 = []; for (var j = 0; j < n; j++) p0.push(Math.max(0, Math.round(intercept + slope * j))); return p0; }
  var p = []; for (var j = 0; j < ahead; j++) p.push(Math.max(0, Math.round(intercept + slope * (n + j))));
  return p;
}

function wmaPred(data, ahead) {
  var p = [], w = data.slice();
  for (var i = 0; i < ahead; i++) {
    var len = w.length, w1 = Math.max(len - 1, 0), w2 = Math.max(len - 2, 0), w3 = Math.max(len - 3, 0), wT = w1 + w2 + w3;
    var val = wT > 0 && len >= 3 ? (w[len - 1] * w1 + w[len - 2] * w2 + w[len - 3] * w3) / wT : len >= 2 ? (w[len - 1] * 2 + w[len - 2]) / 3 : w[len - 1];
    val = Math.max(0, Math.round(val)); p.push(val); w.push(val);
  }
  return p;
}

function expSmooth(data, ahead) {
  var alpha = 0.3, level = data[0];
  for (var i = 1; i < data.length; i++) level = alpha * data[i] + (1 - alpha) * level;
  var p = []; for (var j = 0; j < ahead; j++) p.push(Math.max(0, Math.round(level)));
  return p;
}

function seaPred(data, ahead) {
  var n = data.length, sLen = Math.min(12, n), seas = [];
  for (var i = 0; i < sLen; i++) { var v = []; for (var j = i; j < n; j += sLen) v.push(data[j]); seas.push(v.reduce(function(a, b) { return a + b; }, 0) / v.length); }
  var gAvg = data.reduce(function(a, b) { return a + b; }, 0) / n;
  var factors = seas.map(function(s) { return gAvg > 0 ? s / gAvg : 1; });
  var trend = n > 1 ? (data[n - 1] - data[0]) / (n - 1) : 0;
  var p = [];
  for (var k = 0; k < ahead; k++) { var idx = (n + k) % sLen; p.push(Math.max(0, Math.round((data[n - 1] + trend * (k + 1)) * factors[idx]))); }
  return p;
}

// ── AI Report ───────────────────────────────────────────────
function generateAIReport(d) {
  var s = d.stats, g = d.growth, p = d.predictions, wt = d.weeklyTimeline, proj = d.projection;
  var rep = {};
  rep.title = 'Admission Analysis Report';
  if (d.filters.regions !== 'All') rep.title += ' | ' + d.filters.regions;
  if (d.filters.centers !== 'All') rep.title += ' | ' + d.filters.centers;

  var es = [];
  es.push('Data coverage: ' + s.count + ' months, ' + wt.totalWeeks + ' weeks tracked.');
  es.push('Total admissions: ' + fmt(s.total) + ' | Monthly avg: ' + fmt(s.average) + ' | Median: ' + fmt(s.median));
  es.push('Trend: ' + cap(g.trend) + ' (MoM: ' + g.mom.toFixed(1) + '%)');
  es.push('Weekly avg: ' + fmt(wt.avgWeekly) + ' admissions/week');
  if (proj) {
    es.push('\nCURRENT MONTH (' + proj.currentMonth + ') PROJECTION:');
    es.push('  So far: ' + fmt(proj.totalSoFar) + ' admissions (' + proj.daysElapsed + '/' + proj.daysInMonth + ' days)');
    es.push('  Daily avg: ' + fmt(proj.dailyAvg) + ' | Projected month-end: ' + fmt(proj.projectedMonthEnd));
    if (proj.prevMonthAvg > 0) es.push('  vs prev 3-month avg: ' + (proj.growthVsPrev >= 0 ? '+' : '') + proj.growthVsPrev + '%');
  }
  rep.executiveSummary = es.join('\n');

  // Weekly Timeline as HTML table
  var wtHtml = '<table><thead><tr><th>Week</th><th class="num-cell">Total</th><th class="num-cell">Daily Avg</th><th class="pct-cell">WoW Change</th><th class="num-cell">Rolling 4-Wk</th></tr></thead><tbody>';
  wt.timeline.forEach(function(w) {
    var wowClass = w.wowGrowth > 0 ? 'good' : w.wowGrowth < 0 ? 'bad' : 'neutral';
    wtHtml += '<tr><td><strong>' + w.label + '</strong> <span style="font-size:10px;color:var(--text-tertiary);display:block;font-weight:400">' + w.dateRange + '</span></td><td class="num-cell"><strong>' + fmt(w.total) + '</strong></td><td class="num-cell">' + fmt(w.avg) + '</td><td class="pct-cell ' + wowClass + '">' + (w.wowGrowth >= 0 ? '+' : '') + w.wowGrowth.toFixed(1) + '%</td><td class="num-cell">' + fmt(w.rolling4) + '</td></tr>';
  });
  wtHtml += '</tbody></table>';
  rep.weeklyTimeline = wtHtml;

  // Center Analysis as HTML tables
  var caHtml = '';
  Object.keys(d.wca).forEach(function(center) {
    var cw = d.wca[center];
    caHtml += '<div style="margin-bottom:20px"><strong style="font-size:14px">' + center + '</strong> <span style="color:var(--text-tertiary);font-size:12px">[' + cw.region + '] Total: ' + fmt(cw.total) + '</div>';
    var wks = Object.keys(cw.weekStats).map(Number).sort(function(a, b) { return a - b; });
    if (wks.length > 0) {
      caHtml += '<table><thead><tr><th>Week</th><th class="num-cell">Admissions</th><th class="pct-cell">% Share</th><th class="num-cell">Days</th></tr></thead><tbody>';
      var totalPct = 0;
      wks.forEach(function(w) {
        var pct = cw.total > 0 ? cw.weekStats[w] / cw.total * 100 : 0;
        totalPct += pct;
        var dr = cw.weekDates && cw.weekDates[w] ? fmtDateShort(cw.weekDates[w].min) + '-' + fmtDateShort(cw.weekDates[w].max) : '';
        caHtml += '<tr><td><strong>Week ' + w + '</strong> <span style="font-size:10px;color:var(--text-tertiary);display:block;font-weight:400">' + dr + '</span></td><td class="num-cell">' + fmt(cw.weekStats[w]) + '</td><td class="pct-cell">' + pct.toFixed(1) + '%</td><td class="num-cell">' + (cw.weekCount[w] || 0) + '</td></tr>';
      });
      caHtml += '</tbody><tfoot><tr><td>Total</td><td class="num-cell">' + fmt(cw.total) + '</td><td class="pct-cell">' + totalPct.toFixed(1) + '%</td><td class="num-cell">-</td></tr></tfoot></table>';
    }
  });
  rep.centerAnalysis = caHtml;

  // Boost Strategy - Visual cards, anyone can understand at a glance
  var bsHtml = '';
  var tl = wt.timeline;
  if (tl.length >= 2) {
    var lastWk = tl[tl.length - 1];
    var prevWk = tl[tl.length - 2];
    var gap = lastWk.total - prevWk.total;
    var gapPct = prevWk.total > 0 ? Math.round(gap / prevWk.total * 10000) / 100 : 0;
    var isUp = gap >= 0;
    var arrow = isUp ? '&#9650;' : '&#9660;';
    var color = isUp ? 'var(--green)' : 'var(--red)';
    var bgColor = isUp ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
    var barPct = prevWk.total > 0 ? Math.min(100, Math.round(lastWk.total / prevWk.total * 100)) : 0;
    var barColor = isUp ? 'var(--green)' : 'var(--red)';

    // Main visual: two big cards side by side
    bsHtml += '<div style="display:grid;grid-template-columns:1fr 60px 1fr;gap:0;align-items:center;margin-bottom:20px">';

    // Previous week card
    bsHtml += '<div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center">';
    bsHtml += '<div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Pichla Hafta</div>';
    bsHtml += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px"><strong>' + prevWk.label + '</strong> (' + prevWk.dateRange + ')</div>';
    bsHtml += '<div style="font-size:36px;font-weight:800;color:var(--text);line-height:1">' + fmt(prevWk.total) + '</div>';
    bsHtml += '<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">admissions</div>';
    bsHtml += '</div>';

    // Arrow
    bsHtml += '<div style="text-align:center">';
    bsHtml += '<div style="font-size:32px;color:' + color + ';line-height:1">' + arrow + '</div>';
    bsHtml += '<div style="font-size:14px;font-weight:700;color:' + color + '">' + (gapPct >= 0 ? '+' : '') + gapPct + '%</div>';
    bsHtml += '</div>';

    // Latest week card
    bsHtml += '<div style="background:' + bgColor + ';border:1px solid ' + color + ';border-radius:12px;padding:20px;text-align:center">';
    bsHtml += '<div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Aakhri Hafta</div>';
    bsHtml += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px"><strong>' + lastWk.label + '</strong> (' + lastWk.dateRange + ')</div>';
    bsHtml += '<div style="font-size:36px;font-weight:800;color:' + color + ';line-height:1">' + fmt(lastWk.total) + '</div>';
    bsHtml += '<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">admissions</div>';
    bsHtml += '</div>';

    bsHtml += '</div>';

    // Progress bar
    bsHtml += '<div style="margin-bottom:16px">';
    bsHtml += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-tertiary);margin-bottom:6px"><span>Target: ' + fmt(prevWk.total) + '</span><span>Got: ' + fmt(lastWk.total) + ' (' + barPct + '%)</span></div>';
    bsHtml += '<div style="background:var(--border-light);border-radius:8px;height:12px;overflow:hidden">';
    bsHtml += '<div style="background:' + barColor + ';height:100%;width:' + Math.min(100, barPct) + '%;border-radius:8px;transition:width 0.5s"></div>';
    bsHtml += '</div>';
    bsHtml += '</div>';

    // Plain language summary
    if (isUp) {
      bsHtml += '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:14px 18px;font-size:14px;color:var(--text)">';
      bsHtml += '<span style="color:var(--green);font-weight:700">&#10003; Accha chal raha hai!</span> ';
      bsHtml += 'Is hafte <strong>' + fmt(lastWk.total) + '</strong> admissions aaye jo pichle hafte se <strong>' + fmt(Math.abs(gap)) + ' zyada</strong> hain.';
      bsHtml += '</div>';
    } else {
      bsHtml += '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:14px 18px;font-size:14px;color:var(--text)">';
      bsHtml += '<span style="color:var(--red);font-weight:700">&#9888; Dhyaan dena hai!</span> ';
      bsHtml += 'Is hafte sirf <strong>' + fmt(lastWk.total) + '</strong> admissions aaye jo pichle hafte se <strong>' + fmt(Math.abs(gap)) + ' kam</strong> hain. ';
      bsHtml += 'Agla hafte <strong>' + fmt(lastWk.total + Math.abs(gap)) + '</strong> admissions chahiye taaki wapas track pe aaye.';
      bsHtml += '</div>';
    }
  }
  rep.boostStrategy = bsHtml;

  // Center Comparison - Visual, simple
  var totalCenters = d.cc.rankings.length;
  var similarCount = 0;
  var threshold = 70;
  Object.keys(d.cc.mostSimilar).forEach(function(c) {
    if (d.cc.mostSimilar[c].similarity >= threshold) similarCount++;
  });
  var simPct = totalCenters > 0 ? Math.round(similarCount / totalCenters * 100) : 0;

  // Big number cards
  cmpHtml = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">';
  cmpHtml += '<div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center">';
  cmpHtml += '<div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Kul Centers</div>';
  cmpHtml += '<div style="font-size:40px;font-weight:800;color:var(--text);line-height:1">' + totalCenters + '</div>';
  cmpHtml += '</div>';

  cmpHtml += '<div style="background:rgba(26,86,219,0.08);border:1px solid rgba(26,86,219,0.2);border-radius:12px;padding:20px;text-align:center">';
  cmpHtml += '<div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Jaisa Behavior Hai</div>';
  cmpHtml += '<div style="font-size:40px;font-weight:800;color:var(--primary);line-height:1">' + similarCount + '</div>';
  cmpHtml += '<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">' + simPct + '% centers</div>';
  cmpHtml += '</div>';

  cmpHtml += '<div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center">';
  cmpHtml += '<div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Avg Har Center</div>';
  cmpHtml += '<div style="font-size:40px;font-weight:800;color:var(--text);line-height:1">' + fmt(d.cc.overall.avgPerCenter) + '</div>';
  cmpHtml += '<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">admissions</div>';
  cmpHtml += '</div>';
  cmpHtml += '</div>';

  // Progress bar for similarity
  cmpHtml += '<div style="margin-bottom:16px">';
  cmpHtml += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-tertiary);margin-bottom:6px"><span>Similar centers</span><span>' + similarCount + ' / ' + totalCenters + ' (' + simPct + '%)</span></div>';
  cmpHtml += '<div style="background:var(--border-light);border-radius:8px;height:12px;overflow:hidden">';
  cmpHtml += '<div style="background:var(--primary);height:100%;width:' + simPct + '%;border-radius:8px;transition:width 0.5s"></div>';
  cmpHtml += '</div>';
  cmpHtml += '</div>';

  // Plain language
  cmpHtml += '<div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:8px;padding:14px 18px;font-size:14px;color:var(--text)">';
  cmpHtml += 'Total <strong>' + totalCenters + ' centers</strong> hain jismein se <strong>' + similarCount + ' (' + simPct + '%)</strong> centers ka admission pattern ek jaisa hai.';
  cmpHtml += '</div>';
  rep.centerComparison = cmpHtml;

  // Forecast - Current month end prediction
  var piHtml = '';
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (proj) {
    var now = new Date();
    var fullMonthName = monthNames[now.getMonth()] + ' ' + now.getFullYear();
    var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var monthEndDate = lastDay + ' ' + monthNames[now.getMonth()] + ' ' + now.getFullYear();
    var soFar = proj.totalSoFar;
    var projected = proj.projectedMonthEnd;
    var daysDone = proj.daysElapsed;
    var daysTotal = proj.daysInMonth;

    piHtml += '<div style="background:linear-gradient(135deg,rgba(26,86,219,0.06),rgba(52,209,120,0.06));border:1px solid var(--border);border-radius:12px;padding:28px;text-align:center;margin-bottom:16px">';
    piHtml += '<div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Is Mahine Ka Andaza</div>';
    piHtml += '<div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:16px">' + fullMonthName + '</div>';
    piHtml += '<div style="font-size:52px;font-weight:800;color:var(--primary);line-height:1;margin-bottom:8px">' + fmt(projected) + '</div>';
    piHtml += '<div style="font-size:13px;color:var(--text-tertiary);margin-bottom:16px">total admissions honge ' + monthEndDate + ' tak</div>';
    piHtml += '<div style="display:flex;justify-content:center;gap:32px;font-size:13px;color:var(--text-secondary)">';
    piHtml += '<div>Abhi tak: <strong>' + fmt(soFar) + '</strong></div>';
    piHtml += '<div>Din bache: <strong>' + (daysTotal - daysDone) + '</strong></div>';
    piHtml += '<div>Daily avg: <strong>' + fmt(proj.dailyAvg) + '</strong></div>';
    piHtml += '</div>';
    piHtml += '</div>';

    // Progress bar
    var progressPct = daysTotal > 0 ? Math.round(daysDone / daysTotal * 100) : 0;
    var admPct = projected > 0 ? Math.round(soFar / projected * 100) : 0;
    piHtml += '<div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:12px">';
    piHtml += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-tertiary);margin-bottom:6px"><span>Din: ' + daysDone + '/' + daysTotal + ' (' + progressPct + '%)</span><span>Admissions: ' + fmt(soFar) + '/' + fmt(projected) + ' (' + admPct + '%)</span></div>';
    piHtml += '<div style="background:var(--border-light);border-radius:8px;height:10px;overflow:hidden">';
    piHtml += '<div style="background:var(--primary);height:100%;width:' + admPct + '%;border-radius:8px;transition:width 0.5s"></div>';
    piHtml += '</div>';
    piHtml += '</div>';

    piHtml += '<div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:8px;padding:12px 18px;font-size:14px;color:var(--text);text-align:center">';
    piHtml += '<strong>' + monthEndDate + '</strong> ko ye mahina khatam hoga. Us waqt tak lagbhag <strong>' + fmt(projected) + '</strong> admissions honge.';
    piHtml += '</div>';
  }
  rep.predictions = piHtml;

  var risk = [], score = 0;
  if (g.trend === 'declining') { score += 3; risk.push('[HIGH] Declining trend'); }
  if (s.cv > 40) { score += 2; risk.push('[MEDIUM] High volatility (CV: ' + s.cv + '%)'); }
  if (risk.length === 0) risk.push('[LOW] No significant risks');
  rep.risk = 'Risk: ' + (score >= 5 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW') + ' (' + score + '/10)\n' + risk.join('\n');
  return rep;
}

// ── Render Dashboard ────────────────────────────────────────
function renderDashboard(d) {
  document.getElementById('dashboard').classList.add('show');
  renderStats(d); renderAIReport(d.aiReport); renderCharts(d);
  renderWeeklyTab(d); renderProjectionTab(d); renderBoostTab(d);
  renderCompareTab(d); renderPredictionsTab(d); renderRawTab(d);
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
}

function renderStats(d) {
  var s = d.stats, g = d.growth, p = d.predictions, wt = d.weeklyTimeline, proj = d.projection;
  var tp = p.predictions.length > 0 ? p.predictions[0].predicted : 0;
  var nextMonthLabel = '';
  if (p.predictions.length > 0) {
    var mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var mp = p.predictions[0].month.split('-');
    nextMonthLabel = mn[parseInt(mp[1],10)-1] + ' ' + mp[0];
  }
  var wc = 0; Object.keys(d.boost).forEach(function(c) { wc += d.boost[c].weakWeeks.length; });
  var tc = g.trend === 'growing' ? 'trend-up' : g.trend === 'declining' ? 'trend-down' : 'trend-neutral';

  var h = '';
  h += sc('Total Admissions', fmt(s.total), s.count + ' months');
  h += sc('Monthly Average', fmt(s.average), 'Median: ' + fmt(s.median));
  h += sc('Trend', cap(g.trend), 'MoM: ' + g.mom.toFixed(1) + '%', tc);
  h += sc('Peak Month', s.maxMonth, fmt(s.max) + ' admissions');
  h += sc('Weekly Avg', fmt(wt.avgWeekly), wt.totalWeeks + ' weeks');
  if (proj) h += sc('Month Projection', fmt(proj.projectedMonthEnd), proj.currentMonth + ' end est.', 'tag-predict');
  var monthNamesShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var curMonthShort = '';
  if (proj) {
    var cm = proj.currentMonth.split('-');
    curMonthShort = monthNamesShort[parseInt(cm[1],10)-1] + ' ' + cm[0];
  }
  h += sc('Forecast', proj ? fmt(proj.projectedMonthEnd) : '-', proj ? curMonthShort + ' end est.' : 'No data', 'tag-predict');
  if (wc > 0) h += sc('Weak Weeks', String(wc), 'Needs attention', 'tag-boost');
  document.getElementById('statsRow').innerHTML = h;
}

function sc(l, v, s, extra) {
  return '<div class="stat-card"><div class="label">' + l + '</div><div class="value">' + v + '</div><div class="sub">' + s + '</div>' + (extra ? '<span class="tag ' + extra + '" style="margin-top:6px">' + (extra === 'tag-boost' ? 'ACTION NEEDED' : 'FORECAST') + '</span>' : '') + '</div>';
}

function renderAIReport(rep) {
  if (!rep) return;
  var h = '';
  h += rSec('Executive Summary', rep.executiveSummary);
  h += rSec('Weekly Timeline', rep.weeklyTimeline, true);
  h += rSec('Center Analysis', rep.centerAnalysis, true);
  h += rSec('Boost Strategy', rep.boostStrategy, true);
  h += rSec('Center Comparison', rep.centerComparison, true);
  h += rSec('Forecast', rep.predictions, true);
  h += rSec('Risk Assessment', rep.risk);
  document.getElementById('aiReportContent').innerHTML = h;
}

function rSec(t, c, isHtml) {
  if (isHtml) return '<div class="report-section"><h3>' + t + '</h3>' + c + '</div>';
  return '<div class="report-section"><h3>' + t + '</h3><pre>' + esc(c) + '</pre></div>';
}

function renderCharts(d) {
  Object.keys(charts).forEach(function(k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } });
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  var gridColor = isDark ? 'rgba(44,48,64,0.5)' : 'rgba(226,229,234,0.5)';
  var tickColor = isDark ? '#6b7080' : '#8c939e';
  var labelColor = isDark ? '#a0a4ad' : '#5f6672';

  var wtLabels = d.weeklyTimeline.timeline.map(function(w) { return w.label; });
  var wtActual = d.weeklyTimeline.timeline.map(function(w) { return w.total; });
  var wtRolling = d.weeklyTimeline.timeline.map(function(w) { return w.rolling4; });
  var pLabels = d.predictions.predictions.map(function(p) { return p.month; });
  var pVals = d.predictions.predictions.map(function(p) { return p.predicted; });
  var pLow = d.predictions.predictions.map(function(p) { return p.lower; });
  var pUp = d.predictions.predictions.map(function(p) { return p.upper; });

  var allL = wtLabels.concat(pLabels);
  var actP = wtActual.concat(Array(pLabels.length).fill(null));
  var prP = Array(wtLabels.length).fill(null).concat(pVals);
  var loP = Array(wtLabels.length).fill(null).concat(pLow);
  var upP = Array(wtLabels.length).fill(null).concat(pUp);

  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line', data: { labels: allL, datasets: [
      { label: 'Actual', data: actP, borderColor: isDark ? '#5b8af5' : '#1a56db', fill: true, backgroundColor: isDark ? 'rgba(91,138,245,0.05)' : 'rgba(26,86,219,0.05)', tension: 0.3, pointRadius: 2, borderWidth: 2 },
      { label: '4-Week Avg', data: wtRolling.concat(Array(pLabels.length).fill(null)), borderColor: tickColor, borderDash: [4, 4], fill: false, tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Predicted', data: prP, borderColor: isDark ? '#34d178' : '#0d7c3d', borderDash: [6, 3], fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
      { label: 'Lower', data: loP, borderColor: 'transparent', backgroundColor: isDark ? 'rgba(52,209,120,0.05)' : 'rgba(13,124,61,0.05)', fill: '+1', pointRadius: 0, borderWidth: 0 },
      { label: 'Upper', data: upP, borderColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0 }
    ] }, options: cOpts(gridColor, tickColor)
  });

  if (pLabels.length > 0) {
    charts.model = new Chart(document.getElementById('modelChart'), {
      type: 'bar', data: { labels: pLabels, datasets: [
        { label: 'Linear', data: d.predictions.predictions.map(function(p) { return p.linear; }), backgroundColor: 'rgba(26,86,219,0.5)', borderRadius: 3 },
        { label: 'Moving Avg', data: d.predictions.predictions.map(function(p) { return p.movingAvg; }), backgroundColor: 'rgba(13,124,61,0.5)', borderRadius: 3 },
        { label: 'Exp Smooth', data: d.predictions.predictions.map(function(p) { return p.expSmoothing; }), backgroundColor: 'rgba(180,83,9,0.5)', borderRadius: 3 },
        { label: 'Seasonal', data: d.predictions.predictions.map(function(p) { return p.seasonal; }), backgroundColor: 'rgba(140,147,158,0.4)', borderRadius: 3 },
        { label: 'Ensemble', data: pVals, type: 'line', borderColor: isDark ? '#5b8af5' : '#1a56db', borderWidth: 2, pointRadius: 4, pointBackgroundColor: isDark ? '#5b8af5' : '#1a56db', fill: false }
      ] }, options: cOpts(gridColor, tickColor)
    });
  }

  var regMap = {};
  d.records.forEach(function(r) { regMap[r.region] = (regMap[r.region] || 0) + r.admissions; });
  var regL = Object.keys(regMap).sort(function(a, b) { return regMap[b] - regMap[a]; });
  var rColors = ['#1a56db','#0d7c3d','#b45309','#c92a2a','#6366f1','#0891b2','#7c3aed','#db2777','#65a30d','#ea580c','#0d9488','#4338ca'];
  if (regL.length > 0) {
    charts.region = new Chart(document.getElementById('regionChart'), {
      type: 'doughnut', data: { labels: regL, datasets: [{ data: regL.map(function(r) { return regMap[r]; }), backgroundColor: rColors.slice(0, regL.length), borderColor: isDark ? '#1a1d27' : '#fff', borderWidth: 2 }] },
      options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: labelColor, font: { size: 11, family: 'Inter' }, padding: 12 } } } }
    });
  }

  if (d.seasonality && d.seasonality.monthlyAverages) {
    var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var sD = mo.map(function(m) { return d.seasonality.monthlyAverages[m] || 0; });
    charts.season = new Chart(document.getElementById('seasonChart'), {
      type: 'bar', data: { labels: mo, datasets: [
        { label: 'Avg', data: sD, backgroundColor: sD.map(function(v) { return v >= d.seasonality.overallAvg ? (isDark ? 'rgba(52,209,120,0.5)' : 'rgba(13,124,61,0.5)') : (isDark ? 'rgba(240,96,96,0.35)' : 'rgba(201,42,42,0.35)'); }), borderRadius: 4 },
        { label: 'Overall Avg', data: Array(12).fill(d.seasonality.overallAvg), type: 'line', borderColor: isDark ? '#f0a030' : '#b45309', borderDash: [5, 5], pointRadius: 0, fill: false, borderWidth: 1.5 }
      ] }, options: cOpts(gridColor, tickColor)
    });
  }
}

function cOpts(gc, tc) {
  return {
    responsive: true, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { color: tc, font: { size: 11, family: 'Inter' }, usePointStyle: true, padding: 14 } } },
    scales: {
      x: { ticks: { color: tc, maxRotation: 45, font: { size: 10, family: 'Inter' } }, grid: { color: gc } },
      y: { ticks: { color: tc, font: { size: 10, family: 'Inter' } }, grid: { color: gc } }
    }
  };
}

// ── Tab: Weekly ─────────────────────────────────────────────
function renderWeeklyTab(d) {
  var wt = d.weeklyTimeline;
  var h = '';

  // Summary row
  h += '<div style="margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
  h += ms('Total Weeks', String(wt.totalWeeks));
  h += ms('Avg/Week', fmt(wt.avgWeekly));
  h += ms('Best Week', wt.bestWeek ? wt.bestWeek.label : '-');
  h += ms('Worst Week', wt.worstWeek ? wt.worstWeek.label : '-');
  h += '</div>';

  // All weeks table (Excel/ruler style)
  h += '<h3 style="font-size:13px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 10px">All Weeks Timeline</h3>';
  h += '<div style="overflow-x:auto"><table class="data-table"><thead><tr>';
  h += '<th style="width:80px">Week</th>';
  h += '<th class="num-cell" style="width:110px">Total</th>';
  h += '<th class="num-cell" style="width:100px">Daily Avg</th>';
  h += '<th class="pct-cell" style="width:100px">WoW Change</th>';
  h += '<th class="num-cell" style="width:100px">Rolling 4-Wk</th>';
  h += '<th style="width:120px">Status</th>';
  h += '<th style="min-width:200px">Bar</th>';
  h += '</tr></thead><tbody>';
  var maxTotal = Math.max.apply(null, wt.timeline.map(function(w) { return w.total; }));
  wt.timeline.forEach(function(w) {
    var barW = maxTotal > 0 ? Math.round(w.total / maxTotal * 100) : 0;
    var barColor = w.total >= wt.avgWeekly * 1.2 ? 'var(--green)' : w.total <= wt.avgWeekly * 0.8 ? 'var(--red)' : 'var(--primary)';
    var status = w.total >= wt.avgWeekly * 1.2 ? '<span class="good">Strong</span>' : w.total <= wt.avgWeekly * 0.8 ? '<span class="bad">Weak</span>' : '<span class="neutral">Normal</span>';
    var wowClass = w.wowGrowth > 0 ? 'good' : w.wowGrowth < 0 ? 'bad' : 'neutral';
    h += '<tr>';
    h += '<td><strong>' + w.label + '</strong> <span style="font-size:10px;color:var(--text-tertiary);display:block;font-weight:400">' + w.dateRange + '</span></td>';
    h += '<td class="num-cell"><strong>' + fmt(w.total) + '</strong></td>';
    h += '<td class="num-cell">' + fmt(w.avg) + '</td>';
    h += '<td class="pct-cell ' + wowClass + '">' + (w.wowGrowth >= 0 ? '+' : '') + w.wowGrowth.toFixed(1) + '%</td>';
    h += '<td class="num-cell">' + fmt(w.rolling4) + '</td>';
    h += '<td>' + status + '</td>';
    h += '<td><div style="background:var(--border-light);border-radius:3px;height:18px;width:100%;position:relative"><div style="background:' + barColor + ';height:100%;width:' + barW + '%;border-radius:3px;transition:width 0.3s"></div></div></td>';
    h += '</tr>';
  });
  h += '</tbody>';
  h += '<tfoot><tr><td><strong>Total</strong></td><td class="num-cell"><strong>' + fmt(wt.timeline.reduce(function(s, w) { return s + w.total; }, 0)) + '</strong></td><td class="num-cell"><strong>' + fmt(wt.avgWeekly) + '</strong></td><td class="pct-cell">-</td><td class="num-cell">-</td><td>-</td><td>-</td></tr></tfoot>';
  h += '</table></div>';

  // Center tables
  h += '<h3 style="font-size:13px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin:28px 0 12px">Center-wise Weekly Breakdown</h3>';
  Object.keys(d.wca).forEach(function(center) {
    var cw = d.wca[center];
    h += '<div class="center-card"><h3>' + center + '</h3><div class="region-tag">' + cw.region + ' | Total: ' + fmt(cw.total) + '</div>';
    var wks = Object.keys(cw.weekStats).map(Number).sort(function(a, b) { return a - b; });
    if (wks.length > 0) {
      h += '<table class="data-table"><thead><tr>';
      h += '<th style="width:120px">Week</th><th class="num-cell" style="width:120px">Admissions</th><th class="pct-cell" style="width:100px">% Share</th><th class="num-cell" style="width:80px">Days</th>';
      h += '</tr></thead><tbody>';
      var totalPct = 0;
      wks.forEach(function(w) {
        var pct = cw.total > 0 ? cw.weekStats[w] / cw.total * 100 : 0;
        totalPct += pct;
        var dr2 = cw.weekDates && cw.weekDates[w] ? fmtDateShort2(cw.weekDates[w].min) + '-' + fmtDateShort2(cw.weekDates[w].max) : '';
        h += '<tr><td><strong>Week ' + w + '</strong> <span style="font-size:10px;color:var(--text-tertiary);display:block;font-weight:400">' + dr2 + '</span></td><td class="num-cell">' + fmt(cw.weekStats[w]) + '</td><td class="pct-cell">' + pct.toFixed(1) + '%</td><td class="num-cell">' + (cw.weekCount[w] || 0) + '</td></tr>';
      });
      h += '</tbody><tfoot><tr><td>Total</td><td class="num-cell">' + fmt(cw.total) + '</td><td class="pct-cell">' + totalPct.toFixed(1) + '%</td><td class="num-cell">-</td></tr></tfoot></table>';
    }
    var rec = d.boost[center];
    if (rec && rec.weakWeeks.length > 0) {
      rec.weakWeeks.slice(0, 3).forEach(function(ww) {
        h += '<div class="boost-card critical"><strong>Boost: ' + ww.week + '</strong><div class="boost-detail">' + ww.current.toFixed(1) + '% (expected ' + ww.expected.toFixed(1) + '%)</div></div>';
      });
    }
    if (rec && rec.strategy) h += '<div class="strategy-text"><strong>Strategy:</strong> ' + rec.strategy + '</div>';
    // Similar center (from ALL centers)
    var sim = d.cc.mostSimilar[center];
    if (sim && sim.similarTo !== 'N/A') h += '<div class="similar">Most similar center (globally): <span>' + sim.similarTo + '</span> (' + sim.similarity.toFixed(1) + '%)</div>';
    h += '</div>';
  });
  document.getElementById('tab-weekly').innerHTML = h;
}

// ── Tab: Month Projection ──────────────────────────────────
function renderProjectionTab(d) {
  var proj = d.projection;
  if (!proj || !proj.weeks || proj.weeks.length === 0) {
    document.getElementById('tab-projection').innerHTML = '<p style="color:var(--text-tertiary);padding:20px">No current month data available.</p>';
    return;
  }

  var h = '';
  // Header summary
  h += '<div class="projection-card"><h3>Month Projection: ' + proj.currentMonth + ' <span class="proj-badge">LIVE</span></h3>';
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">';
  h += ms('Collected So Far', fmt(proj.totalSoFar), proj.daysElapsed + '/' + proj.daysInMonth + ' days');
  h += ms('Daily Average', fmt(proj.dailyAvg), 'admissions/day');
  h += ms('Projected Month End', fmt(proj.projectedMonthEnd), 'estimated total');
  h += ms('vs 3-Month Avg', (proj.growthVsPrev >= 0 ? '+' : '') + proj.growthVsPrev + '%', proj.prevMonthAvg > 0 ? 'prev avg: ' + fmt(proj.prevMonthAvg) : 'no prev data');
  h += '</div>';

  // Week-by-week table
  h += '<h3 style="font-size:13px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Week-by-Week Projection</h3>';
  h += '<table class="data-table"><thead><tr>';
  h += '<th>Week</th><th>Period</th><th class="num-cell">Collected</th><th class="num-cell">Projected</th><th class="num-cell">Difference</th><th>Status</th>';
  h += '</tr></thead><tbody>';

  proj.weeks.forEach(function(w) {
    var status = w.isPast ? '<span class="good">Completed</span>' : w.isCurrent ? '<span style="color:var(--amber);font-weight:600">In Progress</span>' : '<span class="neutral">Upcoming</span>';
    var diff = w.isPast ? w.diff : (w.isCurrent ? '-' : '-');
    var diffClass = w.isPast ? (w.diff >= 0 ? 'good' : 'bad') : 'neutral';
    h += '<tr>';
    h += '<td><strong>Week ' + w.week + '</strong></td>';
    h += '<td>' + w.weekStart + '-' + w.weekEnd + '</td>';
    h += '<td class="num-cell">' + fmt(w.total) + '</td>';
    h += '<td class="num-cell">' + fmt(w.projected) + '</td>';
    h += '<td class="num-cell ' + diffClass + '">' + (w.isPast ? (w.diff >= 0 ? '+' : '') + fmt(w.diff) : '-') + '</td>';
    h += '<td>' + status + '</td>';
    h += '</tr>';
  });
  h += '</tbody></table>';

  // Action insights
  h += '<div style="margin-top:20px;padding:16px;background:var(--surface-alt);border-radius:var(--radius-sm);border:1px solid var(--border-light)">';
  h += '<strong style="font-size:13px">Insights:</strong><ul style="margin-top:8px;padding-left:20px;font-size:12px;color:var(--text-secondary);line-height:1.8">';
  h += '<li>Current week: <strong>Week ' + proj.currentWeek + '</strong> of the month</li>';
  h += '<li>Daily run rate: <strong>' + fmt(proj.dailyAvg) + '</strong> admissions/day</li>';
  h += '<li>If pace continues, month end estimate: <strong>' + fmt(proj.projectedMonthEnd) + '</strong></li>';
  if (proj.growthVsPrev > 10) h += '<li style="color:var(--green)">Strong growth vs previous months (+' + proj.growthVsPrev + '%)</li>';
  else if (proj.growthVsPrev < -10) h += '<li style="color:var(--red)">Below previous months average (' + proj.growthVsPrev + '%). Consider boosting.</li>';
  h += '</ul></div>';

  h += '</div>';
  document.getElementById('tab-projection').innerHTML = h;
}

// ── Tab: Boost ──────────────────────────────────────────────
function renderBoostTab(d) {
  var allWeak = [];
  Object.keys(d.boost).forEach(function(c) {
    d.boost[c].weakWeeks.forEach(function(ww) { allWeak.push({ center: c, region: d.wca[c].region, week: ww.week, gap: Math.abs(ww.diff), total: d.wca[c].total }); });
  });
  allWeak.sort(function(a, b) { return b.gap - a.gap; });
  var h = '';
  if (allWeak.length === 0) {
    h = '<div style="text-align:center;padding:40px"><h3 style="color:var(--green)">All Centers Performing Well</h3></div>';
  } else {
    h += '<h3 style="font-size:14px;font-weight:600;color:var(--red);margin-bottom:16px">' + allWeak.length + ' Weak Spots Found</h3>';
    allWeak.forEach(function(w) {
      var cls = w.gap > 15 ? 'critical' : '';
      h += '<div class="boost-card ' + cls + '">';
      h += '<strong>' + w.center + '</strong> <span style="color:var(--text-tertiary);font-size:12px">[' + w.region + ']</span>';
      h += '<div class="boost-detail">' + w.week + ': Gap -' + w.gap.toFixed(1) + '% | Need ' + Math.round(w.total * w.gap / 100) + ' more admissions</div>';
      h += '</div>';
    });
  }
  document.getElementById('tab-boost').innerHTML = h;
}

// ── Tab: Compare ────────────────────────────────────────────
function renderCompareTab(d) {
  var cc = d.cc;
  var h = '<h3 style="font-size:13px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Performance Rankings (All Centers)</h3>';
  h += '<table class="data-table"><thead><tr><th>#</th><th>Center</th><th>Region</th><th class="num-cell">Total</th><th class="num-cell">Avg/Week</th><th>Most Similar</th></tr></thead><tbody>';
  cc.rankings.forEach(function(r, i) {
    var ms = cc.mostSimilar[r.center];
    h += '<tr><td>' + (i + 1) + '</td><td><strong>' + r.center + '</strong></td><td>' + r.region + '</td><td class="num-cell">' + fmt(r.total) + '</td><td class="num-cell">' + fmt(r.avg) + '</td><td style="color:var(--primary)">' + (ms && ms.similarTo !== 'N/A' ? ms.similarTo + ' (' + ms.similarity.toFixed(0) + '%)' : '-') + '</td></tr>';
  });
  h += '</tbody></table>';
  if (cc.similarity.length > 0) {
    h += '<h3 style="font-size:13px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin:28px 0 12px">Top Similar Pairs (Global)</h3>';
    cc.similarity.slice(0, 10).forEach(function(s) {
      h += '<div class="similar-pair"><div class="centers">' + s.center1 + ' &harr; ' + s.center2 + '</div><div class="score">' + s.similarity.toFixed(1) + '%</div></div>';
    });
  }
  document.getElementById('tab-compare').innerHTML = h;
}

// ── Tab: Predictions ────────────────────────────────────────
function renderPredictionsTab(d) {
  var p = d.predictions;
  if (p.predictions.length === 0) { document.getElementById('tab-predictions').innerHTML = '<p style="color:var(--text-tertiary)">Insufficient data.</p>'; return; }
  var h = '<table class="data-table"><thead><tr><th>Month</th><th class="num-cell">Predicted</th><th class="num-cell">Lower</th><th class="num-cell">Upper</th><th class="num-cell">Linear</th><th class="num-cell">Moving Avg</th><th class="num-cell">Exp Smooth</th><th class="num-cell">Seasonal</th></tr></thead><tbody>';
  p.predictions.forEach(function(pr) {
    h += '<tr><td><strong>' + pr.month + '</strong></td><td class="num-cell"><strong>' + fmt(pr.predicted) + '</strong></td><td class="num-cell">' + fmt(pr.lower) + '</td><td class="num-cell">' + fmt(pr.upper) + '</td><td class="num-cell">' + fmt(pr.linear) + '</td><td class="num-cell">' + fmt(pr.movingAvg) + '</td><td class="num-cell">' + fmt(pr.expSmoothing) + '</td><td class="num-cell">' + fmt(pr.seasonal) + '</td></tr>';
  });
  h += '</tbody></table>';
  var tp = p.predictions.reduce(function(a, b) { return a + b.predicted; }, 0);
  h += '<div style="margin-top:16px;font-size:13px;color:var(--text-tertiary)">Total: <strong style="color:var(--text)">' + fmt(tp) + '</strong> | Accuracy: ' + p.accuracy + '</div>';
  document.getElementById('tab-predictions').innerHTML = h;
}

// ── Tab: Raw Data ───────────────────────────────────────────
function renderRawTab(d) {
  var h = '<table class="data-table"><thead><tr><th>Date</th><th>Region</th><th>Center</th><th class="num-cell">Admissions</th><th class="num-cell">Week</th></tr></thead><tbody>';
  d.records.slice(0, 500).forEach(function(r) {
    h += '<tr><td>' + r.dateStr + '</td><td>' + r.region + '</td><td>' + r.center + '</td><td class="num-cell"><strong>' + fmt(r.admissions) + '</strong></td><td class="num-cell">W' + r.cycleWeek + '</td></tr>';
  });
  if (d.records.length > 500) h += '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary)">Showing 500 of ' + fmt(d.records.length) + '</td></tr>';
  h += '</tbody></table>';
  document.getElementById('tab-rawdata').innerHTML = h;
}

function ms(label, value, sub) {
  return '<div class="stat-card" style="padding:14px"><div class="label" style="margin-bottom:2px">' + label + '</div><div class="value" style="font-size:18px">' + value + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
}
