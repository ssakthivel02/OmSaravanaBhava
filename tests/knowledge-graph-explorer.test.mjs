import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  RELEASE,
  filterGraph,
  graphMetrics,
  layoutGraph,
  nodeNeighbours,
  normaliseGraph,
  normaliseRoute,
  relationshipCounts
} from '../assets/js/knowledge-graph-explorer.mjs';

const payload = JSON.parse(
  fs.readFileSync(
    new URL('../data/knowledge-graph-explorer.json', import.meta.url),
    'utf8'
  )
);
const graph = normaliseGraph(payload);

test('release and source-controlled data identity are stable', () => {
  assert.equal(RELEASE, 220);
  assert.equal(graph.release, 220);
  assert.equal(graph.datasets.length, 5);
});

test('same-origin routes are retained and external routes are rejected', () => {
  assert.equal(normaliseRoute('/knowledge-graph.html'), '/knowledge-graph.html');
  assert.equal(normaliseRoute('https://example.com/graph.html'), '');
});

test('all explorer nodes and relationships are unique and valid', () => {
  assert.equal(new Set(graph.nodes.map(node => node.id)).size, graph.nodes.length);
  assert.equal(
    new Set(graph.relationships.map(edge => edge.id)).size,
    graph.relationships.length
  );
  const ids = new Set(graph.nodes.map(node => node.id));
  graph.relationships.forEach(edge => {
    assert.equal(ids.has(edge.source), true);
    assert.equal(ids.has(edge.target), true);
  });
});

test('metrics separate reported domain relationships from metadata edges', () => {
  const metrics = graphMetrics(graph);
  assert.deepEqual(metrics, {
    datasetCount: 5,
    explicitEntityCount: 18,
    explorerNodeCount: 23,
    explorerRelationshipCount: 20,
    reportedRelationshipTotal: 27,
    unspecifiedRelationshipDatasets: 2
  });
});

test('explicit source-card counts match the three detailed registers', () => {
  const expected = new Map([
    ['murugan-phase-1', 7],
    ['siddhar-phase-1', 6],
    ['skanda-purana-phase-2', 5]
  ]);
  expected.forEach((count, datasetId) => {
    const actual = graph.nodes.filter(
      node =>
        node.nodeClass === 'Explicit entity' &&
        node.datasetId === datasetId
    ).length;
    assert.equal(actual, count);
  });
});

test('summary-only phases do not fabricate explicit nodes', () => {
  for (const datasetId of ['murugan-phase-3', 'murugan-phase-4']) {
    assert.equal(
      graph.nodes.filter(
        node =>
          node.nodeClass === 'Explicit entity' &&
          node.datasetId === datasetId
      ).length,
      0
    );
  }
});

test('filtering supports dataset, kind, boundary and text search', () => {
  assert.equal(
    filterGraph(graph, {datasetId: 'siddhar-phase-1'}).nodes.length,
    7
  );
  assert.equal(filterGraph(graph, {kind: 'Siddhar'}).nodes.length, 6);
  assert.equal(
    filterGraph(graph, {boundary: 'pending-chapter-verification'}).nodes.length,
    6
  );
  assert.equal(filterGraph(graph, {query: 'கந்த சஷ்டி'}).nodes.length, 1);
});

test('neighbours and relationship counts are computed from local JSON', () => {
  const neighbours = nodeNeighbours('entity-murugan', graph);
  assert.equal(neighbours.length, 1);
  assert.equal(neighbours[0].relationship.type, 'declared-in');
  assert.deepEqual(relationshipCounts(graph.relationships), [
    {type: 'declared-in', count: 18},
    {type: 'progresses-to', count: 2}
  ]);
});

test('layout is deterministic and keeps all nodes inside the canvas', () => {
  const positions = layoutGraph(graph.nodes, 1000, 620);
  assert.equal(positions.size, graph.nodes.length);
  positions.forEach(point => {
    assert.equal(point.x >= 50 && point.x <= 950, true);
    assert.equal(point.y >= 50 && point.y <= 570, true);
  });
});
