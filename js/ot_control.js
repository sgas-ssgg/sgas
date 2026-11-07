/* ================================================================
   SGAS — ot_control.js
   Control de Órdenes de Trabajo — Parada de Planta
   ================================================================ */

// Mapeo código → nombre de categoría exacto en la app
const OT_DISCIPLINAS = [
  { codigo: 'AND',  label: 'AND',  categoria: 'ANDAMIOS'           },
  { codigo: 'ATER', label: 'ATER', categoria: 'AISLAMIENTO TERMICO' },
  { codigo: 'CIV',  label: 'CIV',  categoria: 'CIVIL/CARPINTERIA'   },
  { codigo: 'IZA',  label: 'IZA',  categoria: 'IZAJE'               },
  { codigo: 'PIN',  label: 'PIN',  categoria: 'PINTURA'             },
  { codigo: 'LIND', label: 'LIND', categoria: 'LAVADO INDUSTRIAL'   },
  { codigo: 'MEC',  label: 'MEC',  categoria: 'MECANICA'            },
  { codigo: 'INST', label: 'INST', categoria: 'INSTRUMENTACION'     },
  { codigo: 'ELEC', label: 'ELEC', categoria: 'ELECTRICIDAD'        },
  { codigo: 'REP',  label: 'REP',  categoria: 'REPARACIONES'        },
];

let _otFiltro = 'todas'; // 'todas' | 'con-ats' | 'sin-ats'
let _otBusqueda = '';
let _otCache = []; // cache de OTs cargadas
let _atsFichasCache = []; // cache de fichas de parada

/* ================================================================
   RENDER VISTA PRINCIPAL
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

  // Cargar OTs y fichas de parada en paralelo
  try {
    [_otCache, _atsFichasCache] = await Promise.all([
      Storage.OtControl.getAll(),
      Storage.ATS.getReporteParada(),
    ]);
  } catch(e) {
    container.innerHTML = '<div style="color:#f87171;padding:20px">Error al cargar datos.</div>';
    return;
  }

  renderTablaControlOt();
}

function renderTablaControlOt() {
  const container = document.getElementById('control-ot-content');
  if (!container) return;

  // Construir set de OTs por disciplina desde los ATS
  // { "1000013506": Set["ANDAMIOS", "MECANICA", ...] }
  const otEnAts = {};
  _atsFichasCache.forEach(ficha => {
    const cat = (ficha.categoria || '').toUpperCase().trim();
    (ficha.ot_tags || []).forEach(item => {
      const ot = (item.ot || '').trim();
      if (!ot) return;
      if (!otEnAts[ot]) otEnAts[ot] = new Set();
      otEnAts[ot].add(cat);
    });
  });

  // Filtrar OTs según filtro activo
  let otsFiltradas = _otCache.filter(ot => {
    const orden = (ot.orden || '').toLowerCase();
    const desc  = (ot.descripcion || '').toLowerCase();
    const busq  = _otBusqueda.toLowerCase();
    if (busq && !orden.includes(busq) && !desc.includes(busq)) return false;
    if (_otFiltro === 'con-ats')  return !!otEnAts[ot.orden.trim()];
    if (_otFiltro === 'sin-ats')  return !otEnAts[ot.orden.trim()];
    return true;
  });

  const totalOts     = _otCache.length;
  const totalConAts  = _otCache.filter(ot => !!otEnAts[ot.orden.trim()]).length;
  const totalSinAts  = totalOts - totalConAts;

  // Cabeceras de disciplinas
  const thDisc = OT_DISCIPLINAS.map(d =>
    `<th style="background:var(--header);padding:8px 6px;text-align:center;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:42px">${d.codigo}</th>`
  ).join('');

  // Filas
  const filas = otsFiltradas.map((ot, idx) => {
    const orden = (ot.orden || '').trim();
    const cats  = otEnAts[orden] || new Set();
    const celdas = OT_DISCIPLINAS.map(d => {
      const tiene = cats.has(d.categoria.toUpperCase());
      return `<td style="text-align:center;padding:6px;border:1px solid var(--border);background:${tiene ? 'rgba(16,185,129,.15)' : 'var(--card)'}">
        <span style="font-size:14px">${tiene ? '✅' : '❌'}</span>
      </td>`;
    }).join('');

    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 10px;border:1px solid var(--border);font-size:11px;color:var(--text-dim);text-align:center">${idx + 1}</td>
      <td style="padding:8px 10px;border:1px solid var(--border);font-weight:600;font-size:12px">${escapeHtml(orden)}</td>
      ${celdas}
      <td style="padding:8px 10px;border:1px solid var(--border);font-size:11px;color:var(--text-dim);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(ot.descripcion||'')}">${escapeHtml(ot.descripcion||'')}</td>
      <td style="padding:8px 10px;border:1px solid var(--border);font-size:11px;color:var(--text-dim)">${escapeHtml(ot.tag||'')}</td>
      <td style="padding:8px 10px;border:1px solid var(--border);text-align:center">
        <button onclick="eliminarOt(${ot.id})"
          style="background:none;border:none;color:#f87171;cursor:pointer;font-size:14px">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <!-- Filtros y stats -->
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <button onclick="cambiarFiltroOt('todas')" class="btn btn-sm ${_otFiltro==='todas'?'btn-primary':'btn-ghost'}">
        Todas (${totalOts})
      </button>
      <button onclick="cambiarFiltroOt('con-ats')" class="btn btn-sm ${_otFiltro==='con-ats'?'btn-primary':'btn-ghost'}" style="color:${_otFiltro==='con-ats'?'':'#10b981'}">
        ✅ Con ATS (${totalConAts})
      </button>
      <button onclick="cambiarFiltroOt('sin-ats')" class="btn btn-sm ${_otFiltro==='sin-ats'?'btn-primary':'btn-ghost'}" style="color:${_otFiltro==='sin-ats'?'':'#f87171'}">
        ❌ Sin ATS (${totalSinAts})
      </button>
    </div>

    <!-- Tabla -->
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr>
            <th style="background:var(--header);padding:8px 6px;text-align:center;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);width:32px">#</th>
            <th style="background:var(--header);padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border);min-width:110px">ORDEN</th>
            ${thDisc}
            <th style="background:var(--header);padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border)">DESCRIPCIÓN</th>
            <th style="background:var(--header);padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--text);border:1px solid var(--border)">TAG</th>
            <th style="background:var(--header);padding:8px 6px;border:1px solid var(--border);width:32px"></th>
          </tr>
        </thead>
        <tbody>${filas || `<tr><td colspan="${OT_DISCIPLINAS.length + 5}" style="text-align:center;padding:32px;color:var(--text-dim)">No hay OTs registradas</td></tr>`}</tbody>
      </table>
    </div>`;
}

function cambiarFiltroOt(filtro) {
  _otFiltro = filtro;
  renderTablaControlOt();
}

function filtrarControlOt(q) {
  _otBusqueda = q;
  renderTablaControlOt();
}

/* ================================================================
   AGREGAR OT MANUAL
   ================================================================ */
function nuevaOtManual() {
  openModal(
    'Nueva OT',
    'Número de Orden (10 dígitos)',
    'Ej: 1000013506',
    async (orden) => {
      if (!/^\d{10}$/.test(orden.trim())) {
        toast('La OT debe tener exactamente 10 dígitos numéricos', 'error');
        return;
      }
      try {
        await Storage.OtControl.save({ orden: orden.trim(), descripcion: '', tag: '', area: '', proceso: '' });
        toast('✓ OT agregada');
        await renderControlOt();
      } catch(e) {
        const { texto } = Storage.mensajeError(e);
        toast(`Error: ${texto}`, 'error');
      }
    }
  );
}

/* ================================================================
   CARGAR EXCEL DE OTs
   ================================================================ */
async function cargarExcelOt(input) {
  const file = input.files[0];
  if (!file) return;
  if (!window.XLSX && !window.ExcelJS) {
    toast('Necesitás SheetJS para leer Excel. Usá ExcelJS.', 'error');
    return;
  }

  toast('⏳ Leyendo Excel...');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // Usar SheetJS si está disponible, sino leer manualmente
      let ots = [];

      if (window.XLSX) {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Saltar fila de encabezado (fila 0)
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const orden = String(row[9] || '').trim(); // columna J = índice 9
          if (!orden || !/^\d+$/.test(orden)) continue;
          ots.push({
            orden,
            descripcion: String(row[12] || '').trim(), // columna M
            tag:         String(row[14] || '').trim(), // columna O
            area:        String(row[26] || '').trim(), // columna AA
            proceso:     String(row[27] || '').trim(), // columna AB
          });
        }
      }

      if (ots.length === 0) {
        toast('No se encontraron OTs válidas en el Excel', 'error');
        input.value = '';
        return;
      }

      const resp = await Storage.OtControl.saveBulk(ots);
      toast(`✓ ${resp.insertadas || ots.length} OTs cargadas`);
      input.value = '';
      await renderControlOt();
    } catch(err) {
      console.error(err);
      toast('Error al procesar el Excel', 'error');
      input.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ================================================================
   ELIMINAR OT
   ================================================================ */
async function eliminarOt(id) {
  if (!confirm('¿Eliminar esta OT del control?')) return;
  try {
    await Storage.OtControl.remove(id);
    toast('OT eliminada');
    await renderControlOt();
  } catch(e) {
    toast('Error al eliminar', 'error');
  }
}

/* ================================================================
   DESCARGAR EXCEL DE CONTROL OT
   ================================================================ */
async function descargarExcelControlOt() {
  if (!window.ExcelJS) { toast('Librería Excel no disponible', 'error'); return; }
  toast('⏳ Generando Excel...');

  // Reusar los caches si ya están cargados
  if (_otCache.length === 0) {
    try {
      [_otCache, _atsFichasCache] = await Promise.all([
        Storage.OtControl.getAll(),
        Storage.ATS.getReporteParada(),
      ]);
    } catch(e) { toast('Error al cargar datos', 'error'); return; }
  }

  // Construir set de OTs por disciplina
  const otEnAts = {};
  _atsFichasCache.forEach(ficha => {
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
  wb.creator = 'SGAS';
  const ws   = wb.addWorksheet('CONTROL OT');

  const AZUL  = { argb: 'FF2D4A6E' };
  const VERDE = { argb: 'FF10B981' };
  const ROJO  = { argb: 'FFEF4444' };
  const BLANC = { argb: 'FFFFFFFF' };
  const NEGRO = { argb: 'FF1A1A1A' };
  const GRIS  = { argb: 'FFEEF2F7' };
  const borde = { style: 'thin', color: { argb: 'FFB4B4B4' } };
  const bords = { top: borde, left: borde, bottom: borde, right: borde };

  const sCab  = { font: { bold: true, color: { argb: BLANC.argb }, name: 'Calibri', size: 9 }, fill: { type: 'pattern', pattern: 'solid', fgColor: AZUL }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: bords };
  const sDato = { font: { name: 'Calibri', size: 9, color: { argb: NEGRO.argb } }, fill: { type: 'pattern', pattern: 'solid', fgColor: GRIS }, alignment: { vertical: 'middle', horizontal: 'center' }, border: bords };
  const sSi   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }, font: { ...sDato.font, color: { argb: VERDE.argb }, bold: true } };
  const sNo   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }, font: { ...sDato.font, color: { argb: ROJO.argb } } };
  const sDesc = { ...sDato, alignment: { vertical: 'middle', horizontal: 'left', wrapText: true } };

  // Anchos de columnas
  ws.columns = [
    { width: 6 },  // Item
    { width: 14 }, // Orden
    ...OT_DISCIPLINAS.map(() => ({ width: 7 })), // disciplinas
    { width: 40 }, // Descripción
    { width: 14 }, // Tag
  ];

  // Título
  ws.mergeCells(`A1:${String.fromCharCode(65 + 1 + OT_DISCIPLINAS.length + 1)}1`);
  const titleRow = ws.getRow(1);
  titleRow.height = 24;
  titleRow.getCell(1).value = 'CONTROL DE ÓRDENES DE TRABAJO — PARADA DE PLANTA SS.GG';
  titleRow.getCell(1).style = { ...sCab, font: { ...sCab.font, size: 11 } };

  // Cabeceras
  const cabVals = ['Item', 'Orden', ...OT_DISCIPLINAS.map(d => d.codigo), 'Descripción', 'TAG'];
  const cabRow  = ws.addRow(cabVals);
  cabRow.height = 28;
  cabRow.eachCell(cell => { cell.style = sCab; });

  // Datos
  _otCache.forEach((ot, idx) => {
    const orden = (ot.orden || '').trim();
    const cats  = otEnAts[orden] || new Set();
    const vals  = [
      idx + 1,
      orden,
      ...OT_DISCIPLINAS.map(d => cats.has(d.categoria.toUpperCase()) ? '✅' : '❌'),
      ot.descripcion || '',
      ot.tag || '',
    ];
    const row = ws.addRow(vals);
    row.height = 20;
    row.getCell(1).style = sDato;
    row.getCell(2).style = { ...sDato, font: { ...sDato.font, bold: true } };
    OT_DISCIPLINAS.forEach((d, i) => {
      const tiene = cats.has(d.categoria.toUpperCase());
      row.getCell(3 + i).style = tiene ? sSi : sNo;
    });
    row.getCell(3 + OT_DISCIPLINAS.length).style = sDesc;
    row.getCell(4 + OT_DISCIPLINAS.length).style = sDato;
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
  toast('✓ Excel de Control OT descargado');
}

/* ================================================================
   AGREGAR HOJA CONTROL OT AL REPORTE GENERAL
   Se llama desde descargarExcelReporteParada en ats.js
   ================================================================ */
async function agregarHojaControlOtAlReporte(wb) {
  // Cargar datos si no están en cache
  if (_otCache.length === 0) {
    try {
      [_otCache, _atsFichasCache] = await Promise.all([
        Storage.OtControl.getAll(),
        Storage.ATS.getReporteParada(),
      ]);
    } catch(e) { return; }
  }

  const otEnAts = {};
  _atsFichasCache.forEach(ficha => {
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
  const GRIS  = { argb: 'FFEEF2F7' };
  const VERDE = { argb: 'FFD1FAE5' };
  const ROJO  = { argb: 'FFFEE2E2' };
  const borde = { style: 'thin', color: { argb: 'FFB4B4B4' } };
  const bords = { top: borde, left: borde, bottom: borde, right: borde };
  const sCab  = { font: { bold: true, color: { argb: BLANC.argb }, name: 'Calibri', size: 9 }, fill: { type: 'pattern', pattern: 'solid', fgColor: AZUL }, alignment: { horizontal: 'center', vertical: 'middle' }, border: bords };
  const sDato = { font: { name: 'Calibri', size: 9, color: { argb: NEGRO.argb } }, fill: { type: 'pattern', pattern: 'solid', fgColor: GRIS }, alignment: { vertical: 'middle', horizontal: 'center' }, border: bords };
  const sSi   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: VERDE }, font: { ...sDato.font, color: { argb: 'FF10B981' }, bold: true } };
  const sNo   = { ...sDato, fill: { type: 'pattern', pattern: 'solid', fgColor: ROJO  }, font: { ...sDato.font, color: { argb: 'FFEF4444' } } };

  ws.columns = [{ width: 6 }, { width: 14 }, ...OT_DISCIPLINAS.map(() => ({ width: 7 })), { width: 40 }, { width: 14 }];

  const cabVals = ['Item', 'Orden', ...OT_DISCIPLINAS.map(d => d.codigo), 'Descripción', 'TAG'];
  const cabRow  = ws.addRow(cabVals);
  cabRow.height = 24;
  cabRow.eachCell(cell => { cell.style = sCab; });

  _otCache.forEach((ot, idx) => {
    const orden = (ot.orden || '').trim();
    const cats  = otEnAts[orden] || new Set();
    const row   = ws.addRow([idx + 1, orden, ...OT_DISCIPLINAS.map(d => cats.has(d.categoria.toUpperCase()) ? '✅' : '❌'), ot.descripcion || '', ot.tag || '']);
    row.height  = 18;
    row.getCell(1).style = sDato;
    row.getCell(2).style = { ...sDato, font: { ...sDato.font, bold: true } };
    OT_DISCIPLINAS.forEach((d, i) => {
      row.getCell(3 + i).style = cats.has(d.categoria.toUpperCase()) ? sSi : sNo;
    });
    row.getCell(3 + OT_DISCIPLINAS.length).style = { ...sDato, alignment: { vertical: 'middle', horizontal: 'left', wrapText: true } };
    row.getCell(4 + OT_DISCIPLINAS.length).style = sDato;
  });
}

/* ── Registrar vista y funciones globales ── */
Views.controlOt = () => renderControlOt();

window.renderControlOt          = renderControlOt;
window.cambiarFiltroOt          = cambiarFiltroOt;
window.filtrarControlOt         = filtrarControlOt;
window.nuevaOtManual            = nuevaOtManual;
window.cargarExcelOt            = cargarExcelOt;
window.eliminarOt               = eliminarOt;
window.descargarExcelControlOt  = descargarExcelControlOt;
window.agregarHojaControlOtAlReporte = agregarHojaControlOtAlReporte;
