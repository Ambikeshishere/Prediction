/**
 * ============================================================
 *  ADMISSION PREDICTOR v2 - Sept-Aug Cycle
 *  Weekly Analysis + Center Comparison + Boost Strategy
 * ============================================================
 *  Headers: admission_date | region | center | admissions
 *  Admission Cycle: September -> August
 * ============================================================
 */

var CONFIG = {
  SHEET_NAME: 'Sheet1',
  DATE_COL: 1,
  REGION_COL: 2,
  CENTER_COL: 3,
  ADMISSIONS_COL: 4
};

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Admission Predictor v2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// -- Get all data ---------------------------------------------------
function getData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" nahi mili.');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('Sheet mein data nahi hai.');
  var records = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[CONFIG.DATE_COL - 1];
    var admissions = Number(row[CONFIG.ADMISSIONS_COL - 1]);
    if (dateVal && !isNaN(admissions)) {
      var d = dateVal instanceof Date ? dateVal : new Date(dateVal);
      records.push({
        date: d.toISOString(),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        weekOfMonth: getWeekOfMonth(d),
        cycleYear: getCycleYear(d),
        region: String(row[CONFIG.REGION_COL - 1] || 'Unknown'),
        center: String(row[CONFIG.CENTER_COL - 1] || 'Unknown'),
        admissions: admissions
      });
    }
  }
  return records;
}

// -- Sept-Aug cycle year -------------------------------------------
// Sept 2024 - Aug 2025 = Cycle 2024-25
function getCycleYear(d) {
  var month = d.getMonth() + 1;
  var year = d.getFullYear();
  if (month >= 9) return year + '-' + (year + 1);
  return (year - 1) + '-' + year;
}

// -- Week of month (1-4/5) -----------------------------------------
function getWeekOfMonth(d) {
  var firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  var dayOfMonth = d.getDate();
  return Math.ceil((dayOfMonth + firstDay.getDay()) / 7);
}

// -- Region -> Centers mapping -------------------------------------
function getRegionCenterMap() {
  var records = getData();
  var map = {};
  records.forEach(function(r) {
    if (!map[r.region]) map[r.region] = {};
    map[r.region][r.center] = true;
  });
  var result = {};
  Object.keys(map).sort().forEach(function(region) {
    result[region] = Object.keys(map[region]).sort();
  });
  return { success: true, regionCenterMap: result };
}

// -- Main Analysis --------------------------------------------------
function analyzeData(regionFilter, centerFilter, futureMonths) {
  try {
    var records = getData();

    // Apply region filter first
    if (regionFilter && regionFilter !== 'All') {
      records = records.filter(function(r) { return r.region === regionFilter; });
    }
    // Then center filter
    if (centerFilter && centerFilter !== 'All') {
      records = records.filter(function(r) { return r.center === centerFilter; });
    }
    if (records.length === 0) throw new Error('Filter ke baad koi data nahi mila.');

    records.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

    // Get all cycles present in data
    var cycleMap = {};
    records.forEach(function(r) { cycleMap[r.cycleYear] = true; });
    var cycles = Object.keys(cycleMap).sort();

    // Monthly aggregation
    var monthly = aggregateByMonth(records);
    var monthlyArr = Object.keys(monthly).sort().map(function(key) {
      return { month: key, admissions: monthly[key] };
    });

    // Weekly analysis per center
    var weeklyCenterAnalysis = computeWeeklyCenterAnalysis(records);

    // Center comparison (overall)
    var centerComparison = computeCenterComparison(records);

    // Boost recommendations per center
    var boostRecommendations = generateBoostRecommendations(weeklyCenterAnalysis, centerComparison);

    // Cycle-wise comparison
    var cycleComparison = computeCycleComparison(records, cycles);

    // Overall stats
    var overallStats = computeOverallStats(monthlyArr);

    // Growth metrics
    var growth = computeGrowthMetrics(monthlyArr);

    // Predictions
    var predictions = predictFuture(monthlyArr, futureMonths || 6);

    // Seasonal
    var seasonality = detectSeasonality(monthlyArr);

    // AI Report
    var aiReport = generateAIReport({
      overallStats: overallStats,
      growth: growth,
      predictions: predictions,
      seasonality: seasonality,
      weeklyCenterAnalysis: weeklyCenterAnalysis,
      centerComparison: centerComparison,
      boostRecommendations: boostRecommendations,
      cycleComparison: cycleComparison,
      cycles: cycles,
      totalRecords: records.length,
      dateRange: { from: monthlyArr[0].month, to: monthlyArr[monthlyArr.length - 1].month },
      filters: { region: regionFilter, center: centerFilter }
    });

    return {
      success: true,
      records: records,
      monthlyData: monthlyArr,
      overallStats: overallStats,
      growth: growth,
      predictions: predictions,
      seasonality: seasonality,
      weeklyCenterAnalysis: weeklyCenterAnalysis,
      centerComparison: centerComparison,
      boostRecommendations: boostRecommendations,
      cycleComparison: cycleComparison,
      aiReport: aiReport,
      totalRecords: records.length
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// -- Monthly Aggregation -------------------------------------------
function aggregateByMonth(records) {
  var monthly = {};
  records.forEach(function(r) {
    var d = new Date(r.date);
    var key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    monthly[key] = (monthly[key] || 0) + r.admissions;
  });
  return monthly;
}

// -- Overall Stats --------------------------------------------------
function computeOverallStats(monthlyArr) {
  var admissions = monthlyArr.map(function(m) { return m.admissions; });
  var total = admissions.reduce(function(a, b) { return a + b; }, 0);
  var avg = total / admissions.length;
  var max = Math.max.apply(null, admissions);
  var min = Math.min.apply(null, admissions);
  var maxM = monthlyArr.filter(function(m) { return m.admissions === max; })[0];
  var minM = monthlyArr.filter(function(m) { return m.admissions === min; })[0];
  var variance = admissions.reduce(function(s, v) { return s + Math.pow(v - avg, 2); }, 0) / admissions.length;
  var stdDev = Math.sqrt(variance);
  var sorted = admissions.slice().sort(function(a, b) { return a - b; });
  var median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  return {
    total: total, average: Math.round(avg), median: median,
    max: max, min: min, maxMonth: maxM ? maxM.month : 'N/A', minMonth: minM ? minM.month : 'N/A',
    stdDev: Math.round(stdDev), count: admissions.length,
    cv: Math.round((stdDev / avg) * 100)
  };
}

// -- Growth Metrics -------------------------------------------------
function computeGrowthMetrics(monthlyArr) {
  if (monthlyArr.length < 2) return { mom: 0, trend: 'insufficient_data' };
  var admissions = monthlyArr.map(function(m) { return m.admissions; });
  var latest = admissions[admissions.length - 1];
  var previous = admissions[admissions.length - 2];
  var mom = previous > 0 ? ((latest - previous) / previous * 100) : 0;
  var n = admissions.length;
  var xMean = (n - 1) / 2;
  var yMean = admissions.reduce(function(a, b) { return a + b; }, 0) / n;
  var num = 0, den = 0;
  for (var i = 0; i < n; i++) {
    num += (i - xMean) * (admissions[i] - yMean);
    den += Math.pow(i - xMean, 2);
  }
  var slope = den > 0 ? num / den : 0;
  var trend = slope > 10 ? 'growing' : (slope < -10 ? 'declining' : 'stable');
  return { mom: Math.round(mom * 100) / 100, trend: trend, slope: Math.round(slope), lastValue: latest, previousValue: previous };
}

// -- Seasonality ----------------------------------------------------
function detectSeasonality(monthlyArr) {
  var monthMap = {};
  monthlyArr.forEach(function(m) {
    var mn = parseInt(m.month.split('-')[1], 10);
    if (!monthMap[mn]) monthMap[mn] = [];
    monthMap[mn].push(m.admissions);
  });
  var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var mAvgs = {};
  Object.keys(monthMap).forEach(function(num) {
    var vals = monthMap[num];
    mAvgs[mNames[parseInt(num, 10) - 1]] = Math.round(vals.reduce(function(a, b) { return a + b; }, 0) / vals.length);
  });
  var allAvg = Object.keys(mAvgs).length > 0
    ? Object.keys(mAvgs).reduce(function(s, k) { return s + mAvgs[k]; }, 0) / Object.keys(mAvgs).length : 0;
  var peakE = Object.keys(mAvgs).reduce(function(a, b) { return mAvgs[b] > mAvgs[a] ? b : a; }, Object.keys(mAvgs)[0] || 'Jan');
  var lowE = Object.keys(mAvgs).reduce(function(a, b) { return mAvgs[b] < mAvgs[a] ? b : a; }, Object.keys(mAvgs)[0] || 'Jan');
  return { monthlyAverages: mAvgs, peakMonth: { name: peakE, avg: mAvgs[peakE] || 0 }, lowMonth: { name: lowE, avg: mAvgs[lowE] || 0 }, overallAvg: Math.round(allAvg) };
}

// ============================================================
// WEEKLY CENTER ANALYSIS (core new feature)
// ============================================================
function computeWeeklyCenterAnalysis(records) {
  var centerMap = {};
  records.forEach(function(r) {
    if (!centerMap[r.center]) centerMap[r.center] = { region: r.region, weeks: {1:[], 2:[], 3:[], 4:[], 5:[]}, total: 0 };
    centerMap[r.center].weeks[r.weekOfMonth].push(r.admissions);
    centerMap[r.center].total += r.admissions;
  });

  var result = {};
  Object.keys(centerMap).forEach(function(center) {
    var c = centerMap[center];
    var weekStats = {};
    for (var w = 1; w <= 5; w++) {
      var vals = c.weeks[w] || [];
      var weekTotal = vals.reduce(function(a, b) { return a + b; }, 0);
      var weekAvg = vals.length > 0 ? Math.round(weekTotal / vals.length) : 0;
      var weekPct = c.total > 0 ? Math.round((weekTotal / c.total) * 10000) / 100 : 0;
      weekStats['W' + w] = {
        total: weekTotal,
        avg: weekAvg,
        count: vals.length,
        percent: weekPct
      };
    }
    result[center] = {
      region: c.region,
      total: c.total,
      weekStats: weekStats
    };
  });
  return result;
}

// ============================================================
// CENTER COMPARISON (which center is similar to which)
// ============================================================
function computeCenterComparison(records) {
  var wca = computeWeeklyCenterAnalysis(records);
  var centers = Object.keys(wca);
  if (centers.length < 2) return { rankings: [], similarity: [], overall: {} };

  // Compute overall averages across all centers
  var overallWeekAvgs = { W1: 0, W2: 0, W3: 0, W4: 0, W5: 0 };
  var totalAdm = 0;
  centers.forEach(function(c) {
    totalAdm += wca[c].total;
    Object.keys(overallWeekAvgs).forEach(function(w) {
      overallWeekAvgs[w] += wca[c].weekStats[w].total;
    });
  });
  var overallWeekPcts = {};
  Object.keys(overallWeekAvgs).forEach(function(w) {
    overallWeekPcts[w] = totalAdm > 0 ? Math.round((overallWeekAvgs[w] / totalAdm) * 10000) / 100 : 0;
  });

  // Rankings by total
  var rankings = centers.map(function(c) {
    return { center: c, region: wca[c].region, total: wca[c].total, avg: Math.round(wca[c].total / Math.max(1, Object.keys(wca[c].weekStats).reduce(function(s, w) { return s + wca[c].weekStats[w].count; }, 0))) };
  }).sort(function(a, b) { return b.total - a.total; });

  // Similarity matrix (Euclidean distance on week %)
  var similarity = [];
  for (var i = 0; i < centers.length; i++) {
    for (var j = i + 1; j < centers.length; j++) {
      var c1 = wca[centers[i]], c2 = wca[centers[j]];
      var dist = 0;
      ['W1','W2','W3','W4','W5'].forEach(function(w) {
        dist += Math.pow(c1.weekStats[w].percent - c2.weekStats[w].percent, 2);
      });
      dist = Math.sqrt(dist);
      similarity.push({
        center1: centers[i], center2: centers[j],
        distance: Math.round(dist * 100) / 100,
        similarity: Math.max(0, Math.round((100 - dist) * 100) / 100)
      });
    }
  }
  similarity.sort(function(a, b) { return b.similarity - a.similarity; });

  // For each center, find most similar
  var mostSimilar = {};
  centers.forEach(function(c) {
    var matches = similarity.filter(function(s) { return s.center1 === c || s.center2 === c; });
    if (matches.length > 0) {
      var best = matches[0];
      var simCenter = best.center1 === c ? best.center2 : best.center1;
      mostSimilar[c] = { similarTo: simCenter, similarity: best.similarity };
    } else {
      mostSimilar[c] = { similarTo: 'N/A', similarity: 0 };
    }
  });

  return {
    rankings: rankings,
    similarity: similarity.slice(0, 20),
    mostSimilar: mostSimilar,
    overallWeekPcts: overallWeekPcts,
    overall: {
      total: totalAdm,
      avgPerCenter: Math.round(totalAdm / centers.length)
    }
  };
}

// ============================================================
// BOOST RECOMMENDATIONS (weak week detection)
// ============================================================
function generateBoostRecommendations(wca, cc) {
  var recommendations = {};
  var overallPcts = cc.overallWeekPcts || {};

  Object.keys(wca).forEach(function(center) {
    var cw = wca[center];
    var total = cw.total;
    var recs = [];
    var weakWeeks = [];
    var strongWeeks = [];

    ['W1','W2','W3','W4','W5'].forEach(function(w) {
      var weekPct = cw.weekStats[w].percent;
      var overallPct = overallPcts[w] || 0;
      var diff = overallPct > 0 ? Math.round((weekPct - overallPct) * 100) / 100 : 0;

      if (diff < -10) {
        weakWeeks.push({ week: w, diff: diff, current: weekPct, expected: overallPct });
      } else if (diff > 10) {
        strongWeeks.push({ week: w, diff: diff, current: weekPct, expected: overallPct });
      }
    });

    // Generate specific boost suggestions
    if (weakWeeks.length > 0) {
      weakWeeks.forEach(function(ww) {
        var boostNeeded = Math.round((total * (ww.expected - ww.current)) / 100);
        recs.push({
          type: 'BOOST',
          week: ww.week,
          message: ww.week + ' mein ' + ww.current.toFixed(1) + '% admissions hai (overall ' + ww.expected.toFixed(1) + '%). ' + boostNeeded + ' aur admissions chahiye to match average.',
          boostNeeded: boostNeeded,
          gap: Math.round(ww.diff * -100) / 100
        });
      });
    }
    if (strongWeeks.length > 0) {
      strongWeeks.forEach(function(sw) {
        recs.push({
          type: 'STRONG',
          week: sw.week,
          message: sw.week + ' mein ' + sw.current.toFixed(1) + '% admissions hai (overall ' + sw.expected.toFixed(1) + '%). Ye strong week hai - iska fayda uthao.',
          excess: Math.round(sw.diff * 100) / 100
        });
      });
    }

    // Overall strategy
    var strategy = '';
    if (weakWeeks.length === 0) {
      strategy = 'Sab weeks balanced hain. Consistent performance hai.';
    } else if (weakWeeks.length === 1) {
      strategy = weakWeeks[0].week + ' mein focus karo. Marketing campaigns chalao is week.';
    } else if (weakWeeks.length >= 2) {
      strategy = 'Multiple weak weeks hain (' + weakWeeks.map(function(w) { return w.week; }).join(', ') + '). Overall admission strategy review karo.';
    }

    recommendations[center] = {
      weakWeeks: weakWeeks,
      strongWeeks: strongWeeks,
      recommendations: recs,
      strategy: strategy
    };
  });

  return recommendations;
}

// ============================================================
// CYCLE COMPARISON (Sept-Aug year over year)
// ============================================================
function computeCycleComparison(records, cycles) {
  if (cycles.length < 2) return { hasComparison: false };

  var cycleData = {};
  cycles.forEach(function(cycle) {
    var cRecs = records.filter(function(r) { return r.cycleYear === cycle; });
    var total = cRecs.reduce(function(a, b) { return a + b.admissions; }, 0);
    var monthly = {};
    cRecs.forEach(function(r) {
      var monthInCycle = getMonthInCycle(new Date(r.date));
      if (!monthly[monthInCycle]) monthly[monthInCycle] = 0;
      monthly[monthInCycle] += r.admissions;
    });
    cycleData[cycle] = { total: total, monthly: monthly, records: cRecs.length };
  });

  // Compare consecutive cycles
  var comparisons = [];
  for (var i = 1; i < cycles.length; i++) {
    var prev = cycleData[cycles[i - 1]];
    var curr = cycleData[cycles[i]];
    var growth = prev.total > 0 ? Math.round(((curr.total - prev.total) / prev.total) * 10000) / 100 : 0;
    comparisons.push({
      previousCycle: cycles[i - 1],
      currentCycle: cycles[i],
      prevTotal: prev.total,
      currTotal: curr.total,
      growth: growth
    });
  }

  return { hasComparison: true, cycleData: cycleData, comparisons: comparisons };
}

// Month within Sept-Aug cycle (1=Sep, 2=Oct, ..., 12=Aug)
function getMonthInCycle(d) {
  var month = d.getMonth() + 1;
  if (month >= 9) return month - 8;
  return month + 4;
}
