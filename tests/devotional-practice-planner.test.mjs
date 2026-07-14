import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  STORAGE_KEY,
  addRouteToPlan,
  buildPlannerMetrics,
  checkInPlan,
  createPlan,
  deletePlan,
  filterEligibleRoutes,
  filterPlans,
  isPlanDueOnDate,
  loadPlans,
  localDateString,
  moveCurrentRoute,
  normaliseEligibleRoutes,
  normalisePlannerRoute,
  removeCheckIn,
  removeRouteFromPlan,
  resolvePlans,
  sanitisePlan,
  savePlans,
  updatePlan
} from '../assets/js/devotional-practice-planner.mjs';

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

const config = JSON.parse(
  fs.readFileSync(
    new URL('../data/devotional-practice-planner.json', import.meta.url),
    'utf8'
  )
);

const routesPayload = {
  release: 228,
  routes: [
    {
      path: '/literature/a.html',
      titleTa: 'அ',
      titleEn: 'Literature A',
      category: 'Literature',
      status: 'published',
      summary: 'Published'
    },
    {
      path: '/temples/a.html',
      titleTa: 'கோவில்',
      titleEn: 'Temple A',
      category: 'Temples',
      status: 'partial-reviewed',
      summary: 'Bounded'
    },
    {
      path: '/personal-data.html',
      titleEn: 'Personal Data',
      category: 'Platform',
      status: 'utility'
    },
    {
      path: '/draft.html',
      titleEn: 'Draft',
      category: 'Literature',
      status: 'draft'
    }
  ]
};

test('release and capacities are stable', () => {
  assert.equal(RELEASE, 228);
  assert.equal(config.release, 228);
  assert.equal(STORAGE_KEY, 'osb-devotional-practice-plans-v1');
  assert.equal(config.maximumPlans, 12);
  assert.equal(config.maximumRoutesPerPlan, 50);
  assert.equal(config.maximumCheckInsPerPlan, 180);
});

test('same-origin route normalisation rejects external routes', () => {
  assert.equal(
    normalisePlannerRoute('/literature/a.html'),
    '/literature/a.html'
  );
  assert.equal(
    normalisePlannerRoute('https://example.com/a.html'),
    ''
  );
});

test('sanitiser stores bounded route and check-in metadata only', () => {
  const plan = sanitisePlan({
    id: 'p1',
    name: 'Morning',
    weekdays: [1, 3, 3, 9],
    routes: [
      {
        route: '/literature/a.html',
        content: 'must not be stored'
      },
      {route: '/literature/a.html'},
      {route: 'https://example.com/out.html'}
    ],
    checkIns: [
      {
        date: '2026-07-14',
        route: '/literature/a.html',
        selectedText: 'must not be stored'
      }
    ],
    pageBody: 'must not be stored'
  }, {
    ...config,
    timestamp: '2026-07-14T12:00:00Z'
  });

  assert.deepEqual(plan.weekdays, [1, 3]);
  assert.equal(plan.routes.length, 1);
  assert.deepEqual(
    Object.keys(plan.routes[0]),
    ['route', 'addedAt']
  );
  assert.equal(plan.checkIns.length, 1);
  assert.deepEqual(
    Object.keys(plan.checkIns[0]),
    ['date', 'route', 'completedAt']
  );
  assert.equal('pageBody' in plan, false);
});

test('eligible routes exclude utility and draft pages', () => {
  const routes = normaliseEligibleRoutes(routesPayload, config);
  assert.deepEqual(
    routes.map(route => route.path).sort(),
    ['/literature/a.html', '/temples/a.html']
  );
});

test('plan creation copies collection route references', () => {
  const plans = createPlan(
    [],
    {
      id: 'p1',
      name: 'Collection Plan',
      sourceCollection: {
        id: 'c1',
        name: 'Collection',
        items: [
          {route: '/literature/a.html'},
          {route: '/temples/a.html'}
        ]
      },
      weekdays: [1, 5],
      timestamp: '2026-07-14T10:00:00Z'
    },
    config
  );
  assert.equal(plans.length, 1);
  assert.equal(plans[0].sourceCollectionId, 'c1');
  assert.equal(plans[0].routes.length, 2);
  assert.deepEqual(plans[0].weekdays, [1, 5]);
});

test('duplicate route prevention and removal cleanup', () => {
  let plans = createPlan(
    [],
    {
      id: 'p1',
      name: 'Plan',
      timestamp: '2026-07-14T10:00:00Z'
    },
    config
  );
  plans = addRouteToPlan(
    plans, 'p1', '/literature/a.html', config,
    '2026-07-14T10:10:00Z'
  );
  plans = addRouteToPlan(
    plans, 'p1', '/literature/a.html', config,
    '2026-07-14T10:20:00Z'
  );
  assert.equal(plans[0].routes.length, 1);

  plans = checkInPlan(
    plans, 'p1',
    {
      date: '2026-07-14',
      timestamp: '2026-07-14T11:00:00Z'
    },
    config
  );
  assert.equal(plans[0].checkIns.length, 1);

  plans = removeRouteFromPlan(
    plans, 'p1', '/literature/a.html', config,
    '2026-07-14T12:00:00Z'
  );
  assert.equal(plans[0].routes.length, 0);
  assert.equal(plans[0].checkIns.length, 0);
});

test('one same-date check-in is replaced and route advances', () => {
  let plans = [{
    id: 'p1',
    name: 'Plan',
    description: '',
    sourceCollectionId: '',
    weekdays: [],
    routes: [
      {route: '/literature/a.html'},
      {route: '/temples/a.html'}
    ],
    currentIndex: 0,
    checkIns: [],
    createdAt: '2026-07-14T09:00:00Z',
    updatedAt: '2026-07-14T09:00:00Z'
  }];

  plans = checkInPlan(
    plans, 'p1',
    {
      date: '2026-07-14',
      timestamp: '2026-07-14T10:00:00Z'
    },
    config
  );
  assert.equal(plans[0].checkIns.length, 1);
  assert.equal(plans[0].checkIns[0].route, '/literature/a.html');
  assert.equal(plans[0].currentIndex, 1);

  plans = checkInPlan(
    plans, 'p1',
    {
      date: '2026-07-14',
      timestamp: '2026-07-14T11:00:00Z'
    },
    config
  );
  assert.equal(plans[0].checkIns.length, 1);
  assert.equal(plans[0].checkIns[0].route, '/temples/a.html');
  assert.equal(plans[0].currentIndex, 0);

  plans = removeCheckIn(
    plans, 'p1', '2026-07-14', config,
    '2026-07-14T12:00:00Z'
  );
  assert.equal(plans[0].checkIns.length, 0);
});

test('route movement wraps and weekday guidance is deterministic', () => {
  let plans = [{
    id: 'p1',
    name: 'Plan',
    routes: [
      {route: '/literature/a.html'},
      {route: '/temples/a.html'}
    ],
    currentIndex: 0
  }];
  plans = moveCurrentRoute(plans, 'p1', 'previous');
  assert.equal(plans[0].currentIndex, 1);
  plans = moveCurrentRoute(plans, 'p1', 'next');
  assert.equal(plans[0].currentIndex, 0);

  const monday = new Date('2026-07-13T12:00:00');
  assert.equal(isPlanDueOnDate({weekdays: [1, 5]}, monday), true);
  assert.equal(isPlanDueOnDate({weekdays: [2]}, monday), false);
  assert.equal(isPlanDueOnDate({weekdays: []}, monday), true);
  assert.equal(localDateString(monday), '2026-07-13');
});

test('resolution reports stale routes and actual metrics', () => {
  const eligible = normaliseEligibleRoutes(routesPayload, config);
  const plans = [{
    id: 'p1',
    name: 'Mixed',
    weekdays: [],
    routes: [
      {route: '/literature/a.html'},
      {route: '/removed.html'}
    ],
    currentIndex: 0,
    checkIns: []
  }];
  const resolved = resolvePlans(plans, eligible);
  assert.equal(resolved.plans[0].routes.length, 1);
  assert.equal(resolved.ignoredRoutes, 1);

  const metrics = buildPlannerMetrics(
    plans, eligible, config,
    new Date('2026-07-14T12:00:00')
  );
  assert.equal(metrics.plans, 1);
  assert.equal(metrics.routes, 1);
  assert.equal(metrics.dueToday, 1);
  assert.equal(metrics.ignoredRoutes, 1);
});

test('Tamil and English filtering remains local', () => {
  const eligible = normaliseEligibleRoutes(routesPayload, config);
  assert.equal(
    filterEligibleRoutes(eligible, 'கோவில்')[0].path,
    '/temples/a.html'
  );
  const resolved = resolvePlans([{
    id: 'p1',
    name: 'காலை',
    description: 'Morning',
    weekdays: [],
    routes: [{route: '/literature/a.html'}],
    currentIndex: 0,
    checkIns: []
  }], eligible).plans;
  assert.equal(filterPlans(resolved, 'காலை').length, 1);
});

test('storage capacity, update and deletion are bounded', () => {
  const storage = new MemoryStorage();
  const plans = [];
  for (let index = 0; index < 15; index += 1) {
    plans.push({
      id: `p${index}`,
      name: `Plan ${index}`,
      routes: [],
      checkIns: [],
      weekdays: [],
      createdAt: `2026-07-14T10:${String(index).padStart(2, '0')}:00Z`,
      updatedAt: `2026-07-14T10:${String(index).padStart(2, '0')}:00Z`
    });
  }
  assert.equal(savePlans(plans, storage, config), true);
  let loaded = loadPlans(storage, config);
  assert.equal(loaded.length, 12);

  const id = loaded[0].id;
  loaded = updatePlan(
    loaded, id,
    {name: 'Updated', weekdays: [2]},
    config,
    '2026-07-14T12:00:00Z'
  );
  assert.equal(
    loaded.find(plan => plan.id === id).weekdays[0],
    2
  );
  loaded = deletePlan(loaded, id);
  assert.equal(loaded.length, 11);
});

test('module has no notification, tracking or source capture', () => {
  const source = fs.readFileSync(
    new URL(
      '../assets/js/devotional-practice-planner.mjs',
      import.meta.url
    ),
    'utf8'
  );
  for (const marker of [
    'Notification.requestPermission',
    'showNotification',
    'navigator.sendBeacon',
    'gtag(',
    'document.body.innerText',
    'document.body.textContent',
    'selectedText:',
    'pageBody:',
    'streak'
  ]) {
    assert.equal(source.includes(marker), false, marker);
  }
});
