#!/usr/bin/env node

/**
 * Lighthouse Results Analyzer
 * Analyzes Lighthouse CI results and generates performance reports
 * Usage: node scripts/analyze-lighthouse-results.js
 */

const fs = require('fs');
const path = require('path');

function analyzeResults() {
  const lighthouseDir = path.join(process.cwd(), '.lighthouseci');

  if (!fs.existsSync(lighthouseDir)) {
    console.error('Error: .lighthouseci directory not found. Run Lighthouse CI first.');
    process.exit(1);
  }

  const resultsDir = path.join(lighthouseDir, 'lhr');
  if (!fs.existsSync(resultsDir)) {
    console.error('Error: No LHR results found.');
    process.exit(1);
  }

  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.error('Error: No JSON results found.');
    process.exit(1);
  }

  const results = [];
  files.forEach(file => {
    const filePath = path.join(resultsDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    results.push({
      url: content.finalUrl,
      timestamp: content.fetchTime,
      categories: content.categories,
      audits: content.audits,
      metrics: {
        lcp: content.audits['largest-contentful-paint']?.numericValue,
        fid: content.audits['first-input-delay']?.numericValue,
        cls: content.audits['cumulative-layout-shift']?.numericValue,
        fcp: content.audits['first-contentful-paint']?.numericValue,
        tti: content.audits['interactive']?.numericValue
      }
    });
  });

  // Calculate statistics
  const stats = {
    pageCount: results.length,
    timestamp: new Date().toISOString(),
    byPage: {}
  };

  results.forEach(result => {
    const url = result.url;
    if (!stats.byPage[url]) {
      stats.byPage[url] = {
        scores: [],
        metrics: {
          lcp: [],
          fid: [],
          cls: [],
          fcp: [],
          tti: []
        }
      };
    }

    // Score calculations
    const scores = {
      performance: Math.round(result.categories.performance.score * 100),
      accessibility: Math.round(result.categories.accessibility.score * 100),
      bestPractices: Math.round(result.categories['best-practices'].score * 100),
      seo: Math.round(result.categories.seo.score * 100)
    };

    stats.byPage[url].scores.push(scores);

    // Metric collection
    Object.keys(result.metrics).forEach(metric => {
      if (result.metrics[metric] !== undefined && result.metrics[metric] !== null) {
        stats.byPage[url].metrics[metric].push(result.metrics[metric]);
      }
    });
  });

  // Generate report
  console.log('\n========================================');
  console.log('  LIGHTHOUSE CI PERFORMANCE REPORT');
  console.log('========================================\n');
  console.log(`Generated: ${stats.timestamp}`);
  console.log(`Pages Audited: ${stats.pageCount}\n`);

  Object.entries(stats.byPage).forEach(([url, pageStats]) => {
    console.log(`\n📄 ${url}`);
    console.log('-'.repeat(60));

    if (pageStats.scores.length > 0) {
      const avgScores = {
        performance: Math.round(pageStats.scores.reduce((a, b) => a + b.performance, 0) / pageStats.scores.length),
        accessibility: Math.round(pageStats.scores.reduce((a, b) => a + b.accessibility, 0) / pageStats.scores.length),
        bestPractices: Math.round(pageStats.scores.reduce((a, b) => a + b.bestPractices, 0) / pageStats.scores.length),
        seo: Math.round(pageStats.scores.reduce((a, b) => a + b.seo, 0) / pageStats.scores.length)
      };

      console.log('\n  Lighthouse Scores (Average):\n');
      console.log(`    Performance:      ${getScoreBar(avgScores.performance)} ${avgScores.performance}/100`);
      console.log(`    Accessibility:    ${getScoreBar(avgScores.accessibility)} ${avgScores.accessibility}/100`);
      console.log(`    Best Practices:   ${getScoreBar(avgScores.bestPractices)} ${avgScores.bestPractices}/100`);
      console.log(`    SEO:              ${getScoreBar(avgScores.seo)} ${avgScores.seo}/100`);

      console.log('\n  Core Web Vitals (Median):\n');
      const metrics = calculateMedians(pageStats.metrics);
      console.log(`    LCP (Largest Contentful Paint):    ${metrics.lcp}ms`);
      console.log(`    FID (First Input Delay):           ${metrics.fid}ms`);
      console.log(`    CLS (Cumulative Layout Shift):     ${metrics.cls}`);
      console.log(`    FCP (First Contentful Paint):      ${metrics.fcp}ms`);
      console.log(`    TTI (Time to Interactive):         ${metrics.tti}ms`);

      console.log('\n  Target Compliance:\n');
      console.log(`    Performance >= 75:      ${avgScores.performance >= 75 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`    Accessibility >= 90:    ${avgScores.accessibility >= 90 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`    Best Practices >= 85:   ${avgScores.bestPractices >= 85 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`    SEO >= 90:              ${avgScores.seo >= 90 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`    LCP < 2500ms:           ${metrics.lcp < 2500 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`    CLS < 0.1:              ${metrics.cls < 0.1 ? '✅ PASS' : '❌ FAIL'}`);
    }
  });

  console.log('\n========================================\n');

  // Exit with error code if any check failed
  const hasFailed = Object.entries(stats.byPage).some(([_, pageStats]) => {
    if (pageStats.scores.length === 0) return false;
    const avgScores = {
      performance: Math.round(pageStats.scores.reduce((a, b) => a + b.performance, 0) / pageStats.scores.length),
      accessibility: Math.round(pageStats.scores.reduce((a, b) => a + b.accessibility, 0) / pageStats.scores.length),
      bestPractices: Math.round(pageStats.scores.reduce((a, b) => a + b.bestPractices, 0) / pageStats.scores.length),
      seo: Math.round(pageStats.scores.reduce((a, b) => a + b.seo, 0) / pageStats.scores.length)
    };
    const metrics = calculateMedians(pageStats.metrics);
    return !(
      avgScores.performance >= 75 &&
      avgScores.accessibility >= 90 &&
      avgScores.bestPractices >= 85 &&
      avgScores.seo >= 90 &&
      metrics.lcp < 2500 &&
      metrics.cls < 0.1
    );
  });

  if (hasFailed) {
    console.error('❌ Some performance targets were not met.');
    process.exit(1);
  } else {
    console.log('✅ All performance targets met!');
    process.exit(0);
  }
}

function getScoreBar(score) {
  const filled = Math.round((score / 100) * 20);
  const empty = 20 - filled;
  let color;
  if (score >= 90) color = '🟢';
  else if (score >= 75) color = '🟡';
  else color = '🔴';
  return `${color} ${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

function calculateMedians(metrics) {
  return {
    lcp: getMedian(metrics.lcp),
    fid: getMedian(metrics.fid),
    cls: parseFloat(getMedian(metrics.cls).toFixed(3)),
    fcp: getMedian(metrics.fcp),
    tti: getMedian(metrics.tti)
  };
}

function getMedian(arr) {
  if (arr.length === 0) return 'N/A';
  const sorted = arr.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

analyzeResults();
