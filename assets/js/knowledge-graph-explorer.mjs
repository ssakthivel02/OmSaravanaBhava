export const RELEASE = 220;
export const DATA_PATH = '/data/knowledge-graph-explorer.json';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

export const normaliseRoute = value => {
  const route = String(value ?? '').trim();
  if (!route) return '';
  try {
    const url = new URL(route, `${CANONICAL_ORIGIN}/`);
    if (url.origin !== CANONICAL_ORIGIN) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

export const normaliseGraph = payload => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const datasets = Array.isArray(source.datasets) ? source.datasets : [];
  const rawNodes = Array.isArray(source.nodes) ? source.nodes : [];
  const rawRelationships = Array.isArray(source.relationships)
    ? source.relationships
    : [];

  const datasetMap = new Map();
  datasets.forEach(dataset => {
    const id = String(dataset?.id ?? '').trim();
    const route = normaliseRoute(dataset?.route);
    if (!id || !route || datasetMap.has(id)) return;
    datasetMap.set(id, {
      id,
      titleTa: String(dataset.titleTa ?? '').trim(),
      titleEn: String(dataset.titleEn ?? id).trim() || id,
      route,
      publicationBoundary: String(
        dataset.publicationBoundary ?? 'unspecified'
      ).trim(),
      detailLevel: String(dataset.detailLevel ?? 'unspecified').trim(),
      reportedNodeCount: Number.isInteger(dataset.reportedNodeCount)
        ? dataset.reportedNodeCount
        : null,
      reportedRelationshipCount: Number.isInteger(
        dataset.reportedRelationshipCount
      ) ? dataset.reportedRelationshipCount : null,
      relationshipCountStatus: String(
        dataset.relationshipCountStatus ?? 'not-published'
      ).trim(),
      evidence: String(dataset.evidence ?? '').trim()
    });
  });

  const nodeMap = new Map();
  rawNodes.forEach(node => {
    const id = String(node?.id ?? '').trim();
    const route = normaliseRoute(node?.route);
    const destinationRoute = normaliseRoute(
      node?.destinationRoute || node?.route
    );
    if (!id || !route || !destinationRoute || nodeMap.has(id)) return;
    const datasetId = String(node.datasetId ?? '').trim();
    if (datasetId && !datasetMap.has(datasetId)) return;
    nodeMap.set(id, {
      id,
      nodeClass: String(node.nodeClass ?? 'Explicit entity').trim(),
      kind: String(node.kind ?? 'Unspecified').trim(),
      datasetId,
      titleTa: String(node.titleTa ?? '').trim(),
      titleEn: String(node.titleEn ?? id).trim() || id,
      route,
      destinationRoute,
      claimBoundary: String(
        node.claimBoundary ?? 'unspecified'
      ).trim()
    });
  });

  const relationships = [];
  const relationshipIds = new Set();
  rawRelationships.forEach(edge => {
    const id = String(edge?.id ?? '').trim();
    const sourceId = String(edge?.source ?? '').trim();
    const targetId = String(edge?.target ?? '').trim();
    if (
      !id ||
      relationshipIds.has(id) ||
      !nodeMap.has(sourceId) ||
      !nodeMap.has(targetId)
    ) return;
    relationshipIds.add(id);
    relationships.push({
      id,
      source: sourceId,
      target: targetId,
      type: String(edge.type ?? 'related-to').trim(),
      evidenceStatus: String(
        edge.evidenceStatus ?? 'unspecified'
      ).trim(),
      description: String(edge.description ?? '').trim()
    });
  });

  return {
    release: Number(source.release) || 0,
    generated: String(source.generated ?? '').trim(),
    title: String(source.title ?? '').trim(),
    scope: String(source.scope ?? '').trim(),
    notClaims: Array.isArray(source.notClaims)
      ? source.notClaims.map(value => String(value).trim()).filter(Boolean)
      : [],
    datasets: [...datasetMap.values()],
    nodes: [...nodeMap.values()],
    relationships
  };
};

export const graphMetrics = graph => {
  const datasets = graph?.datasets || [];
  const nodes = graph?.nodes || [];
  const relationships = graph?.relationships || [];
  const reportedRelationshipTotal = datasets.reduce(
    (total, dataset) =>
      total + (Number.isInteger(dataset.reportedRelationshipCount)
        ? dataset.reportedRelationshipCount
        : 0),
    0
  );
  const unspecifiedRelationshipDatasets = datasets.filter(
    dataset => !Number.isInteger(dataset.reportedRelationshipCount)
  ).length;

  return {
    datasetCount: datasets.length,
    explicitEntityCount: nodes.filter(
      node => node.nodeClass === 'Explicit entity'
    ).length,
    explorerNodeCount: nodes.length,
    explorerRelationshipCount: relationships.length,
    reportedRelationshipTotal,
    unspecifiedRelationshipDatasets
  };
};

export const relationshipCounts = relationships => {
  const counts = new Map();
  (Array.isArray(relationships) ? relationships : []).forEach(edge => {
    counts.set(edge.type, (counts.get(edge.type) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([type, count]) => ({type, count}))
    .sort((left, right) =>
      right.count - left.count || left.type.localeCompare(right.type)
    );
};

export const filterGraph = (
  graph,
  {
    query = '',
    datasetId = 'All',
    kind = 'All',
    boundary = 'All'
  } = {}
) => {
  const needle = String(query).trim().toLocaleLowerCase();
  const visibleNodes = graph.nodes.filter(node => {
    if (datasetId !== 'All' && node.datasetId !== datasetId) return false;
    if (kind !== 'All' && node.kind !== kind) return false;
    if (boundary !== 'All' && node.claimBoundary !== boundary) return false;
    if (!needle) return true;
    const haystack = [
      node.titleTa,
      node.titleEn,
      node.kind,
      node.nodeClass,
      node.claimBoundary,
      node.datasetId
    ].join(' ').toLocaleLowerCase();
    return haystack.includes(needle);
  });
  const visibleIds = new Set(visibleNodes.map(node => node.id));
  const visibleRelationships = graph.relationships.filter(
    edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)
  );
  return {
    nodes: visibleNodes,
    relationships: visibleRelationships
  };
};

export const nodeNeighbours = (nodeId, graph) => {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  return graph.relationships
    .filter(edge => edge.source === nodeId || edge.target === nodeId)
    .map(edge => ({
      relationship: edge,
      node: nodes.get(edge.source === nodeId ? edge.target : edge.source)
    }))
    .filter(item => item.node);
};

export const layoutGraph = (
  nodes,
  width = 1000,
  height = 620
) => {
  const registers = nodes.filter(node => node.nodeClass === 'Graph register');
  const entities = nodes.filter(node => node.nodeClass !== 'Graph register');
  const positions = new Map();

  registers.forEach((node, index) => {
    const x = registers.length === 1
      ? width / 2
      : 120 + index * ((width - 240) / Math.max(1, registers.length - 1));
    positions.set(node.id, {x, y: height / 2});
  });

  const groups = new Map();
  entities.forEach(node => {
    if (!groups.has(node.datasetId)) groups.set(node.datasetId, []);
    groups.get(node.datasetId).push(node);
  });

  groups.forEach((group, datasetId) => {
    const register = positions.get(`dataset-${datasetId}`) || {
      x: width / 2,
      y: height / 2
    };
    const radius = Math.min(170, 80 + group.length * 8);
    group.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, group.length) -
        Math.PI / 2;
      positions.set(node.id, {
        x: Math.max(50, Math.min(width - 50, register.x + Math.cos(angle) * radius)),
        y: Math.max(50, Math.min(height - 50, register.y + Math.sin(angle) * radius))
      });
    });
  });

  return positions;
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
};

const displayTitle = node =>
  node.titleTa && node.titleEn
    ? `${node.titleTa} · ${node.titleEn}`
    : node.titleTa || node.titleEn || node.id;

const populateSelect = (select, values, label = 'All') => {
  select.replaceChildren();
  const all = document.createElement('option');
  all.value = 'All';
  all.textContent = label;
  select.appendChild(all);
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value.value ?? value;
    option.textContent = value.label ?? value;
    select.appendChild(option);
  });
};

const renderMetric = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
};

const renderRelationshipSummary = relationships => {
  const host = document.getElementById('graphRelationshipTypes');
  if (!host) return;
  host.replaceChildren();
  const counts = relationshipCounts(relationships);
  if (!counts.length) {
    createText(host, 'p', 'No explorer metadata relationships match the filters.');
    return;
  }
  counts.forEach(item => {
    const row = document.createElement('div');
    row.className = 'graph-relationship-row';
    createText(row, 'span', item.type);
    createText(row, 'strong', String(item.count));
    host.appendChild(row);
  });
};

const renderDetails = (node, graph) => {
  const host = document.getElementById('graphNodeDetails');
  if (!host) return;
  host.replaceChildren();

  if (!node) {
    createText(host, 'h2', 'Select a node');
    createText(
      host,
      'p',
      'Choose a visual node or an accessible result card to inspect its local source and graph-register membership.'
    );
    return;
  }

  createText(host, 'span', node.kind, 'pill');
  createText(host, 'h2', displayTitle(node));
  createText(host, 'p', `Class: ${node.nodeClass}`);
  createText(host, 'p', `Publication boundary: ${node.claimBoundary}`);

  const links = document.createElement('div');
  links.className = 'graph-detail-actions';

  const destination = document.createElement('a');
  destination.className = 'btn';
  destination.href = node.destinationRoute;
  destination.textContent = 'Open destination';
  links.appendChild(destination);

  const source = document.createElement('a');
  source.className = 'btn secondary';
  source.href = node.route;
  source.textContent = 'Open source graph register';
  links.appendChild(source);
  host.appendChild(links);

  const neighbours = nodeNeighbours(node.id, graph);
  createText(host, 'h3', `Explorer connections (${neighbours.length})`);
  if (!neighbours.length) {
    createText(host, 'p', 'No visible explorer metadata edge is attached.');
    return;
  }
  const list = document.createElement('ul');
  neighbours.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.relationship.type}: ${displayTitle(item.node)}`;
    list.appendChild(li);
  });
  host.appendChild(list);
};

const renderAccessibleCards = (filtered, graph, onSelect) => {
  const host = document.getElementById('graphNodeList');
  if (!host) return;
  host.replaceChildren();

  if (!filtered.nodes.length) {
    const empty = document.createElement('article');
    empty.className = 'card graph-empty';
    createText(empty, 'h2', 'No nodes match');
    createText(empty, 'p', 'Change the dataset, kind, boundary or search query.');
    host.appendChild(empty);
    return;
  }

  filtered.nodes.forEach(node => {
    const article = document.createElement('article');
    article.className = 'card graph-node-card';
    article.tabIndex = 0;
    article.dataset.nodeId = node.id;
    createText(article, 'span', node.kind, 'pill');
    createText(article, 'h2', displayTitle(node));
    createText(article, 'p', node.nodeClass);
    createText(article, 'p', node.claimBoundary, 'graph-node-boundary');
    const count = nodeNeighbours(node.id, graph).length;
    createText(article, 'p', `${count} explorer metadata connection${count === 1 ? '' : 's'}`);
    article.addEventListener('click', () => onSelect(node));
    article.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(node);
      }
    });
    host.appendChild(article);
  });
};

const renderSvg = (filtered, graph, onSelect) => {
  const svg = document.getElementById('knowledgeGraphSvg');
  if (!svg) return;
  svg.replaceChildren();
  const width = 1000;
  const height = 620;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const positions = layoutGraph(filtered.nodes, width, height);
  const visibleIds = new Set(filtered.nodes.map(node => node.id));

  filtered.relationships.forEach(edge => {
    const start = positions.get(edge.source);
    const end = positions.get(edge.target);
    if (!start || !end) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', end.x);
    line.setAttribute('y2', end.y);
    line.setAttribute('class', `graph-edge graph-edge-${edge.type}`);
    line.setAttribute('aria-hidden', 'true');
    svg.appendChild(line);
  });

  filtered.nodes.forEach(node => {
    const point = positions.get(node.id);
    if (!point) return;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `graph-svg-node graph-kind-${node.kind.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', displayTitle(node));
    group.dataset.nodeId = node.id;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', node.nodeClass === 'Graph register' ? '25' : '17');
    group.appendChild(circle);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', point.x);
    label.setAttribute('y', point.y + (node.nodeClass === 'Graph register' ? 42 : 34));
    label.setAttribute('text-anchor', 'middle');
    label.textContent = node.titleTa || node.titleEn;
    group.appendChild(label);

    const select = () => onSelect(node);
    group.addEventListener('click', select);
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
    svg.appendChild(group);
  });

  const status = document.getElementById('graphVisualStatus');
  if (status) {
    status.textContent =
      `${visibleIds.size} nodes and ${filtered.relationships.length} explorer metadata relationships shown.`;
  }
};

const renderDatasetRegister = graph => {
  const host = document.getElementById('graphDatasetRegister');
  if (!host) return;
  host.replaceChildren();
  graph.datasets.forEach(dataset => {
    const article = document.createElement('article');
    article.className = 'card graph-dataset-card';
    createText(article, 'span', dataset.publicationBoundary, 'pill');
    createText(
      article,
      'h2',
      dataset.titleTa
        ? `${dataset.titleTa} · ${dataset.titleEn}`
        : dataset.titleEn
    );
    createText(article, 'p', `Detail level: ${dataset.detailLevel}`);
    createText(
      article,
      'p',
      `Reported nodes: ${dataset.reportedNodeCount ?? 'not published'}`
    );
    createText(
      article,
      'p',
      `Reported domain relationships: ${dataset.reportedRelationshipCount ?? 'not published'}`
    );
    createText(article, 'p', dataset.evidence, 'graph-evidence');
    const link = document.createElement('a');
    link.className = 'btn secondary';
    link.href = dataset.route;
    link.textContent = 'Open source page';
    article.appendChild(link);
    host.appendChild(article);
  });
};

const initialise = async () => {
  const status = document.getElementById('graphStatus');
  const search = document.getElementById('graphSearch');
  const dataset = document.getElementById('graphDataset');
  const kind = document.getElementById('graphKind');
  const boundary = document.getElementById('graphBoundary');
  const reset = document.getElementById('graphReset');
  if (!status || !search || !dataset || !kind || !boundary || !reset) return;

  try {
    const response = await fetch(DATA_PATH, {
      cache: 'default',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const graph = normaliseGraph(await response.json());

    const metrics = graphMetrics(graph);
    renderMetric('graphDatasetCount', metrics.datasetCount);
    renderMetric('graphExplicitNodeCount', metrics.explicitEntityCount);
    renderMetric('graphReportedRelationshipCount', metrics.reportedRelationshipTotal);
    renderMetric('graphUnspecifiedCount', metrics.unspecifiedRelationshipDatasets);
    renderDatasetRegister(graph);

    populateSelect(
      dataset,
      graph.datasets.map(item => ({value: item.id, label: item.titleEn})),
      'All graph registers'
    );
    populateSelect(
      kind,
      [...new Set(graph.nodes.map(node => node.kind))].sort(),
      'All node kinds'
    );
    populateSelect(
      boundary,
      [...new Set(graph.nodes.map(node => node.claimBoundary))].sort(),
      'All publication boundaries'
    );

    let selectedNodeId = '';

    const render = () => {
      const filtered = filterGraph(graph, {
        query: search.value,
        datasetId: dataset.value,
        kind: kind.value,
        boundary: boundary.value
      });
      status.textContent =
        `${filtered.nodes.length} explorer node${filtered.nodes.length === 1 ? '' : 's'} and ` +
        `${filtered.relationships.length} metadata relationship${filtered.relationships.length === 1 ? '' : 's'} match.`;
      renderRelationshipSummary(filtered.relationships);

      const selectNode = node => {
        selectedNodeId = node.id;
        renderDetails(node, graph);
        document.querySelectorAll('[data-node-id]').forEach(element => {
          element.classList.toggle(
            'is-selected',
            element.dataset.nodeId === selectedNodeId
          );
        });
      };

      renderAccessibleCards(filtered, graph, selectNode);
      renderSvg(filtered, graph, selectNode);

      const selected = graph.nodes.find(node => node.id === selectedNodeId);
      if (selected && filtered.nodes.some(node => node.id === selected.id)) {
        renderDetails(selected, graph);
      } else {
        selectedNodeId = '';
        renderDetails(null, graph);
      }
    };

    [search, dataset, kind, boundary].forEach(control => {
      control.addEventListener(
        control === search ? 'input' : 'change',
        render
      );
    });

    reset.addEventListener('click', () => {
      search.value = '';
      dataset.value = 'All';
      kind.value = 'All';
      boundary.value = 'All';
      render();
      search.focus();
    });

    render();
  } catch (error) {
    console.error('[OmSaravanaBhava] Knowledge graph failed', error);
    status.textContent =
      'The source-controlled knowledge graph register could not be loaded.';
    const visualStatus = document.getElementById('graphVisualStatus');
    if (visualStatus) visualStatus.textContent = 'Graph unavailable.';
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialise);
}
