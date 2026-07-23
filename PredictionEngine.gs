/**
 * PREDICTION ENGINE v2 - Sept-Aug Cycle Aware
 * Ensemble: Linear Regression + Weighted Moving Avg + Exp Smoothing + Seasonal
 */

function linearRegressionPredict(data, monthsAhead) {
  var n = data.length;
  var xMean = (n - 1) / 2;
  var yMean = data.reduce(function(a, b) { return a + b; }, 0) / n;
  var num = 0, den = 0;
  for (var i = 0; i < n; i++) {
    num += (i - xMean) * (data[i] - yMean);
    den += Math.pow(i - xMean, 2);
  }
  var slope = den > 0 ? num / den : 0;
  var intercept = yMean - slope * xMean;
  var preds = [];
  for (var j = 0; j < monthsAhead; j++) {
    preds.push(Math.max(0, Math.round(intercept + slope * (n + j))));
  }
  return preds;
}

function weightedMovingAveragePredict(data, monthsAhead) {
  var preds = [];
  var working = data.slice();
  for (var i = 0; i < monthsAhead; i++) {
    var len = working.length;
    var w1 = Math.max(len - 1, 0);
    var w2 = Math.max(len - 2, 0);
    var w3 = Math.max(len - 3, 0);
    var wTotal = w1 + w2 + w3;
    var val;
    if (wTotal > 0 && len >= 3) {
      val = (working[len - 1] * w1 + working[len - 2] * w2 + working[len - 3] * w3) / wTotal;
    } else if (len >= 2) {
      val = (working[len - 1] * 2 + working[len - 2]) / 3;
    } else {
      val = working[len - 1];
    }
    val = Math.max(0, Math.round(val));
    preds.push(val);
    working.push(val);
  }
  return preds;
}

function exponentialSmoothingPredict(data, monthsAhead) {
  var alpha = 0.3;
  var level = data[0];
  for (var i = 1; i < data.length; i++) {
    level = alpha * data[i] + (1 - alpha) * level;
  }
  var preds = [];
  for (var j = 0; j < monthsAhead; j++) {
    preds.push(Math.max(0, Math.round(level)));
  }
  return preds;
}

function seasonalPredict(data, monthsAhead) {
  var n = data.length;
  var seasonLen = Math.min(12, n);
  var seasonals = [];
  for (var i = 0; i < seasonLen; i++) {
    var vals = [];
    for (var j = i; j < n; j += seasonLen) {
      vals.push(data[j]);
    }
    seasonals.push(vals.reduce(function(a, b) { return a + b; }, 0) / vals.length);
  }
  var globalAvg = data.reduce(function(a, b) { return a + b; }, 0) / n;
  var factors = seasonals.map(function(s) { return globalAvg > 0 ? s / globalAvg : 1; });
  var preds = [];
  var trend = n > 1 ? (data[n - 1] - data[0]) / (n - 1) : 0;
  for (var k = 0; k < monthsAhead; k++) {
    var idx = (n + k) % seasonLen;
    var base = data[n - 1] + trend * (k + 1);
    preds.push(Math.max(0, Math.round(base * factors[idx])));
  }
  return preds;
}

function predictFuture(monthlyArr, monthsAhead) {
  var admissions = monthlyArr.map(function(m) { return m.admissions; });
  var n = admissions.length;
  if (n < 3) return { predictions: [], method: 'insufficient_data', accuracy: 'Low' };

  var linearPred = linearRegressionPredict(admissions, monthsAhead);
  var movingAvgPred = weightedMovingAveragePredict(admissions, monthsAhead);
  var expSmoothingPred = exponentialSmoothingPredict(admissions, monthsAhead);
  var seasonalPred = seasonalPredict(admissions, monthsAhead);

  var lastDate = new Date(monthlyArr[monthlyArr.length - 1].month + '-01');
  var preds = [];

  var accuracy = 'Medium';
  if (n >= 24) accuracy = 'High';
  else if (n >= 12) accuracy = 'Medium-High';
  else if (n >= 6) accuracy = 'Medium';
  else accuracy = 'Low';

  for (var i = 0; i < monthsAhead; i++) {
    var nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + (i + 1));
    var nextMonth = nextDate.getFullYear() + '-' + ('0' + (nextDate.getMonth() + 1)).slice(-2);

    var ensemble = Math.round(
      linearPred[i] * 0.25 +
      movingAvgPred[i] * 0.30 +
      expSmoothingPred[i] * 0.30 +
      seasonalPred[i] * 0.15
    );

    preds.push({
      month: nextMonth,
      predicted: Math.max(0, ensemble),
      linear: linearPred[i],
      movingAvg: movingAvgPred[i],
      expSmoothing: expSmoothingPred[i],
      seasonal: seasonalPred[i]
    });
  }

  // Confidence bands
  var residuals = [];
  var fitted = linearRegressionPredict(admissions, 0);
  for (var r = 0; r < n; r++) {
    residuals.push(admissions[r] - (fitted[r] !== undefined ? fitted[r] : admissions[r]));
  }
  var resVar = residuals.reduce(function(s, v) { return s + v * v; }, 0) / Math.max(residuals.length - 2, 1);
  var resStd = Math.sqrt(resVar);

  preds.forEach(function(p, idx) {
    var margin = Math.round(resStd * (1.0 + idx * 0.1));
    p.lower = Math.max(0, p.predicted - margin);
    p.upper = p.predicted + margin;
  });

  return {
    predictions: preds,
    method: 'ensemble',
    accuracy: accuracy,
    lastActual: admissions[n - 1],
    lastMonth: monthlyArr[monthlyArr.length - 1].month
  };
}
