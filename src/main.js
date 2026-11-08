import './style.css';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const workerUrl = new URL(
  `${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`,
  window.location.origin
).href;
maplibregl.setWorkerUrl(workerUrl);

document.querySelector('#app').innerHTML = `
  <div id="map"></div>
  <aside id="legend" aria-label="Building source legend and filters">
    <h1>Overture Building Sources</h1>
    <div class="legend-item">
      <span class="swatch microsoft" aria-hidden="true"></span>
      <label>
        <input type="checkbox" id="filter-microsoft" checked />
        Microsoft ML Buildings
      </label>
    </div>
    <div class="legend-item">
      <span class="swatch google" aria-hidden="true"></span>
      <label>
        <input type="checkbox" id="filter-google" checked />
        Google Open Buildings
      </label>
    </div>
    <div class="legend-item">
      <span class="swatch other" aria-hidden="true"></span>
      <label>
        <input type="checkbox" id="filter-other" checked />
        Esri / Meta / OpenStreetMap / Other
      </label>
    </div>
    <div class="legend-item">
      <span class="swatch unknown" aria-hidden="true"></span>
      <label>
        <input type="checkbox" id="filter-unknown" checked />
        Unknown
      </label>
    </div>
  </aside>
`;

const sourceGroups = {
  microsoft: ['microsoft ml buildings', 'microsoft/ml-buildings', 'microsoft'],
  google: ['google open buildings', 'google/open-buildings', 'google'],
  other: ['esri community maps', 'esri', 'meta', 'openstreetmap', 'osm', 'other'],
  unknown: [],
};

const layerIds = {
  fill: 'overture-buildings-fill',
  outline: 'overture-buildings-outline',
};

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://stars.optgeo.org/style/positron',
  center: [102.6162, 17.9623],
  zoom: 16,
  pitch: 0,
  hash: 'map',
});

map.addControl(new maplibregl.NavigationControl(), 'top-left');

const geometrySourceExpr = ['downcase', ['coalesce', ['get', '@geometry_source'], '']];
const unknownFilter = ['all'];
for (const values of Object.values(sourceGroups)) {
  if (values.length > 0) {
    unknownFilter.push(['!', ['in', geometrySourceExpr, ['literal', values]]]);
  }
}

map.on('load', () => {
  map.addSource('overture-buildings', {
    type: 'vector',
    url: 'https://stars.optgeo.org/overture_buildings',
  });

  map.addLayer({
    id: layerIds.fill,
    type: 'fill',
    source: 'overture-buildings',
    'source-layer': 'building',
    paint: {
      'fill-color': [
        'match',
        geometrySourceExpr,
        sourceGroups.microsoft,
        'rgba(16, 185, 129, 0.7)',
        sourceGroups.google,
        'rgba(239, 68, 68, 0.7)',
        sourceGroups.other,
        'rgba(59, 130, 246, 0.7)',
        'rgba(156, 163, 175, 0.5)',
      ],
    },
  });

  map.addLayer({
    id: layerIds.outline,
    type: 'line',
    source: 'overture-buildings',
    'source-layer': 'building',
    paint: {
      'line-color': '#ffffff',
      'line-width': 0.5,
    },
  });

  applyFilter();

  map.on('click', layerIds.fill, (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    const props = feature.properties ?? {};
    const rawSources = formatSources(props.sources);

    new maplibregl.Popup()
      .setLngLat(event.lngLat)
      .setHTML(`
        <strong>@geometry_source</strong>: ${escapeHtml(String(props['@geometry_source'] ?? 'Unknown'))}<br/>
        <strong>id</strong>: ${escapeHtml(String(props.id ?? 'N/A'))}<br/>
        <strong>sources</strong>:<pre>${escapeHtml(rawSources)}</pre>
      `)
      .addTo(map);
  });

  map.on('mouseenter', layerIds.fill, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', layerIds.fill, () => {
    map.getCanvas().style.cursor = '';
  });
});

function applyFilter() {
  const enabledGroups = [];

  if (document.querySelector('#filter-microsoft')?.checked) {
    enabledGroups.push(['in', geometrySourceExpr, ['literal', sourceGroups.microsoft]]);
  }

  if (document.querySelector('#filter-google')?.checked) {
    enabledGroups.push(['in', geometrySourceExpr, ['literal', sourceGroups.google]]);
  }

  if (document.querySelector('#filter-other')?.checked) {
    enabledGroups.push(['in', geometrySourceExpr, ['literal', sourceGroups.other]]);
  }

  if (document.querySelector('#filter-unknown')?.checked) {
    enabledGroups.push(unknownFilter);
  }

  const filter = enabledGroups.length ? ['any', ...enabledGroups] : ['==', 1, 0];
  for (const layerId of Object.values(layerIds)) {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, filter);
    }
  }
}

for (const input of document.querySelectorAll('#legend input[type="checkbox"]')) {
  input.addEventListener('change', applyFilter);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatSources(value) {
  if (!value) {
    return 'N/A';
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return String(value);
  }
}
