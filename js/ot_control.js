/* ================================================================
   SGAS — ot_control.js
   Control de Órdenes de Trabajo — Parada de Planta
   Formato de tabla igual al Excel original:
   Item | AND | AT | IZA | PIN | LAV | MEC | INST | ELE | Orden | Texto breve | Tag2 | ✓ | 🗑️
   ================================================================ */

// Disciplinas en el orden exacto del Excel
const OT_DISCIPLINAS = [
  { codigo: 'AND',  label: 'AND',  categoria: 'ANDAMIOS'            },
  { codigo: 'AT',   label: 'AT',   categoria: 'AISLAMIENTO TERMICO'  },
  { codigo: 'IZA',  label: 'IZA',  categoria: 'IZAJE'                },
  { codigo: 'PIN',  label: 'PIN',  categoria: 'PINTURA'              },
  { codigo: 'LAV',  label: 'LAV',  categoria: 'LAVADO INDUSTRIAL'    },
  { codigo: 'MEC',  label: 'MEC',  categoria: 'MECANICA'             },
  { codigo: 'INST', label: 'INST', categoria: 'INSTRUMENTACION'      },
  { codigo: 'ELE',  label: 'ELE',  categoria: 'ELECTRICIDAD'         },
  { codigo: 'CIV',  label: 'CIV',  categoria: 'CIVIL/CARPINTERIA'    },
  { codigo: 'REP',  label: 'REP',  categoria: 'REPARACIONES'         },
];

let _otFiltro   = 'todas';
let _otBusqueda = '';
let _otCache    = [];
let _atsCache   = [];

/* ================================================================
   RENDER VISTA
   ================================================================ */
async function renderControlOt() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Control de OT' },
  ]);
  showView('control_ot');

  const container = document.getElementById('control-ot-content');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-dim)">Cargando...</div>';

  try {
    [_otCache, _atsCache] = await Promise.all([
      Storage.OtControl.getAll(),
      Storage.ATS.getReporteParada(),
    ]);
  } catch(e) {
    container.innerHTML = '<div style="color:#f87171;padding:20px">Error al cargar datos.</div>';
    return;
  }

  // Si no hay OTs cargadas, intentar pre-cargar desde el Excel del servidor
  if (_otCache.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-dim)">
        <div style="font-size:32px;margin-bottom:12px">📋</div>
        <div style="font-size:14px;margin-bottom:16px">No hay OTs cargadas todavía</div>
        <button class="btn btn-primary" onclick="preCargarOtsDesdeServidor()">
          🔄 Cargar OTs desde el Excel del servidor
        </button>
        <div style="margin-top:12px;font-size:12px;color:var(--text-dim)">
          O usá el botón 📁 Cargar Excel para subir tu lista
        </div>
      </div>`;
    return;
  }

  renderTablaControlOt();
}

function renderTablaControlOt() {
  const container = document.getElementById('control-ot-content');
  if (!container) return;

  // Construir mapa OT → disciplinas con ATS
  const otEnAts = {};
  _atsCache.forEach(ficha => {
    const cat = (ficha.categoria || '').toUpperCase().trim();
    (ficha.ot_tags || []).forEach(item => {
      const ot = (item.ot || '').trim();
      if (!ot) return;
      if (!otEnAts[ot]) otEnAts[ot] = new Set();
      otEnAts[ot].add(cat);
    });
  });

  // Filtrar
  let otsFiltradas = _otCache.filter(ot => {
    const orden = (ot.orden || '').toLowerCase();
    const desc  = (ot.descripcion || '').toLowerCase();
    const busq  = _otBusqueda.toLowerCase();
    if (busq && !orden.includes(busq) && !desc.includes(busq)) return false;
    if (_otFiltro === 'con-ats')   return !!otEnAts[ot.orden.trim()];
    if (_otFiltro === 'sin-ats')   return !otEnAts[ot.orden.trim()];
    if (_otFiltro === 'completas') return !!ot.completada;
    return true;
  });

  const totalOts      = _otCache.length;
  const totalConAts   = _otCache.filter(ot => !!otEnAts[ot.orden.trim()]).length;
  const totalSinAts   = totalOts - totalConAts;
  const totalCompletas = _otCache.filter(ot => ot.completada).length;

  // Cabeceras de disciplinas
  const thDisc = OT_DISCIPLINAS.map(d =>
    `<th style="background:var(--header);padding:7px 4px;text-align:center;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:38px">${d.codigo}</th>`
  ).join('');

  // Filas
  const filas = otsFiltradas.map((ot, idx) => {
    const orden     = (ot.orden || '').trim();
    const cats      = otEnAts[orden] || new Set();
    const completa  = !!ot.completada;
    const rowBg     = completa ? 'background:rgba(107,114,128,.25)' : '';
    const textColor = completa ? 'color:#9ca3af' : 'color:var(--text)';

    const celdas = OT_DISCIPLINAS.map(d => {
      const tiene = cats.has(d.categoria.toUpperCase());
      const bg    = completa
        ? 'background:rgba(107,114,128,.15)'
        : tiene ? 'background:rgba(16,185,129,.12)' : 'background:var(--card)';
      return `<td style="text-align:center;padding:5px 4px;border:1px solid var(--border);${bg}">
        <span style="font-size:13px;${completa?'opacity:.5':''}">${tiene ? '✅' : '❌'}</span>
      </td>`;
    }).join('');

    return `<tr style="border-bottom:1px solid var(--border);${rowBg};transition:background .2s">
      <td style="padding:7px 8px;border:1px solid var(--border);font-size:11px;${textColor};text-align:center;min-width:32px">${idx + 1}</td>
      ${celdas}
      <td style="padding:7px 10px;border:1px solid var(--border);font-weight:600;font-size:12px;${textColor};min-width:110px">${escapeHtml(orden)}</td>
      <td style="padding:7px 10px;border:1px solid var(--border);font-size:11px;${textColor};max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(ot.descripcion||'')}">${escapeHtml(ot.descripcion||'')}</td>
      <td style="padding:7px 10px;border:1px solid var(--border);font-size:11px;${textColor};min-width:80px">${escapeHtml(ot.tag||'')}</td>
      <td style="padding:7px 8px;border:1px solid var(--border);text-align:center;min-width:40px">
        <button onclick="toggleCompletadaOt(${ot.id},this)"
          title="${completa ? 'Marcar incompleta' : 'Marcar como completada'}"
          style="background:${completa?'rgba(16,185,129,.2)':'none'};border:1px solid ${completa?'#10b981':'var(--border)'};border-radius:4px;cursor:pointer;font-size:13px;padding:2px 6px;color:${completa?'#10b981':'var(--text-dim)'}">
          ${completa ? '✅' : '☐'}
        </button>
      </td>
      <td style="padding:7px 8px;border:1px solid var(--border);text-align:center;min-width:36px">
        <button onclick="eliminarOt(${ot.id})"
          style="background:none;border:none;color:#f87171;cursor:pointer;font-size:13px;opacity:.6" title="Eliminar">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <!-- Filtros -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <button onclick="cambiarFiltroOt('todas')"    class="btn btn-sm ${_otFiltro==='todas'   ?'btn-primary':'btn-ghost'}">Todas (${totalOts})</button>
      <button onclick="cambiarFiltroOt('con-ats')"  class="btn btn-sm ${_otFiltro==='con-ats' ?'btn-primary':'btn-ghost'}" style="${_otFiltro!=='con-ats'?'color:#10b981':''}">✅ Con ATS (${totalConAts})</button>
      <button onclick="cambiarFiltroOt('sin-ats')"  class="btn btn-sm ${_otFiltro==='sin-ats' ?'btn-primary':'btn-ghost'}" style="${_otFiltro!=='sin-ats'?'color:#f87171':''}">❌ Sin ATS (${totalSinAts})</button>
      <button onclick="cambiarFiltroOt('completas')" class="btn btn-sm ${_otFiltro==='completas'?'btn-primary':'btn-ghost'}" style="${_otFiltro!=='completas'?'color:#9ca3af':''}">☑ Completas (${totalCompletas})</button>
    </div>

    <!-- Tabla con scroll horizontal -->
    <div style="overflow-x:auto;border-radius:8px;border:1px solid var(--border)">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr>
            <th style="background:var(--header);padding:8px 6px;text-align:center;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:32px">#</th>
            ${thDisc}
            <th style="background:var(--header);padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:110px">ORDEN</th>
            <th style="background:var(--header);padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:200px">TEXTO BREVE</th>
            <th style="background:var(--header);padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:80px">TAG</th>
            <th style="background:var(--header);padding:8px 6px;text-align:center;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:40px">✓</th>
            <th style="background:var(--header);padding:8px 6px;border:1px solid var(--border);min-width:36px"></th>
          </tr>
        </thead>
        <tbody>
          ${filas || `<tr><td colspan="${OT_DISCIPLINAS.length + 6}" style="text-align:center;padding:32px;color:var(--text-dim)">No hay OTs que mostrar</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

/* ── Filtros ── */
function cambiarFiltroOt(filtro) { _otFiltro = filtro; renderTablaControlOt(); }
function filtrarControlOt(q)     { _otBusqueda = q;    renderTablaControlOt(); }

/* ================================================================
   TOGGLE COMPLETADA
   ================================================================ */
async function toggleCompletadaOt(id, btn) {
  try {
    const result = await Storage.OtControl.toggleCompletada(id);
    const completa = result?.completada ?? false;
    // Actualizar cache local
    const ot = _otCache.find(o => o.id === id);
    if (ot) ot.completada = completa;
    // Re-renderizar solo la tabla sin recargar todo
    renderTablaControlOt();
  } catch(e) { toast('Error al actualizar', 'error'); }
}

/* ================================================================
   AGREGAR OT MANUAL
   ================================================================ */
function nuevaOtManual() {
  openModal('Nueva OT', 'Número de Orden', 'Ej: 1000013506',
    async (orden) => {
      const o = orden.trim();
      if (!/^\d+$/.test(o) || o.length < 7) {
        toast('Ingresá un número de OT válido', 'error'); return;
      }
      try {
        await Storage.OtControl.save({ orden: o, descripcion: '', tag: '', area: '', proceso: '' });
        toast('✓ OT agregada');
        [_otCache] = await Promise.all([Storage.OtControl.getAll()]);
        renderTablaControlOt();
      } catch(e) { toast('Error al agregar OT', 'error'); }
    }
  );
}

/* ================================================================
   CARGAR EXCEL DE OTs
   ================================================================ */
async function cargarExcelOt(input) {
  const file = input.files[0];
  if (!file) return;
  toast('⏳ Leyendo Excel...');
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      if (!window.XLSX) { toast('Librería XLSX no disponible', 'error'); return; }
      const wb   = XLSX.read(e.target.result, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const ots  = [];
      for (let i = 1; i < data.length; i++) {
        const row   = data[i];
        const orden = String(row[9] || '').trim();
        if (!orden || !/^\d+$/.test(orden)) continue;
        ots.push({
          orden,
          descripcion: String(row[11] || '').trim(),
          tag:         String(row[13] || '').trim(),
          area:        String(row[15] || '').trim(),
          proceso:     String(row[16] || '').trim(),
        });
      }
      if (ots.length === 0) { toast('No se encontraron OTs válidas', 'error'); input.value = ''; return; }
      const resp = await Storage.OtControl.saveBulk(ots);
      toast(`✓ ${resp.insertadas || ots.length} OTs cargadas`);
      input.value = '';
      _otCache = await Storage.OtControl.getAll();
      renderTablaControlOt();
    } catch(err) { console.error(err); toast('Error al procesar el Excel', 'error'); input.value = ''; }
  };
  reader.readAsArrayBuffer(file);
}

/* ================================================================
   PRE-CARGAR OTs DESDE EL SERVIDOR (archivo worklist en el repo)
   ================================================================ */
async function preCargarOtsDesdeServidor() {
  toast('⏳ Cargando OTs desde el servidor...');
  try {
    const resp = await fetch('worklist 2027. v.xlsx');
    if (!resp.ok) throw new Error('Archivo no encontrado');
    const buffer = await resp.arrayBuffer();
    if (!window.XLSX) { toast('Librería XLSX no disponible', 'error'); return; }
    const wb   = XLSX.read(buffer, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const ots  = [];
    for (let i = 1; i < data.length; i++) {
      const row   = data[i];
      const orden = String(row[9] || '').trim();
      if (!orden || !/^\d+$/.test(orden)) continue;
      ots.push({
        orden,
        descripcion: String(row[11] || '').trim(),
        tag:         String(row[13] || '').trim(),
        area:        String(row[15] || '').trim(),
        proceso:     String(row[16] || '').trim(),
      });
    }
    if (ots.length === 0) { toast('No se encontraron OTs', 'error'); return; }
    const result = await Storage.OtControl.saveBulk(ots);
    toast(`✓ ${result.insertadas || ots.length} OTs cargadas`);
    _otCache = await Storage.OtControl.getAll();
    renderTablaControlOt();
  } catch(e) {
    console.error(e);
    toast('No se pudo cargar el archivo. Usá el botón 📁 Cargar Excel.', 'error');
  }
}

/* ================================================================
   ELIMINAR OT
   ================================================================ */
async function eliminarOt(id) {
  if (!confirm('¿Eliminar esta OT?')) return;
  try {
    await Storage.OtControl.remove(id);
    _otCache = _otCache.filter(o => o.id !== id);
    renderTablaControlOt();
    toast('OT eliminada');
  } catch(e) { toast('Error al eliminar', 'error'); }
}

/* ================================================================
   DESCARGAR EXCEL — mismo formato que el original
   ================================================================ */
async function descargarExcelControlOt() {
  if (!window.ExcelJS) { toast('Librería Excel no disponible', 'error'); return; }
  toast('⏳ Generando Excel...');

  if (_otCache.length === 0) {
    try { _otCache = await Storage.OtControl.getAll(); } catch(e) { toast('Error', 'error'); return; }
  }
  if (_atsCache.length === 0) {
    try { _atsCache = await Storage.ATS.getReporteParada(); } catch(e) {}
  }

  const otEnAts = {};
  _atsCache.forEach(ficha => {
    const cat = (ficha.categoria || '').toUpperCase().trim();
    (ficha.ot_tags || []).forEach(item => {
      const ot = (item.ot || '').trim();
      if (!ot) return;
      if (!otEnAts[ot]) otEnAts[ot] = new Set();
      otEnAts[ot].add(cat);
    });
  });

  const EJS  = window.ExcelJS;
  const wb   = new EJS.Workbook();
  const ws   = wb.addWorksheet('Control OT');

  const AZUL  = { argb: 'FF2D4A6E' };
  const GRIS  = { argb: 'FF6B7280' };
  const BLANC = { argb: 'FFFFFFFF' };
  const NEGRO = { argb: 'FF1A1A1A' };
  const VERD  = { argb: 'FFD1FAE5' };
  const ROJO  = { argb: 'FFFEE2E2' };
  const GRISF = { argb: 'FFEEF2F7' };
  const GRISCOMP = { argb: 'FFD1D5DB' };
  const borde = { style: 'thin', color: { argb: 'FFB4B4B4' } };
  const bords = { top: borde, left: borde, bottom: borde, right: borde };

  const sCab  = { font: { bold: true, color: { argb: BLANC.argb }, name: 'Calibri', size: 9 }, fill: { type: 'pattern', pattern: 'solid', fgColor: AZUL  }, alignment: { horizontal: 'center', vertical: 'middle' }, border: bords };
  const sDato = { font: { name: 'Calibri', size: 9, color: { argb: NEGRO.argb } }, fill: { type: 'pattern', pattern: 'solid', fgColor: GRISF }, alignment: { vertical: 'middle', horizontal: 'center' }, border: bords };
  const sSi   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: VERD }, font: { ...sDato.font, color: { argb: 'FF10B981' }, bold: true } };
  const sNo   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: ROJO }, font: { ...sDato.font, color: { argb: 'FFEF4444' } } };
  const sComp = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: GRISCOMP }, font: { ...sDato.font, color: { argb: GRIS.argb } } };

  // Anchos: Item + 10 disciplinas + Orden + Descripción + Tag + Completada
  ws.columns = [
    { width: 6 },
    ...OT_DISCIPLINAS.map(() => ({ width: 7 })),
    { width: 14 }, { width: 40 }, { width: 14 }, { width: 12 },
  ];

  // Cabecera
  const cabVals = ['Item', ...OT_DISCIPLINAS.map(d => d.codigo), 'Orden', 'Texto breve', 'TAG', 'Estado'];
  const cabRow  = ws.addRow(cabVals);
  cabRow.height = 24;
  cabRow.eachCell(c => { c.style = sCab; });

  // Datos
  _otCache.forEach((ot, idx) => {
    const orden    = (ot.orden || '').trim();
    const cats     = otEnAts[orden] || new Set();
    const completa = !!ot.completada;
    const sBase    = completa ? sComp : sDato;

    const vals = [
      idx + 1,
      ...OT_DISCIPLINAS.map(d => cats.has(d.categoria.toUpperCase()) ? '✅' : '❌'),
      orden,
      ot.descripcion || '',
      ot.tag || '',
      completa ? 'COMPLETADA' : 'PENDIENTE',
    ];
    const row = ws.addRow(vals);
    row.height = 18;
    row.getCell(1).style = sBase;
    OT_DISCIPLINAS.forEach((d, i) => {
      const tiene = cats.has(d.categoria.toUpperCase());
      row.getCell(2 + i).style = completa ? sComp : (tiene ? sSi : sNo);
    });
    const off = 2 + OT_DISCIPLINAS.length;
    row.getCell(off).style     = { ...sBase, font: { ...sBase.font, bold: true } };
    row.getCell(off + 1).style = { ...sBase, alignment: { vertical: 'middle', horizontal: 'left', wrapText: true } };
    row.getCell(off + 2).style = sBase;
    row.getCell(off + 3).style = { ...sBase, font: { ...sBase.font, bold: true, color: { argb: completa ? GRIS.argb : 'FFEF4444' } } };
  });

  const fecha  = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = `Control_OT_Parada_SSGG_${fecha}.xlsx`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('✓ Excel descargado');
}

/* ================================================================
   HOJA CONTROL OT PARA EL REPORTE GENERAL
   ================================================================ */
async function agregarHojaControlOtAlReporte(wb) {
  if (_otCache.length === 0) {
    try { _otCache = await Storage.OtControl.getAll(); } catch(e) { return; }
  }
  if (_atsCache.length === 0) {
    try { _atsCache = await Storage.ATS.getReporteParada(); } catch(e) {}
  }

  const otEnAts = {};
  _atsCache.forEach(ficha => {
    const cat = (ficha.categoria || '').toUpperCase().trim();
    (ficha.ot_tags || []).forEach(item => {
      const ot = (item.ot || '').trim();
      if (!ot) return;
      if (!otEnAts[ot]) otEnAts[ot] = new Set();
      otEnAts[ot].add(cat);
    });
  });

  const ws    = wb.addWorksheet('CONTROL OT');
  const AZUL  = { argb: 'FF2D4A6E' };
  const BLANC = { argb: 'FFFFFFFF' };
  const NEGRO = { argb: 'FF1A1A1A' };
  const GRISF = { argb: 'FFEEF2F7' };
  const GRISCOMP = { argb: 'FFD1D5DB' };
  const VERD  = { argb: 'FFD1FAE5' };
  const ROJO  = { argb: 'FFFEE2E2' };
  const borde = { style: 'thin', color: { argb: 'FFB4B4B4' } };
  const bords = { top: borde, left: borde, bottom: borde, right: borde };
  const sCab  = { font: { bold: true, color: { argb: BLANC.argb }, name: 'Calibri', size: 9 }, fill: { type: 'pattern', pattern: 'solid', fgColor: AZUL }, alignment: { horizontal: 'center', vertical: 'middle' }, border: bords };
  const sDato = { font: { name: 'Calibri', size: 9, color: { argb: NEGRO.argb } }, fill: { type: 'pattern', pattern: 'solid', fgColor: GRISF }, alignment: { vertical: 'middle', horizontal: 'center' }, border: bords };
  const sComp = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: GRISCOMP }, font: { ...sDato.font, color: { argb: 'FF6B7280' } } };
  const sSi   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: VERD }, font: { ...sDato.font, color: { argb: 'FF10B981' }, bold: true } };
  const sNo   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: ROJO }, font: { ...sDato.font, color: { argb: 'FFEF4444' } } };

  ws.columns = [{ width: 6 }, ...OT_DISCIPLINAS.map(() => ({ width: 7 })), { width: 14 }, { width: 40 }, { width: 14 }];
  const cabRow = ws.addRow(['Item', ...OT_DISCIPLINAS.map(d => d.codigo), 'Orden', 'Texto breve', 'TAG']);
  cabRow.height = 24;
  cabRow.eachCell(c => { c.style = sCab; });

  _otCache.forEach((ot, idx) => {
    const orden    = (ot.orden || '').trim();
    const cats     = otEnAts[orden] || new Set();
    const completa = !!ot.completada;
    const sBase    = completa ? sComp : sDato;
    const row = ws.addRow([idx + 1, ...OT_DISCIPLINAS.map(d => cats.has(d.categoria.toUpperCase()) ? '✅' : '❌'), orden, ot.descripcion || '', ot.tag || '']);
    row.height = 18;
    row.getCell(1).style = sBase;
    OT_DISCIPLINAS.forEach((d, i) => { row.getCell(2 + i).style = completa ? sComp : (cats.has(d.categoria.toUpperCase()) ? sSi : sNo); });
    const off = 2 + OT_DISCIPLINAS.length;
    row.getCell(off).style     = { ...sBase, font: { ...sBase.font, bold: true } };
    row.getCell(off + 1).style = { ...sBase, alignment: { vertical: 'middle', horizontal: 'left', wrapText: true } };
    row.getCell(off + 2).style = sBase;
  });
}

/* ── Registrar ── */
Views.controlOt = () => renderControlOt();
window.renderControlOt               = renderControlOt;
window.cambiarFiltroOt               = cambiarFiltroOt;
window.filtrarControlOt              = filtrarControlOt;
window.nuevaOtManual                 = nuevaOtManual;
window.cargarExcelOt                 = cargarExcelOt;
window.preCargarOtsDesdeServidor     = preCargarOtsDesdeServidor;
window.eliminarOt                    = eliminarOt;
window.toggleCompletadaOt            = toggleCompletadaOt;
window.descargarExcelControlOt       = descargarExcelControlOt;
window.agregarHojaControlOtAlReporte = agregarHojaControlOtAlReporte;
