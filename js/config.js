/* ================================================================
   SGAS — config.js
   Configuración visual: temas, colores, fuentes, tamaño, fondo.
   ================================================================ */

/* ── 15 Temas oscuros + 3 Temas claros profesionales ── */
const TEMAS = [
  // ── TEMAS OSCUROS (originales) ──
  { id: 'azul-corp',     nombre: 'Azul Corporativo',    bg: '#0f172a', sidebar: '#1e293b', header: '#2563eb', accent: '#3b82f6', save: '#1d4ed8', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#94a3b8', card: '#1e293b', border: '#334155' },
  { id: 'verde-esm',     nombre: 'Verde Esmeralda',     bg: '#064e3b', sidebar: '#065f46', header: '#047857', accent: '#10b981', save: '#059669', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#6ee7b7', card: '#065f46', border: '#047857' },
  { id: 'purpura-neon',  nombre: 'Púrpura Neón',        bg: '#1e1b4b', sidebar: '#312e81', header: '#4338ca', accent: '#818cf8', save: '#6366f1', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#a5b4fc', card: '#312e81', border: '#4338ca' },
  { id: 'oscuro-carbon', nombre: 'Oscuro Carbón',       bg: '#09090b', sidebar: '#18181b', header: '#27272a', accent: '#a1a1aa', save: '#3f3f46', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#71717a', card: '#18181b', border: '#3f3f46' },
  { id: 'rosado-ejec',   nombre: 'Rosado Ejecutivo',    bg: '#1f1319', sidebar: '#311c26', header: '#5e2843', accent: '#ec4899', save: '#db2777', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#f9a8d4', card: '#311c26', border: '#5e2843' },
  { id: 'turquesa-ind',  nombre: 'Turquesa Industrial', bg: '#042f2e', sidebar: '#134e4a', header: '#0f766e', accent: '#2dd4bf', save: '#14b8a6', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#5eead4', card: '#134e4a', border: '#0f766e' },
  { id: 'naranja-atar',  nombre: 'Naranja Atardecer',   bg: '#2c160b', sidebar: '#43220f', header: '#9a3412', accent: '#f97316', save: '#ea580c', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#fdba74', card: '#43220f', border: '#9a3412' },
  { id: 'rojo-alerta',   nombre: 'Rojo Alerta',         bg: '#2b0b0b', sidebar: '#421212', header: '#991b1b', accent: '#ef4444', save: '#dc2626', del: '#7f1d1d', edit: '#92400e', text: '#e8eaf0', textDim: '#fca5a5', card: '#421212', border: '#991b1b' },
  { id: 'dorado-met',    nombre: 'Dorado Metálico',     bg: '#1c1917', sidebar: '#292524', header: '#78350f', accent: '#f59e0b', save: '#d97706', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#fcd34d', card: '#292524', border: '#78350f' },
  { id: 'violeta-prof',  nombre: 'Violeta Profundo',    bg: '#20063b', sidebar: '#320b5e', header: '#581c87', accent: '#a855f7', save: '#9333ea', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#d8b4fe', card: '#320b5e', border: '#581c87' },
  { id: 'verde-menta',   nombre: 'Verde Menta',         bg: '#022c22', sidebar: '#064e3b', header: '#065f46', accent: '#34d399', save: '#059669', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#6ee7b7', card: '#064e3b', border: '#065f46' },
  { id: 'azul-acero',    nombre: 'Azul Acero',          bg: '#0f172a', sidebar: '#1e293b', header: '#334155', accent: '#38bdf8', save: '#0284c7', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#7dd3fc', card: '#1e293b', border: '#334155' },
  { id: 'cafe-madera',   nombre: 'Café Madera',         bg: '#1c1512', sidebar: '#2c221e', header: '#4e382d', accent: '#d97706', save: '#b45309', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#d6b799', card: '#2c221e', border: '#4e382d' },
  { id: 'gris-minim',    nombre: 'Gris Minimalista',    bg: '#111827', sidebar: '#1f2937', header: '#374151', accent: '#9ca3af', save: '#6b7280', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#9ca3af', card: '#1f2937', border: '#374151' },
  { id: 'violeta-cyber', nombre: 'Violeta Cyberpunk',   bg: '#180529', sidebar: '#280a44', header: '#6b21a8', accent: '#f43f5e', save: '#e11d48', del: '#991b1b', edit: '#92400e', text: '#e8eaf0', textDim: '#f9a8d4', card: '#280a44', border: '#6b21a8' },

  // ── TEMAS CLAROS PROFESIONALES ──
  {
    id: 'corp-claro', nombre: 'Corporativo Claro', modoClaro: true,
    bg: '#f0f4f8', sidebar: '#1e3a5f', header: '#1e3a5f',
    accent: '#2563eb', save: '#1d4ed8', del: '#dc2626', edit: '#d97706',
    text: '#1a2332', textDim: '#4a5568', card: '#ffffff', border: '#d1dbe8',
  },
  {
    id: 'ejecutivo-gris', nombre: 'Ejecutivo Gris', modoClaro: true,
    bg: '#f8f9fa', sidebar: '#2d3748', header: '#2d3748',
    accent: '#4a6fa5', save: '#2b6cb0', del: '#c53030', edit: '#c05621',
    text: '#1a202c', textDim: '#4a5568', card: '#ffffff', border: '#e2e8f0',
  },
  {
    id: 'prof-celeste', nombre: 'Profesional Celeste', modoClaro: true,
    bg: '#eef4fb', sidebar: '#1a4a7a', header: '#1a4a7a',
    accent: '#0369a1', save: '#0284c7', del: '#dc2626', edit: '#d97706',
    text: '#0f2942', textDim: '#374e6b', card: '#ffffff', border: '#bfdbfe',
  },
];

const CONFIG_DEFAULTS = {
  colorBg:        '#1e2640',
  colorSidebar:   '#1a2035',
  colorHeader:    '#2d4a6e',
  colorAccent:    '#00b4d8',
  colorSave:      '#2d6a4f',
  colorDel:       '#9b2335',
  colorEdit:      '#b5560a',
  colorText:      '#e8eaf0',
  colorTextDim:   '#9aa3b8',
  colorCard:      '#243050',
  colorBorder:    '#2e3a55',
  colorTableCell: '#f0f2f5',
  font:           'Segoe UI',
  fontSize:       '14',
  dashBgOverlay:  '40',
};

const FONT_MAP = {
  'Segoe UI':         "'Segoe UI', sans-serif",
  'Inter':            "'Inter', sans-serif",
  'Roboto':           "'Roboto', sans-serif",
  'Open Sans':        "'Open Sans', sans-serif",
  'Lato':             "'Lato', sans-serif",
  'Source Sans':      "'Source Sans Pro', sans-serif",
  'Montserrat':       "'Montserrat', sans-serif",
  'Poppins':          "'Poppins', sans-serif",
  'Nunito':           "'Nunito', sans-serif",
  'Raleway':          "'Raleway', sans-serif",
  'Ubuntu':           "'Ubuntu', sans-serif",
  'Merriweather':     "'Merriweather', serif",
  'Playfair Display': "'Playfair Display', serif",
  'PT Sans':          "'PT Sans', sans-serif",
  'Fira Sans':        "'Fira Sans', sans-serif",
};

const GOOGLE_FONTS = {
  'Inter': 'Inter', 'Roboto': 'Roboto', 'Open Sans': 'Open+Sans',
  'Lato': 'Lato', 'Source Sans': 'Source+Sans+3', 'Montserrat': 'Montserrat',
  'Poppins': 'Poppins', 'Nunito': 'Nunito', 'Raleway': 'Raleway',
  'Ubuntu': 'Ubuntu', 'Merriweather': 'Merriweather',
  'Playfair Display': 'Playfair+Display', 'PT Sans': 'PT+Sans', 'Fira Sans': 'Fira+Sans',
};

const COLOR_FIELDS = [
  { key: 'colorBg',        label: 'Fondo general',    group: 'Base' },
  { key: 'colorSidebar',   label: 'Sidebar',           group: 'Base' },
  { key: 'colorHeader',    label: 'Header',            group: 'Base' },
  { key: 'colorCard',      label: 'Tarjetas',          group: 'Base' },
  { key: 'colorBorder',    label: 'Bordes',            group: 'Base' },
  { key: 'colorTableCell', label: 'Celdas de tabla',   group: 'Base' },
  { key: 'colorAccent',    label: 'Acento / Activo',   group: 'Acento' },
  { key: 'colorText',      label: 'Texto principal',   group: 'Texto' },
  { key: 'colorTextDim',   label: 'Texto secundario',  group: 'Texto' },
  { key: 'colorSave',      label: 'Botón Guardar',     group: 'Botones' },
  { key: 'colorDel',       label: 'Botón Eliminar',    group: 'Botones' },
  { key: 'colorEdit',      label: 'Botón Editar',      group: 'Botones' },
];

let currentConfig = { ...CONFIG_DEFAULTS };
let _dashBgBase64 = ''; // imagen de fondo en base64

/* ================================================================
   CARGAR y APLICAR CONFIG
   ================================================================ */
async function loadConfig() {
  try {
    const entries = await Storage.Config.getAll();
    entries.forEach(e => {
      if (e.key in currentConfig) currentConfig[e.key] = e.value;
      if (e.key === 'dashBg') _dashBgBase64 = e.value || '';
    });
  } catch(e) {}
  applyConfig(currentConfig);
  aplicarFondoDashboard();
}

function cargarFuenteGoogle(nombre) {
  const gFont = GOOGLE_FONTS[nombre];
  if (!gFont) return;
  const id = `gfont-${nombre.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${gFont}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

function applyConfig(cfg) {
  const root = document.documentElement;
  cargarFuenteGoogle(cfg.font);
  root.style.setProperty('--bg',       cfg.colorBg);
  root.style.setProperty('--sidebar',  cfg.colorSidebar);
  root.style.setProperty('--header',   cfg.colorHeader);
  root.style.setProperty('--accent',   cfg.colorAccent);
  root.style.setProperty('--btn-save', cfg.colorSave);
  root.style.setProperty('--btn-del',  cfg.colorDel);
  root.style.setProperty('--btn-edit', cfg.colorEdit);
  root.style.setProperty('--text',     cfg.colorText     || CONFIG_DEFAULTS.colorText);
  root.style.setProperty('--text-dim', cfg.colorTextDim  || CONFIG_DEFAULTS.colorTextDim);
  root.style.setProperty('--card',        cfg.colorCard      || CONFIG_DEFAULTS.colorCard);
  root.style.setProperty('--border',      cfg.colorBorder    || CONFIG_DEFAULTS.colorBorder);
  root.style.setProperty('--table-cell',  cfg.colorTableCell || CONFIG_DEFAULTS.colorTableCell);
  root.style.setProperty('--font',     FONT_MAP[cfg.font] || FONT_MAP['Segoe UI']);
  const legacyMap = { 'pequeño': '12', 'normal': '14', 'grande': '16' };
  const px = legacyMap[cfg.fontSize] || legacyMap[cfg.size] || cfg.fontSize || '14';
  root.style.setProperty('--font-size', px + 'px');
}

/* ── Aplicar imagen de fondo al dashboard ── */
function aplicarFondoDashboard() {
  const overlay = document.getElementById('dash-bg-overlay');
  if (!overlay) return;
  if (!_dashBgBase64) {
    overlay.style.display = 'none';
    return;
  }
  const opacidad = parseInt(currentConfig.dashBgOverlay || '40') / 100;
  overlay.style.display    = 'block';
  overlay.style.backgroundImage = `linear-gradient(rgba(0,0,0,${opacidad}),rgba(0,0,0,${opacidad})), url(${_dashBgBase64})`;
}

/* ================================================================
   RENDER PANEL
   ================================================================ */
async function renderConfig() {
  setBreadcrumb([{ label: 'Inicio', hash: 'inicio' }, { label: 'Configuración' }]);
  await loadConfig();
  buildTemas();
  buildColorPickers();
  buildFontSelector();
  buildSizeSlider();
  buildOverlaySlider();
  updatePreview();
  showView('config');
}

/* ── Temas predefinidos ── */
function buildTemas() {
  const container = document.getElementById('config-temas');
  if (!container) return;
  container.innerHTML = '';
  TEMAS.forEach(t => {
    const card = document.createElement('div');
    card.style.cssText = `cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid transparent;transition:border .2s`;
    card.title = t.nombre;
    // En temas claros el sidebar es oscuro → texto claro; en oscuros igual
    const labelColor = t.modoClaro ? '#ffffff' : t.accent;
    const cardBg     = t.card || t.sidebar;
    card.innerHTML = `
      <div style="display:flex;height:32px">
        <div style="flex:1;background:${t.bg}"></div>
        <div style="flex:1;background:${cardBg}"></div>
        <div style="flex:1;background:${t.header}"></div>
        <div style="flex:1;background:${t.accent}"></div>
      </div>
      <div style="background:${t.sidebar};padding:5px 8px;font-size:10px;font-weight:600;color:${labelColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${t.modoClaro ? '☀ ' : ''}${t.nombre}
      </div>`;
    card.addEventListener('click', () => aplicarTema(t, card));
    card.addEventListener('mouseenter', () => card.style.borderColor = t.accent);
    card.addEventListener('mouseleave', () => card.style.borderColor = 'transparent');
    container.appendChild(card);
  });
}

function aplicarTema(t, card) {
  currentConfig.colorBg      = t.bg;
  currentConfig.colorSidebar = t.sidebar;
  currentConfig.colorHeader  = t.header;
  currentConfig.colorAccent  = t.accent;
  currentConfig.colorSave    = t.save;
  currentConfig.colorDel     = t.del;
  currentConfig.colorEdit    = t.edit;
  currentConfig.colorCard    = t.card   || t.sidebar;
  currentConfig.colorBorder  = t.border || (t.header + '66');
  currentConfig.colorText    = t.text     || CONFIG_DEFAULTS.colorText;
  currentConfig.colorTextDim = t.textDim  || CONFIG_DEFAULTS.colorTextDim;
  // Celdas de tabla: claro para temas claros, oscuro para temas oscuros
  if (t.modoClaro) {
    currentConfig.colorTableCell = '#f0f4f8';
  }
  applyConfig(currentConfig);
  buildColorPickers(); // refrescar pickers con nuevos valores
  updatePreview();
  // Marcar tema activo
  document.querySelectorAll('#config-temas > div').forEach(c => c.style.outline = 'none');
  if (card) card.style.outline = `2px solid ${t.accent}`;
  toast(`✓ Tema "${t.nombre}" aplicado`);
}

/* ── Color pickers individuales ── */
function buildColorPickers() {
  const container = document.getElementById('config-colors');
  if (!container) return;
  container.innerHTML = '';
  const grupos = [...new Set(COLOR_FIELDS.map(f => f.group))];
  grupos.forEach(grupo => {
    const groupDiv = document.createElement('div');
    groupDiv.style.cssText = 'margin-bottom:14px';
    groupDiv.innerHTML = `<div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${grupo}</div>`;
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px';
    COLOR_FIELDS.filter(f => f.group === grupo).forEach(f => {
      const val = currentConfig[f.key] || CONFIG_DEFAULTS[f.key] || '#000000';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:7px 10px';
      row.innerHTML = `
        <div style="position:relative;width:28px;height:28px;border-radius:6px;overflow:hidden;border:2px solid rgba(255,255,255,.15);flex-shrink:0;background:${val}" id="swatch-${f.key}">
          <input type="color" value="${val}" data-key="${f.key}" oninput="onColorChange(this)"
            style="position:absolute;inset:-4px;width:140%;height:140%;opacity:0;cursor:pointer;border:none;padding:0" />
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:2px">${f.label}</div>
          <div style="font-size:11px;font-family:monospace;color:var(--text)" id="hex-${f.key}">${val}</div>
        </div>`;
      grid.appendChild(row);
    });
    groupDiv.appendChild(grid);
    container.appendChild(groupDiv);
  });
}

function onColorChange(input) {
  const key = input.dataset.key;
  const val = input.value;
  currentConfig[key] = val;
  const sw = document.getElementById(`swatch-${key}`);
  const hx = document.getElementById(`hex-${key}`);
  if (sw) sw.style.background = val;
  if (hx) hx.textContent = val;
  applyConfig(currentConfig);
  updatePreview();
}

/* ── Font selector ── */
function buildFontSelector() {
  const container = document.getElementById('config-fonts');
  if (!container) return;
  container.innerHTML = '';
  const select = document.createElement('select');
  select.style.cssText = `width:100%;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);font-size:14px;cursor:pointer`;
  Object.keys(FONT_MAP).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.text = name; opt.selected = currentConfig.font === name;
    select.appendChild(opt);
  });
  const preview = document.createElement('div');
  preview.style.cssText = 'margin-top:10px;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:6px;font-size:15px;color:var(--text)';
  preview.style.fontFamily = FONT_MAP[currentConfig.font];
  preview.textContent = 'Vista previa — ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';
  select.addEventListener('change', () => {
    const name = select.value;
    currentConfig.font = name;
    cargarFuenteGoogle(name);
    preview.style.fontFamily = FONT_MAP[name];
    applyConfig(currentConfig);
    updatePreview();
  });
  container.appendChild(select);
  container.appendChild(preview);
}

/* ── Slider tamaño ── */
function buildSizeSlider() {
  const container = document.getElementById('config-sizes');
  if (!container) return;
  const legacyMap = { 'pequeño': '12', 'normal': '14', 'grande': '16' };
  const val = parseInt(legacyMap[currentConfig.fontSize] || legacyMap[currentConfig.size] || currentConfig.fontSize || '14');
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:11px;color:var(--text-dim)">12px</span>
      <input type="range" id="size-slider" min="12" max="22" value="${val}"
        style="flex:1;accent-color:var(--accent);cursor:pointer" />
      <span style="font-size:11px;color:var(--text-dim)">22px</span>
    </div>
    <div style="text-align:center;font-size:13px;color:var(--accent);font-weight:700;margin-top:6px" id="size-label">${val}px</div>
    <div style="margin-top:8px;padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:6px">
      <span id="size-preview" style="font-size:${val}px;color:var(--text)">Texto de muestra — ${val}px</span>
    </div>`;
  document.getElementById('size-slider').addEventListener('input', (e) => {
    const px = e.target.value;
    document.getElementById('size-label').textContent = `${px}px`;
    const prev = document.getElementById('size-preview');
    if (prev) { prev.style.fontSize = `${px}px`; prev.textContent = `Texto de muestra — ${px}px`; }
    currentConfig.fontSize = px;
    applyConfig(currentConfig);
    updatePreview();
  });
}

/* ── Slider overlay dashboard ── */
function buildOverlaySlider() {
  const slider = document.getElementById('dash-overlay-slider');
  const label  = document.getElementById('overlay-label');
  if (!slider) return;
  const val = parseInt(currentConfig.dashBgOverlay || '40');
  slider.value = val;
  if (label) label.textContent = `${val}%`;
  // Mostrar preview si hay imagen
  if (_dashBgBase64) {
    const preview = document.getElementById('dash-bg-preview');
    const thumb   = document.getElementById('dash-bg-thumb');
    if (preview) preview.style.display = '';
    if (thumb)   thumb.src = _dashBgBase64;
  }
}

function actualizarOverlay(val) {
  const label = document.getElementById('overlay-label');
  if (label) label.textContent = `${val}%`;
  currentConfig.dashBgOverlay = val;
  aplicarFondoDashboard();
}

/* ── Cargar imagen de fondo ── */
function cargarImagenFondo(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast('La imagen supera el límite de 5MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    _dashBgBase64 = e.target.result;
    const preview = document.getElementById('dash-bg-preview');
    const thumb   = document.getElementById('dash-bg-thumb');
    if (preview) preview.style.display = '';
    if (thumb)   thumb.src = _dashBgBase64;
    aplicarFondoDashboard();
    toast('✓ Imagen de fondo cargada');
  };
  reader.readAsDataURL(file);
}

function quitarImagenFondo() {
  _dashBgBase64 = '';
  const preview = document.getElementById('dash-bg-preview');
  const input   = document.getElementById('dash-bg-input');
  if (preview) preview.style.display = 'none';
  if (input)   input.value = '';
  aplicarFondoDashboard();
  toast('Imagen de fondo eliminada');
}

/* ── Vista previa ── */
function updatePreview() {
  const cfg = currentConfig;
  const p = document.getElementById('config-preview');
  if (!p) return;
  const legacyMap = { 'pequeño': '12', 'normal': '14', 'grande': '16' };
  const px = legacyMap[cfg.fontSize] || legacyMap[cfg.size] || cfg.fontSize || '14';
  p.innerHTML = `
    <div class="preview-card">
      <div class="prev-header" style="background:${cfg.colorHeader};color:${cfg.colorAccent}">
        SGAS — Sistema de Gestión
      </div>
      <div class="prev-body">
        <div class="prev-sb" style="background:${cfg.colorSidebar}">
          <div class="prev-nav ap" style="background:${cfg.colorAccent}88"></div>
          <div class="prev-nav"></div><div class="prev-nav"></div>
        </div>
        <div class="prev-ct" style="background:${cfg.colorBg}">
          <div class="prev-line" style="background:${cfg.colorCard}"></div>
          <div class="prev-line" style="width:70%;background:${cfg.colorCard}"></div>
          <div class="prev-btn-mini" style="background:${cfg.colorAccent}">Guardar</div>
        </div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:12px;color:var(--text-dim);line-height:2">
      <div>Acento: <strong style="color:${cfg.colorAccent}">${cfg.colorAccent}</strong></div>
      <div>Fuente: <strong style="font-family:${FONT_MAP[cfg.font]};color:var(--text)">${cfg.font}</strong></div>
      <div>Tamaño: <strong style="color:var(--text)">${px}px</strong></div>
    </div>`;
}

/* ================================================================
   GUARDAR / RESTAURAR
   ================================================================ */
async function guardarConfig() {
  try {
    const entries = Object.entries(currentConfig).map(([key, value]) => ({ key, value }));
    // Guardar imagen de fondo si existe (puede ser grande — solo si cambió)
    if (_dashBgBase64) entries.push({ key: 'dashBg', value: _dashBgBase64 });
    await Storage.Config.setBulk(entries);
    toast('✓ Configuración guardada');
  } catch(e) { toast('Error al guardar configuración', 'error'); }
}

async function restaurarConfig() {
  if (!confirm('¿Restaurar todos los valores por defecto?')) return;
  currentConfig = { ...CONFIG_DEFAULTS };
  _dashBgBase64 = '';
  applyConfig(currentConfig);
  aplicarFondoDashboard();
  buildTemas();
  buildColorPickers();
  buildFontSelector();
  buildSizeSlider();
  buildOverlaySlider();
  updatePreview();
  const entries = Object.entries(currentConfig).map(([key, value]) => ({ key, value }));
  entries.push({ key: 'dashBg', value: '' });
  await Storage.Config.setBulk(entries);
  toast('✓ Valores restaurados');
}

/* ── Registrar ── */
Views.config = () => renderConfig();

window.renderConfig      = renderConfig;
window.guardarConfig     = guardarConfig;
window.restaurarConfig   = restaurarConfig;
window.onColorChange     = onColorChange;
window.loadConfig        = loadConfig;
window.cargarImagenFondo = cargarImagenFondo;
window.quitarImagenFondo = quitarImagenFondo;
window.actualizarOverlay = actualizarOverlay;
