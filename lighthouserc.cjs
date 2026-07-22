module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [
        'http://127.0.0.1:4173/',
        'http://127.0.0.1:4173/murugan-song-library.html',
        'http://127.0.0.1:4173/platform-hub.html',
        'http://127.0.0.1:4173/temples.html',
        'http://127.0.0.1:4173/ai-search.html',
        'http://127.0.0.1:4173/content-completeness.html'
      ],
      settings: {
        preset: 'desktop',
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo'
        ],
        chromeFlags: '--headless=new --no-sandbox --disable-dev-shm-usage'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.9}],
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-description': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'image-alt': 'error',
        'color-contrast': 'error',
        'viewport': 'error',
        'errors-in-console': 'warn',
        'unused-javascript': 'warn',
        'unused-css-rules': 'warn',
        'largest-contentful-paint': ['warn', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['warn', {maxNumericValue: 0.1}],
        'total-blocking-time': ['warn', {maxNumericValue: 200}]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: 'reports/phase-h-lighthouse'
    }
  }
};
