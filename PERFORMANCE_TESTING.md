# Performance Testing Guide

This guide explains how to run performance tests and monitor the StellarRaise frontend application using Lighthouse CI.

## Overview

The performance testing setup includes:

1. **Lighthouse CI**: Automated performance auditing integrated with CI/CD
2. **Performance Budget**: Defined thresholds for various Lighthouse metrics
3. **Local Testing**: Scripts to run performance tests on your local machine
4. **GitHub Actions**: Automated testing on every pull request and push to main

## Local Testing

### Prerequisites

- Node.js 18+
- npm or yarn
- Local development environment set up

### Running Performance Tests

#### Quick Performance Audit

To run a single Lighthouse audit on your local build:

```bash
# Build the application
npm run build

# Start the production server
npm start

# In another terminal, run the audit
npm run lighthouse:audit
```

#### Complete Performance Test

To run a full performance test with results analysis:

```bash
npm run performance:test
```

This command will:
1. Build the application
2. Start the production server
3. Run Lighthouse CI
4. Analyze results
5. Display a performance report

### Analyzing Results

After running Lighthouse CI, analyze the results with:

```bash
npm run lighthouse:analyze
```

This will display:
- Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
- Core Web Vitals (LCP, FID, CLS, FCP, TTI)
- Compliance with performance targets
- Detailed pass/fail indicators

### Manual Lighthouse Audits

For detailed analysis, you can use the Lighthouse CLI directly:

```bash
# Install Lighthouse globally (optional)
npm install -g lighthouse

# Run audit on running server
lighthouse http://localhost:3000 --view
```

## CI/CD Integration

### GitHub Actions Workflow

The performance workflow (`.github/workflows/performance.yml`) runs on:
- Every pull request to `main` or `develop`
- Every push to `main`

The workflow:
1. Builds the application
2. Runs Lighthouse CI audits (3 runs per page)
3. Uploads results as artifacts
4. Comments on PR with results summary
5. Fails the build if thresholds are exceeded

### Interpreting CI Results

When a PR is created or updated:
- GitHub Actions runs performance tests automatically
- Results appear as a comment on your PR
- A green checkmark (✅) indicates all thresholds are met
- A red X (❌) indicates thresholds need improvement

## Performance Targets

See [PERFORMANCE_BUDGET.md](./PERFORMANCE_BUDGET.md) for detailed information about performance targets and justification.

### Quick Reference

| Metric | Target |
|--------|--------|
| **Lighthouse Performance** | ≥ 75 |
| **Lighthouse Accessibility** | ≥ 90 |
| **Lighthouse Best Practices** | ≥ 85 |
| **Lighthouse SEO** | ≥ 90 |
| **LCP (Largest Contentful Paint)** | < 2.5s |
| **CLS (Cumulative Layout Shift)** | < 0.1 |
| **FID (First Input Delay)** | < 100ms |

## Troubleshooting

### Common Issues

#### "Cannot find module @lhci/cli"

```bash
npm install --save-dev @lhci/cli lighthouse
```

#### Performance test hangs waiting for server

Ensure no process is running on port 3000:

```bash
lsof -i :3000
kill -9 <PID>
```

#### "EADDRINUSE: address already in use :::3000"

```bash
# Find and kill process on port 3000
npm run build && npm start
```

#### Lighthouse results vary between runs

This is normal! Lighthouse CI runs 3 audits per page and uses median values to account for variance. Slight variations are expected.

### Improving Performance

#### Identify Bottlenecks

1. Check the Lighthouse report for "Opportunities"
2. Look for red/orange sections in the report
3. Review "Diagnostics" section for specific issues

#### Common Optimizations

1. **Code Splitting**
   - Use dynamic imports for heavy components
   - Lazy load routes and modals

2. **Image Optimization**
   - Use Next.js Image component
   - Compress images before upload

3. **Bundle Analysis**
   ```bash
   npm run build -- --analyze
   ```

4. **Caching Strategy**
   - Implement service workers
   - Configure proper cache headers

5. **Third-party Scripts**
   - Defer non-critical scripts
   - Use worker threads if available

## Monitoring Performance Over Time

### Tracking Trends

Performance results are stored in GitHub Actions artifacts:
1. Go to Actions tab in GitHub
2. Select the workflow run
3. Download "lighthouse-results" artifact
4. Compare results across runs

### Performance Regression Detection

The CI automatically detects regressions:
- If a metric drops below the threshold, the build fails
- PR comments highlight the regression
- Historical comparison helps identify trends

## Configuration Reference

### lighthouserc.json

The main Lighthouse CI configuration file. Key sections:

- **collect**: Configuration for running audits
  - `url`: URLs to audit
  - `numberOfRuns`: How many times each URL is audited
  - `chromeFlags`: Browser flags for audit

- **assert**: Performance assertions
  - `preset`: Use recommended Lighthouse assertions
  - `assertions`: Custom metric thresholds
  - `categories`: Lighthouse score requirements

- **upload**: Result storage configuration

### Performance Budget (PERFORMANCE_BUDGET.md)

Documents:
- Target thresholds and justification
- Optimization roadmap
- Monitoring schedule
- Metrics to track

## Advanced Topics

### Custom Metrics

To add custom performance metrics:

1. Create a custom audit in your application
2. Add to `lighthouserc.json` assertions
3. Document in PERFORMANCE_BUDGET.md

### Budget Adjustment

To adjust thresholds:

1. Review current performance baseline
2. Set realistic but challenging targets
3. Document justification in PERFORMANCE_BUDGET.md
4. Update `lighthouserc.json`
5. Create PR for team review

### Integration with Other Tools

- **Next.js Analyzer**: `npm run build -- --analyze`
- **Bundle Buddy**: Monitor bundle size over time
- **Performance Observer API**: Track metrics from production

## Resources

- [Lighthouse Documentation](https://github.com/GoogleChrome/lighthouse)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Performance Observer API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)

## Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review [Lighthouse CI documentation](https://github.com/GoogleChrome/lighthouse-ci)
3. Check GitHub Issues for similar problems
4. Run `lhci --help` for CLI options
