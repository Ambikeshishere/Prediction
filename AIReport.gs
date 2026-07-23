/**
 * AI REPORT GENERATOR v2
 * Weekly Analysis + Boost Strategy + Center Comparison
 */

function generateAIReport(data) {
  var report = {};
  report.title = generateTitle(data.filters);
  report.executiveSummary = genExecSummary(data);
  report.weeklyAnalysis = genWeeklyAnalysis(data);
  report.centerDeepDive = genCenterDeepDive(data);
  report.boostStrategy = genBoostStrategy(data);
  report.centerComparison = genCenterComparison(data);
  report.cycleInsights = genCycleInsights(data);
  report.predictionInsights = genPredInsights(data);
  report.riskAssessment = genRiskAssessment(data);
  report.actionPlan = genActionPlan(data);
  return report;
}

function generateTitle(filters) {
  var parts = ['Admission Analysis & Forecast Report'];
  if (filters.region && filters.region !== 'All') parts.push('Region: ' + filters.region);
  if (filters.center && filters.center !== 'All') parts.push('Center: ' + filters.center);
  parts.push('Cycle: September - August');
  var now = new Date();
  parts.push('Generated: ' + now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
  return parts.join(' | ');
}

function genExecSummary(d) {
  var s = d.overallStats;
  var g = d.growth;
  var p = d.predictions;
  var lines = [];

  lines.push('This report analyzes the September-August admission cycle covering ' + s.count + ' months of data.');
  lines.push('Total admissions across the period: ' + fmt(s.total) + ' (Monthly average: ' + fmt(s.average) + ').');
  lines.push('The overall trend is ' + cap(g.trend) + ' with a month-over-month change of ' + g.mom.toFixed(1) + '%.\n');

  if (d.cycleComparison && d.cycleComparison.hasComparison && d.cycleComparison.comparisons.length > 0) {
    var comp = d.cycleComparison.comparisons[d.cycleComparison.comparisons.length - 1];
    lines.push('Year-over-year cycle comparison (' + comp.previousCycle + ' vs ' + comp.currentCycle + '):');
    lines.push('Previous cycle total: ' + fmt(comp.prevTotal) + ' | Current cycle total: ' + fmt(comp.currTotal));
    lines.push('Growth: ' + (comp.growth >= 0 ? '+' : '') + comp.growth.toFixed(1) + '%\n');
  }

  var centers = Object.keys(d.weeklyCenterAnalysis);
  lines.push('Analysis covers ' + centers.length + ' center(s) across ' + d.cycles.length + ' admission cycle(s).\n');

  // Weekly pattern summary
  var overallPcts = d.centerComparison.overallWeekPcts || {};
  lines.push('OVERALL WEEKLY DISTRIBUTION:');
  ['W1','W2','W3','W4','W5'].forEach(function(w) {
    if (overallPcts[w] && overallPcts[w] > 0) {
      lines.push('  Week ' + w.substring(1) + ': ' + overallPcts[w].toFixed(1) + '% of total admissions');
    }
  });

  return lines.join('\n');
}

function genWeeklyAnalysis(d) {
  var lines = [];
  var wca = d.weeklyCenterAnalysis;
  var overallPcts = d.centerComparison.overallWeekPcts || {};

  lines.push('WEEK-WISE ADMISSION DISTRIBUTION PER CENTER\n');
  lines.push('This analysis shows how admissions are spread across the 4-5 weeks of each month.');
  lines.push('Comparing each center\'s weekly pattern against the overall average.\n');

  Object.keys(wca).forEach(function(center) {
    var cw = wca[center];
    lines.push('========================================');
    lines.push('CENTER: ' + center + ' [' + cw.region + ']');
    lines.push('Total Admissions: ' + fmt(cw.total));
    lines.push('========================================\n');

    lines.push('Week | Admissions | Avg/Week | % Share  | vs Overall | Status');
    lines.push('-----|------------|----------|----------|------------|--------');

    ['W1','W2','W3','W4','W5'].forEach(function(w) {
      var ws = cw.weekStats[w];
      if (ws.count === 0) return;
      var overallPct = overallPcts[w] || 0;
      var diff = overallPct > 0 ? Math.round((ws.percent - overallPct) * 100) / 100 : 0;
      var status = diff < -10 ? 'WEAK' : diff > 10 ? 'STRONG' : 'OK';
      var bar = generateSmallBar(ws.percent, 15);
      lines.push(
        '  ' + w + '  | ' +
        padLeft(fmt(ws.total), 10) + ' | ' +
        padLeft(fmt(ws.avg), 8) + ' | ' +
        padLeft(ws.percent.toFixed(1) + '%', 8) + ' | ' +
        padLeft((diff >= 0 ? '+' : '') + diff.toFixed(1) + '%', 10) + ' | ' +
        status + ' ' + bar
      );
    });
    lines.push('');
  });

  // Overall pattern
  lines.push('========================================');
  lines.push('OVERALL WEEKLY PATTERN (All Centers)');
  lines.push('========================================\n');
  ['W1','W2','W3','W4','W5'].forEach(function(w) {
    if (overallPcts[w] && overallPcts[w] > 0) {
      var bar = generateBar(overallPcts[w], 30);
      lines.push('Week ' + w.substring(1) + ': ' + overallPcts[w].toFixed(1) + '% ' + bar);
    }
  });

  return lines.join('\n');
}

function genCenterDeepDive(d) {
  var lines = [];
  var wca = d.weeklyCenterAnalysis;
  var br = d.boostRecommendations;

  lines.push('CENTER-WISE DEEP DIVE\n');
  lines.push('Detailed analysis of each center\'s weekly admission patterns,\n');
  lines.push('strengths, weaknesses, and targeted recommendations.\n');

  Object.keys(wca).forEach(function(center) {
    var cw = wca[center];
    var rec = br[center];

    lines.push('######################################');
    lines.push('# ' + center + ' [' + cw.region + ']');
    lines.push('######################################');
    lines.push('Total Admissions: ' + fmt(cw.total));
    lines.push('');

    // Week-by-week breakdown
    lines.push('Week-by-Week Performance:');
    lines.push('  Week 1: ' + fmt(cw.weekStats.W1.total) + ' admissions (' + cw.weekStats.W1.percent.toFixed(1) + '%)');
    lines.push('  Week 2: ' + fmt(cw.weekStats.W2.total) + ' admissions (' + cw.weekStats.W2.percent.toFixed(1) + '%)');
    lines.push('  Week 3: ' + fmt(cw.weekStats.W3.total) + ' admissions (' + cw.weekStats.W3.percent.toFixed(1) + '%)');
    lines.push('  Week 4: ' + fmt(cw.weekStats.W4.total) + ' admissions (' + cw.weekStats.W4.percent.toFixed(1) + '%)');
    if (cw.weekStats.W5.count > 0) {
      lines.push('  Week 5: ' + fmt(cw.weekStats.W5.total) + ' admissions (' + cw.weekStats.W5.percent.toFixed(1) + '%)');
    }
    lines.push('');

    // Weak weeks
    if (rec.weakWeeks.length > 0) {
      lines.push('WEAK WEEKS (need improvement):');
      rec.weakWeeks.forEach(function(ww) {
        lines.push('  -> ' + ww.week + ': Only ' + ww.current.toFixed(1) + '% (expected ' + ww.expected.toFixed(1) + '%)');
        lines.push('     Gap: ' + ww.diff.toFixed(1) + ' percentage points below average');
      });
      lines.push('');
    }

    // Strong weeks
    if (rec.strongWeeks.length > 0) {
      lines.push('STRONG WEEKS (performing above average):');
      rec.strongWeeks.forEach(function(sw) {
        lines.push('  -> ' + sw.week + ': ' + sw.current.toFixed(1) + '% (expected ' + sw.expected.toFixed(1) + '%)');
        lines.push('     Excess: +' + sw.diff.toFixed(1) + ' percentage points above average');
      });
      lines.push('');
    }

    // Boost recommendations
    if (rec.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      rec.recommendations.forEach(function(r, idx) {
        lines.push('  ' + (idx + 1) + '. [' + r.type + '] ' + r.message);
      });
      lines.push('');
    }

    lines.push('Strategy: ' + rec.strategy);
    lines.push('');
  });

  return lines.join('\n');
}

function genBoostStrategy(d) {
  var lines = [];
  var br = d.boostRecommendations;
  var wca = d.weeklyCenterAnalysis;

  lines.push('BOOST STRATEGY - WHERE TO FOCUS\n');
  lines.push('Prioritized list of centers and weeks that need immediate attention.\n');

  // Collect all weak weeks across centers
  var allWeak = [];
  Object.keys(br).forEach(function(center) {
    br[center].weakWeeks.forEach(function(ww) {
      allWeak.push({
        center: center,
        region: wca[center].region,
        week: ww.week,
        gap: Math.abs(ww.diff),
        current: ww.current,
        expected: ww.expected,
        total: wca[center].total
      });
    });
  });

  allWeak.sort(function(a, b) { return b.gap - a.gap; });

  if (allWeak.length === 0) {
    lines.push('ALL CENTERS ARE PERFORMING WELL!');
    lines.push('No significant weak weeks detected. Maintain current strategy.\n');
    lines.push('Continue monitoring and consider scaling successful practices');
    lines.push('from strong weeks to maintain balance.');
    return lines.join('\n');
  }

  lines.push('PRIORITY 1 - CRITICAL BOOST NEEDED (Gap > 15%):');
  var critical = allWeak.filter(function(w) { return w.gap > 15; });
  if (critical.length === 0) {
    lines.push('  (No critical gaps found)\n');
  } else {
    critical.forEach(function(w) {
      lines.push('  * ' + w.center + ' [' + w.region + '] - ' + w.week);
      lines.push('    Current: ' + w.current.toFixed(1) + '% | Expected: ' + w.expected.toFixed(1) + '%');
      lines.push('    Gap: -' + w.gap.toFixed(1) + ' percentage points');
      var boostNum = Math.round(w.total * (w.expected - w.current) / 100);
      lines.push('    Need: ' + boostNum + ' more admissions in this week\n');
    });
  }

  lines.push('PRIORITY 2 - MODERATE BOOST NEEDED (Gap 10-15%):');
  var moderate = allWeak.filter(function(w) { return w.gap >= 10 && w.gap <= 15; });
  if (moderate.length === 0) {
    lines.push('  (No moderate gaps found)\n');
  } else {
    moderate.forEach(function(w) {
      lines.push('  * ' + w.center + ' [' + w.region + '] - ' + w.week);
      lines.push('    Current: ' + w.current.toFixed(1) + '% | Expected: ' + w.expected.toFixed(1) + '%');
      var boostNum = Math.round(w.total * (w.expected - w.current) / 100);
      lines.push('    Need: ' + boostNum + ' more admissions\n');
    });
  }

  lines.push('RECOMMENDED ACTIONS:');
  lines.push('');
  lines.push('For WEAK weeks:');
  lines.push('  - Run targeted marketing campaigns 1-2 weeks before the weak week');
  lines.push('  - Offer early-bird incentives or registration drives');
  lines.push('  - Increase outreach through local channels (social media, flyers, calls)');
  lines.push('  - Partner with schools/colleges for bulk awareness');
  lines.push('');
  lines.push('For STRONG weeks:');
  lines.push('  - Analyze what works well and replicate the approach');
  lines.push('  - Ensure staff capacity is adequate for high-volume weeks');
  lines.push('  - Consider overflow management strategies');

  return lines.join('\n');
}

function genCenterComparison(d) {
  var lines = [];
  var cc = d.centerComparison;

  lines.push('CENTER COMPARISON & SIMILARITY ANALYSIS\n');

  // Rankings
  lines.push('PERFORMANCE RANKINGS (by total admissions):');
  lines.push('Rank | Center                    | Region        | Total   | Avg/Month');
  lines.push('-----|---------------------------|---------------|---------|----------');
  cc.rankings.forEach(function(r, idx) {
    lines.push(padLeft(String(idx + 1), 4) + ' | ' +
      padRight(r.center, 25) + ' | ' +
      padRight(r.region, 13) + ' | ' +
      padLeft(fmt(r.total), 7) + ' | ' +
      padLeft(fmt(r.avg), 8));
  });
  lines.push('');

  // Similarity
  if (cc.similarity.length > 0) {
    lines.push('CENTER SIMILARITY (which centers behave alike):');
    lines.push('Based on weekly admission distribution patterns.\n');
    cc.similarity.slice(0, 10).forEach(function(s, idx) {
      lines.push((idx + 1) + '. ' + s.center1 + ' <-> ' + s.center2);
      lines.push('   Similarity Score: ' + s.similarity.toFixed(1) + '%');
      lines.push('   Distance: ' + s.distance.toFixed(2));
    });
    lines.push('');
  }

  // Most similar for each
  if (cc.mostSimilar) {
    lines.push('FOR EACH CENTER, MOST SIMILAR PEER:');
    Object.keys(cc.mostSimilar).forEach(function(c) {
      var ms = cc.mostSimilar[c];
      lines.push('  ' + c + ' -> ' + ms.similarTo + ' (' + ms.similarity.toFixed(1) + '% similar)');
    });
    lines.push('');
  }

  lines.push('OVERALL STATISTICS:');
  lines.push('  Total centers: ' + cc.rankings.length);
  lines.push('  Total admissions: ' + fmt(cc.overall.total));
  lines.push('  Average per center: ' + fmt(cc.overall.avgPerCenter));

  return lines.join('\n');
}

function genCycleInsights(d) {
  var lines = [];
  if (!d.cycleComparison.hasComparison) {
    lines.push('CYCLE COMPARISON');
    lines.push('Only one admission cycle found in data.');
    lines.push('Need at least 2 cycles (Sept-Aug years) for year-over-year comparison.');
    lines.push('Keep collecting data for future cycle comparisons.');
    return lines.join('\n');
  }

  lines.push('ADMISSION CYCLE COMPARISON (Sept-Aug)\n');
  d.cycleComparison.comparisons.forEach(function(c) {
    lines.push(c.previousCycle + ' vs ' + c.currentCycle + ':');
    lines.push('  Previous: ' + fmt(c.prevTotal) + ' admissions');
    lines.push('  Current:  ' + fmt(c.currTotal) + ' admissions');
    lines.push('  Growth:   ' + (c.growth >= 0 ? '+' : '') + c.growth.toFixed(1) + '%');
    if (c.growth >= 10) {
      lines.push('  Status: Strong growth - excellent progress!');
    } else if (c.growth >= 0) {
      lines.push('  Status: Moderate growth - room for improvement.');
    } else {
      lines.push('  Status: DECLINE - requires immediate attention!');
    }
    lines.push('');
  });

  return lines.join('\n');
}

function genPredInsights(d) {
  var p = d.predictions;
  var lines = [];
  if (!p.predictions || p.predictions.length === 0) {
    lines.push('Insufficient data for predictions.');
    return lines.join('\n');
  }

  lines.push('FORECAST FOR NEXT ' + p.predictions.length + ' MONTHS\n');
  lines.push('Model: Ensemble (Linear + Moving Average + Exponential Smoothing + Seasonal)');
  lines.push('Confidence: ' + p.accuracy);
  lines.push('Last actual: ' + fmt(p.lastActual) + ' (' + fmtMonth(p.lastMonth) + ')\n');

  lines.push('Month      | Predicted | Range (Low-High) | vs Average');
  lines.push('-----------|-----------|------------------|-----------');
  p.predictions.forEach(function(pred) {
    var vsAvg = d.overallStats.average > 0 ? ((pred.predicted - d.overallStats.average) / d.overallStats.average * 100).toFixed(1) : '0.0';
    lines.push(
      fmtMonth(pred.month) + ' | ' +
      padLeft(fmt(pred.predicted), 9) + ' | ' +
      padLeft(fmt(pred.lower) + '-' + fmt(pred.upper), 16) + ' | ' +
      (vsAvg >= 0 ? '+' : '') + vsAvg + '%'
    );
  });

  var totalPred = p.predictions.reduce(function(a, b) { return a + b.predicted; }, 0);
  lines.push('\nTotal forecasted: ' + fmt(totalPred));
  lines.push('Monthly average (predicted): ' + fmt(Math.round(totalPred / p.predictions.length)));
  lines.push('vs Historical average: ' + fmt(d.overallStats.average));

  return lines.join('\n');
}

function genRiskAssessment(d) {
  var lines = [];
  var risks = [];
  var score = 0;

  if (d.growth.trend === 'declining') {
    score += 3;
    risks.push({ level: 'HIGH', desc: 'Declining admission trend' });
  }
  if (d.overallStats.cv > 40) {
    score += 2;
    risks.push({ level: 'MEDIUM', desc: 'High volatility (CV: ' + d.overallStats.cv + '%)' });
  }

  var weakCenters = 0;
  Object.keys(d.boostRecommendations).forEach(function(c) {
    if (d.boostRecommendations[c].weakWeeks.length >= 2) weakCenters++;
  });
  if (weakCenters > 0) {
    score += 2;
    risks.push({ level: 'MEDIUM', desc: weakCenters + ' center(s) with multiple weak weeks' });
  }

  if (d.cycleComparison.hasComparison) {
    var lastComp = d.cycleComparison.comparisons[d.cycleComparison.comparisons.length - 1];
    if (lastComp.growth < -10) {
      score += 3;
      risks.push({ level: 'HIGH', desc: 'Year-over-year decline of ' + lastComp.growth.toFixed(1) + '%' });
    }
  }

  if (risks.length === 0) {
    risks.push({ level: 'LOW', desc: 'No significant risks detected' });
    score = 1;
  }

  var overall = score >= 5 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';

  lines.push('RISK LEVEL: ' + overall + ' (Score: ' + score + '/10)\n');
  risks.forEach(function(r) {
    lines.push('[' + r.level + '] ' + r.desc);
  });

  return lines.join('\n');
}

function genActionPlan(d) {
  var lines = [];
  var num = 1;

  lines.push('PRIORITY ACTION ITEMS\n');

  // Critical boosts
  var criticalCenters = [];
  Object.keys(d.boostRecommendations).forEach(function(c) {
    var weak = d.boostRecommendations[c].weakWeeks;
    if (weak.length > 0) {
      var maxGap = Math.max.apply(null, weak.map(function(w) { return Math.abs(w.gap); }));
      if (maxGap > 15) criticalCenters.push({ center: c, gap: maxGap });
    }
  });
  criticalCenters.sort(function(a, b) { return b.gap - a.gap; });

  if (criticalCenters.length > 0) {
    lines.push((num++) + '. [URGENT] Focus on underperforming centers:');
    criticalCenters.forEach(function(cc) {
      lines.push('   - ' + cc.center + ': Gap of ' + cc.gap.toFixed(1) + '% in weak weeks');
    });
    lines.push('');
  }

  // Strong centers to learn from
  var strongCenters = [];
  Object.keys(d.boostRecommendations).forEach(function(c) {
    if (d.boostRecommendations[c].weakWeeks.length === 0 && d.boostRecommendations[c].strongWeeks.length > 0) {
      strongCenters.push(c);
    }
  });
  if (strongCenters.length > 0) {
    lines.push((num++) + '. [LEARN] Study successful centers:');
    strongCenters.forEach(function(c) {
      lines.push('   - ' + c + ': No weak weeks, replicate their strategy');
    });
    lines.push('');
  }

  // Similar centers can share practices
  if (d.centerComparison.mostSimilar) {
    lines.push((num++) + '. [COLLABORATE] Pair similar centers for knowledge sharing:');
    var pairs = [];
    var seen = {};
    Object.keys(d.centerComparison.mostSimilar).forEach(function(c) {
      var ms = d.centerComparison.mostSimilar[c];
      var key = [c, ms.similarTo].sort().join('-');
      if (!seen[key] && ms.similarTo !== 'N/A') {
        pairs.push(c + ' <-> ' + ms.similarTo);
        seen[key] = true;
      }
    });
    pairs.slice(0, 5).forEach(function(p) {
      lines.push('   - ' + p);
    });
    lines.push('');
  }

  lines.push((num++) + '. [MONITOR] Weekly tracking dashboard activate karo');
  lines.push('   - Har hafte actual vs target track karo');
  lines.push('   - Monthly review meeting with center heads');

  return lines.join('\n');
}

// -- Helpers -------------------------------------------------------
function fmt(n) {
  if (n === undefined || n === null) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtMonth(monthStr) {
  if (!monthStr || monthStr === 'N/A') return 'N/A';
  var parts = monthStr.split('-');
  var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return mNames[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function padLeft(s, n) {
  while (s.length < n) s = ' ' + s;
  return s;
}

function padRight(s, n) {
  while (s.length < n) s = s + ' ';
  return s;
}

function generateBar(pct, width) {
  var filled = Math.round(pct / 100 * width);
  return '[' + Array(filled + 1).join('#') + Array(width - filled + 1).join('-') + ']';
}

function generateSmallBar(pct, width) {
  var filled = Math.round(pct / 100 * width);
  return '[' + Array(filled + 1).join('#') + Array(width - filled + 1).join('-') + ']';
}
