# Performance Budget

This document defines the performance thresholds for the StellarRaise frontend application. Performance budgets help maintain application performance and prevent regressions.

## Web Vitals Targets

### Core Web Vitals

| Metric | Target | Justification |
|--------|--------|---------------|
| **Largest Contentful Paint (LCP)** | < 2.5s | Ensures primary content is visible within 2.5 seconds. Critical for user perception of performance. |
| **First Input Delay (FID)** | < 100ms | Ensures the page responds quickly to user interactions. Important for smooth user experience. |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Minimizes unexpected layout changes. Essential for stability during page load. |

### Lighthouse Scores

| Category | Target Score | Justification |
|----------|--------------|---------------|
| **Performance** | ≥ 75 | Ensures fast load times. Initial target is conservative due to current codebase state. Will be increased as optimizations are implemented. |
| **Accessibility** | ≥ 90 | Ensures application is usable by everyone, including users with disabilities. |
| **Best Practices** | ≥ 85 | Maintains code quality and follows web standards. |
| **SEO** | ≥ 90 | Improves discoverability and search ranking. |

## Performance Testing Strategy

### Lighthouse CI Configuration

1. **Measurement Frequency**: Performance audits run on every pull request
2. **Test Pages**: Core application pages are audited:
   - Home page (`/`)
   - Campaigns page (`/campaigns`)
3. **Sample Runs**: Each audit runs 3 times to account for variance
4. **Variance Handling**: Results use median values to reduce measurement noise

### CI/CD Integration

- Failing builds: Builds fail if any threshold is exceeded
- Report Generation: Detailed reports stored in temporary public storage
- Historical Tracking: Results tracked over time through GitHub Actions artifacts

## Performance Optimization Roadmap

### Phase 1: Current Targets (v0.1.0)
- Performance: ≥ 75
- Bundle optimization for React 19 and Next.js 16
- Implementation of code splitting for modal components

### Phase 2: Intermediate Targets (v0.2.0)
- Performance: ≥ 80
- Image optimization with Next.js Image component
- Lazy loading for non-critical components

### Phase 3: Advanced Targets (v1.0.0)
- Performance: ≥ 90
- Advanced bundle analysis and tree-shaking
- Service Worker implementation for offline support

## Justification for Initial Thresholds

### Performance Score (75)

The initial performance score target of 75 reflects:
- Current application complexity with Framer Motion animations
- Large dependency tree (Radix UI, Stellar SDK, etc.)
- Unoptimized bundle at project inception
- Realistic improvements possible without major refactoring

As the codebase matures, this will be increased to 85+ through:
- Code splitting and dynamic imports
- Asset optimization
- Critical path optimization

### Accessibility Score (90)

High accessibility target (90) is maintained because:
- Accessibility issues are often easy to fix
- Radix UI components provide strong accessibility foundations
- User inclusivity is a core project value

### Best Practices Score (85)

Conservative best practices score accounts for:
- Type safety with TypeScript (already strong)
- Stellar SDK integration complexity
- Modern React patterns (React 19)

### SEO Score (90)

SEO target of 90 supports:
- Discovery of crowdfunding campaigns
- Project visibility
- Social media sharing

## Monitoring & Adjustment

### Review Schedule

- **Weekly**: Review performance trends from CI runs
- **Monthly**: Analyze bottlenecks and prioritize optimizations
- **Quarterly**: Adjust thresholds based on improvements and new dependencies

### Metrics to Track

1. Bundle size (total, JavaScript, CSS)
2. Time to Interactive (TTI)
3. First Contentful Paint (FCP)
4. Total Blocking Time (TBT)
5. Page Load Time (PLT)

## Resources

- [Web.dev Performance Guide](https://web.dev/performance/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Next.js Performance Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)
