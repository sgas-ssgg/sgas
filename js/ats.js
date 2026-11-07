/* ================================================================
   SGAS — ats.js
   Lógica de fichas ATS para todas las categorías incluyendo
   Talleres, Rescatista y Actividades Críticas.
   ================================================================ */

const AtsState = {
  categoria: '',
  tipo:      'ats',
  fichaActual: null,
  modo: 'edit',
};

/* ================================================================
   LISTA DE FICHAS
   ================================================================ */
async function renderAtsLista(categoria, tipo = 'ats') {
  AtsState.categoria = categoria;
  AtsState.tipo      = tipo;

  const prefijo = tipo === 'parada' ? 'parada' : 'ats';

  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: tipo === 'parada' ? 'Parada de Planta' : categoria, hash: tipo === 'parada' ? 'parada' : null },
    { label: categoria },
  ]);

  document.getElementById('ats-lista-titulo').textContent = categoria;

  // Botón Reporte solo visible en Parada de Planta
  const btnReporte = document.getElementById('btn-reporte-parada');
  if (btnReporte) btnReporte.style.display = tipo === 'parada' ? '' : 'none';

  // Botón nueva ficha
  document.getElementById('btn-nueva-ficha').onclick = () =>
    openModal('Nueva Ficha ATS', 'Nombre del ATS',
      'Ej: Trabajos en caliente — Caldera 3', crearNuevaFicha);

  // Cargar fichas filtradas por categoria Y tipo
  let fichas = [];
  try { fichas = await Storage.ATS.getByCategoria(categoria, AtsState.tipo); } catch(e) {}
  AtsState._fichasLista = fichas; // guardamos para ZIP

  const tbody = document.getElementById('ats-lista-tbody');
  tbody.innerHTML = '';

  if (!fichas || fichas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:32px">
      No hay fichas en esta categoría. Creá la primera con <strong>＋ Nueva Ficha</strong>.
    </td></tr>`;
  } else {
    // Ordenar por código alfanuméricamente (fichas sin código van al final)
    fichas.sort((a, b) => {
      const ca = (a.codigo || '').trim();
      const cb = (b.codigo || '').trim();
      if (!ca && !cb) return 0;
      if (!ca) return 1;
      if (!cb) return -1;
      return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
    });

    fichas.forEach(ficha => {
      const titulo = ficha.codigo
        ? `${escapeHtml(ficha.codigo)} — ${escapeHtml(ficha.nombre)}`
        : escapeHtml(ficha.nombre);

      // Determinar si es nuevo o actualizado
      const esNuevo = ficha.created_at && ficha.updated_at
        ? Math.abs(new Date(ficha.updated_at) - new Date(ficha.created_at)) < 60000
        : true;
      const badgeEstado = AtsState.tipo === 'parada'
        ? `<span style="font-size:11px;color:${esNuevo ? '#10b981' : '#f59e0b'};font-weight:600;margin-left:6px">
            ${esNuevo ? '🆕 Nuevo' : '🔄 Actualizado'}
          </span>`
        : '';

      // Fecha formateada
      const fecha = ficha.updated_at
        ? new Date(ficha.updated_at).toLocaleDateString('es-AR')
        : '';
      const fechaHtml = AtsState.tipo === 'parada' && fecha
        ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">📅 ${fecha}</div>`
        : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex;align-items:flex-start;gap:8px">
            <button onclick="event.stopPropagation();toggleFavorito(${ficha.id},this)"
              style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;flex-shrink:0;opacity:${ficha.favorito ? '1' : '0.3'}"
              title="${ficha.favorito ? 'Quitar favorito' : 'Marcar como favorito'}">⭐</button>
            <div>
              <a href="#ats/ficha/${ficha.id}"
                 onclick="event.preventDefault();abrirFichaSaved(${ficha.id})"
                 style="color:var(--text);text-decoration:none;cursor:pointer"
                 onmouseover="this.style.color='var(--accent)'"
                 onmouseout="this.style.color='var(--text)'"
              >${titulo}</a>${badgeEstado}
              ${fechaHtml}
            </div>
          </div>
        </td>
        <td><span class="badge ${ficha.estado === 'guardado' ? 'badge-saved' : 'badge-draft'}">
          ${ficha.estado === 'guardado' ? 'Guardado' : 'Borrador'}
        </span></td>
        <td class="td-actions">
          <button class="icon-btn ib-edit" onclick="abrirFichaEdit(${ficha.id})">✏️</button>
          <button class="icon-btn ib-pdf"  onclick="exportarPdfAts(${ficha.id})">📄</button>
          <button class="icon-btn ib-xls"  onclick="exportarExcelAts(${ficha.id})" title="Descargar Excel">📊</button>
          <button class="icon-btn ib-del"  onclick="eliminarFicha(${ficha.id})">🗑️</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  showView('ats_lista');
}

/* ── Generar iniciales a partir del nombre de categoría ── */
function generarIniciales(categoria) {
  if (!categoria) return 'GEN';
  const palabras = categoria.trim().split(/\s+/).filter(p => p.length > 0);
  if (palabras.length === 1) {
    return palabras[0].substring(0, 3).toUpperCase();
  }
  // 2+ palabras: 1ra letra de la 1ra + 3 primeras de la 2da
  return (palabras[0][0] + palabras[1].substring(0, 3)).toUpperCase();
}

/* ================================================================
   FICHA — CREAR / ABRIR
   ================================================================ */
async function crearNuevaFicha(nombre) {
  const iniciales = generarIniciales(AtsState.categoria);
  const codigoAuto = `000-${iniciales}-APTIM-SS.GG`;

  AtsState.fichaActual = {
    nombre,
    categoria:   AtsState.categoria,
    tipo:        AtsState.tipo || 'ats',
    estado:      'borrador',
    filas:       [
      { paso: '', peligro: '', control: '' },
      { paso: '', peligro: '', control: '' },
      { paso: '', peligro: '', control: '' },
    ],
    observaciones: '',
    emergencia:  {},
    codigo:      codigoAuto,
    ot_tags:     [],
  };
  AtsState.modo = 'edit';
  renderFicha();
}

async function abrirFichaSaved(id) {
  try {
    const ficha = await Storage.ATS.getById(id);
    if (!ficha) return;
    AtsState.fichaActual = ficha;
    AtsState.modo = 'saved';
    // Registrar en historial del dashboard
    if (typeof agregarAlHistorial === 'function') agregarAlHistorial(ficha);
    renderFicha();
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al abrir ficha: ${texto}`, 'error');
  }
}

async function abrirFichaEdit(id) {
  try {
    const ficha = await Storage.ATS.getById(id);
    if (!ficha) return;
    AtsState.fichaActual = ficha;
    AtsState.modo = 'edit';
    renderFicha();
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al abrir ficha: ${texto}`, 'error');
  }
}

/* ================================================================
   FICHA — RENDER
   ================================================================ */
function renderFicha() {
  const ficha    = AtsState.fichaActual;
  const editable = AtsState.modo === 'edit';

  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: ficha.tipo === 'parada' ? 'Parada de Planta' : ficha.categoria,
      hash: ficha.tipo === 'parada'
        ? `parada/${encodeURIComponent(ficha.categoria)}`
        : `ats/${encodeURIComponent(ficha.categoria)}` },
    { label: ficha.nombre || 'Nueva Ficha' },
  ]);

  document.getElementById('ficha-titulo').textContent =
    (ficha.codigo ? ficha.codigo + ' — ' : '') + (ficha.nombre || 'Nueva Ficha');

  const inputNombre = document.getElementById('f-nombre');
  inputNombre.value    = ficha.nombre || '';
  inputNombre.disabled = !editable;

  // Campo código
  const inputCodigo = document.getElementById('f-codigo');
  if (inputCodigo) {
    inputCodigo.value    = ficha.codigo || '';
    inputCodigo.disabled = !editable;
  }

  // Tabla OT/TAG
  renderTablaOtTag(ficha.ot_tags || [], editable);

  const obsEl = document.getElementById('f-observaciones');
  if (obsEl) {
    obsEl.value    = ficha.observaciones || '';
    obsEl.disabled = !editable;
  }

  // Campos de emergencia
  const emerg = ficha.emergencia || {};
  const emergFields = [
    ['f-emerg-reunion',    emerg.reunion    || ''],
    ['f-emerg-alarmas',    emerg.alarmas    || ''],
    ['f-emerg-extintores', emerg.extintores || ''],
    ['f-emerg-lavaojos',   emerg.lavaojos   || ''],
    ['f-emerg-contacto',   emerg.contacto   || ''],
  ];
  emergFields.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.value = val; el.disabled = !editable; }
  });

  document.getElementById('ficha-actions-saved').style.display = editable ? 'none' : '';
  document.getElementById('ficha-actions-edit').style.display  = editable ? '' : 'none';
  document.getElementById('btn-add-row').style.display         = editable ? '' : 'none';

  renderTablaAts(ficha.filas || [], editable);
  showView('ats_ficha');
}

function renderTablaAts(filas, editable) {
  const tbody = document.getElementById('ats-tbody');
  tbody.innerHTML = '';
  filas.forEach((fila, i) => {
    const tr = document.createElement('tr');
    tr.dataset.index = i;
    tr.innerHTML = `
      <td class="td-num">${i + 1}</td>
      <td><textarea ${editable?'':'disabled'} data-col="paso" lang="es" spellcheck="true">${escapeHtml(fila.paso||'')}</textarea></td>
      <td><textarea ${editable?'':'disabled'} data-col="peligro" lang="es" spellcheck="true">${escapeHtml(fila.peligro||'')}</textarea></td>
      <td><textarea ${editable?'':'disabled'} data-col="control" lang="es" spellcheck="true">${escapeHtml(fila.control||'')}</textarea></td>
      <td class="td-del">
        <button class="row-del-btn" style="${editable?'':'display:none'}"
          onclick="eliminarFila(${i})">✕</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* ================================================================
   FICHA — ACCIONES
   ================================================================ */
function agregarFila() {
  if (!AtsState.fichaActual) return;
  // Sincronizar DOM → array ANTES de agregar, para no perder lo que el usuario escribió
  AtsState.fichaActual.filas = leerFilasDOM();
  AtsState.fichaActual.filas.push({ paso: '', peligro: '', control: '' });
  const i = AtsState.fichaActual.filas.length - 1;
  const tbody = document.getElementById('ats-tbody');
  const tr = document.createElement('tr');
  tr.dataset.index = i;
  tr.innerHTML = `
    <td class="td-num">${i + 1}</td>
    <td><textarea data-col="paso" lang="es" spellcheck="true" placeholder="Describir el paso..."></textarea></td>
    <td><textarea data-col="peligro" lang="es" spellcheck="true" placeholder="Peligros asociados..."></textarea></td>
    <td><textarea data-col="control" lang="es" spellcheck="true" placeholder="Medidas preventivas..."></textarea></td>
    <td class="td-del"><button class="row-del-btn" onclick="eliminarFila(${i})">✕</button></td>`;
  tbody.appendChild(tr);
  tr.querySelector('textarea')?.focus();
}

function eliminarFila(index) {
  if (!AtsState.fichaActual?.filas) return;
  // Sincronizar DOM → array ANTES de eliminar, para no perder lo que el usuario escribió
  AtsState.fichaActual.filas = leerFilasDOM();
  AtsState.fichaActual.filas.splice(index, 1);
  renderTablaAts(AtsState.fichaActual.filas, true);
}

function leerFilasDOM() {
  const filas = [];
  document.querySelectorAll('#ats-tbody tr').forEach(tr => {
    filas.push({
      paso:    tr.querySelector('[data-col="paso"]')?.value.trim()    || '',
      peligro: tr.querySelector('[data-col="peligro"]')?.value.trim() || '',
      control: tr.querySelector('[data-col="control"]')?.value.trim() || '',
    });
  });
  return filas;
}

/* ================================================================
   FICHA — GUARDAR / EDITAR
   ================================================================ */
async function guardarFicha(marcarActualizado = false) {
  const ficha = AtsState.fichaActual;
  if (!ficha) return;

  ficha.nombre = document.getElementById('f-nombre').value.trim();
  if (!ficha.nombre) {
    document.getElementById('f-nombre').style.borderColor = 'var(--btn-del)';
    document.getElementById('f-nombre').focus();
    return;
  }
  document.getElementById('f-nombre').style.borderColor = '';

  ficha.filas         = leerFilasDOM();
  ficha.observaciones = document.getElementById('f-observaciones')?.value.trim() || '';
  ficha.codigo        = document.getElementById('f-codigo')?.value.trim() || '';
  ficha.ot_tags       = leerOtTagsDOM().filter(f => f.ot || f.tag); // al guardar, quitar vacías
  ficha.emergencia    = {
    reunion:    document.getElementById('f-emerg-reunion')?.value.trim()    || '',
    alarmas:    document.getElementById('f-emerg-alarmas')?.value.trim()    || '',
    extintores: document.getElementById('f-emerg-extintores')?.value.trim() || '',
    lavaojos:   document.getElementById('f-emerg-lavaojos')?.value.trim()   || '',
    contacto:   document.getElementById('f-emerg-contacto')?.value.trim()   || '',
  };
  ficha.estado = 'guardado';
  // Si se pidió marcar como actualizado, forzar updated_at en el servidor
  ficha._marcarActualizado = marcarActualizado;

  try {
    const id = await Storage.ATS.save(ficha);
    if (!ficha.id) ficha.id = id;
    AtsState.modo = 'saved';
    renderFicha();
    toast(marcarActualizado ? '✅ Ficha guardada y marcada como Actualizada' : '✓ Ficha guardada correctamente');
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al guardar: ${texto}`, 'error');
  }
}

function editarFicha() {
  AtsState.modo = 'edit';
  renderFicha();
}

async function eliminarFicha(id) {
  if (!confirm('¿Eliminar esta ficha? Esta acción no se puede deshacer.')) return;
  try {
    await Storage.ATS.remove(id);
    toast('Ficha eliminada');
    renderAtsLista(AtsState.categoria, AtsState.tipo);
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

/* ================================================================
   OT / TAG — Tabla dinámica 4 columnas (2 pares por fila, hasta 20)
   ================================================================ */
function renderTablaOtTag(otTags, editable) {
  const tbody  = document.getElementById('tbody-ottag');
  const thead  = document.getElementById('thead-ottag');
  const btnAdd = document.getElementById('btn-add-ottag');
  const vacio  = document.getElementById('ottag-vacio');
  if (!tbody) return;

  tbody.innerHTML = '';

  const items = otTags || [];
  const tieneFilas = items.length > 0;

  // Cabecera: 4 columnas (OT | TAG | OT | TAG) + columna acciones
  if (thead) {
    thead.style.display = tieneFilas ? '' : 'none';
    thead.innerHTML = `<tr>
      <th style="background:var(--card);padding:7px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-dim);border:1px solid var(--border);width:24%">OT (10 dígitos)</th>
      <th style="background:var(--card);padding:7px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-dim);border:1px solid var(--border);width:26%">TAG Equipo</th>
      <th style="background:var(--card);padding:7px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-dim);border:1px solid var(--border);width:24%">OT (10 dígitos)</th>
      <th style="background:var(--card);padding:7px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-dim);border:1px solid var(--border)">TAG Equipo</th>
    </tr>`;
  }

  if (vacio)  vacio.style.display  = (!tieneFilas && !editable) ? '' : 'none';
  if (btnAdd) {
    btnAdd.style.display = editable ? '' : 'none';
    btnAdd.textContent   = items.length >= 20 ? '✓ Máximo 20' : '＋ Agregar';
    btnAdd.disabled      = items.length >= 20;
  }

  // Renderizar de a 2 entradas por fila (par izquierdo + par derecho)
  for (let i = 0; i < items.length; i += 2) {
    const izq = items[i];
    const der = items[i + 1]; // puede ser undefined

    const tdIzq = `
      <td style="border:1px solid var(--border);padding:5px 7px;background:#fff;width:24%">
        <input type="text" inputmode="numeric" maxlength="10"
          data-ot-col="ot" data-ot-idx="${i}" value="${escapeHtml(izq.ot||'')}"
          ${editable?'':'disabled'}
          style="width:100%;background:#fff;border:none;color:#1a1a1a;font-size:13px;font-family:var(--font)"
          placeholder="0000000000" />
      </td>
      <td style="border:1px solid var(--border);padding:5px 7px;background:#fff;position:relative">
        <div style="display:flex;align-items:center;gap:4px">
          <input type="text" data-ot-col="tag" data-ot-idx="${i}" value="${escapeHtml(izq.tag||'')}"
            ${editable?'':'disabled'}
            style="flex:1;background:#fff;border:none;color:#1a1a1a;font-size:13px;font-family:var(--font)"
            placeholder="FV-0000" />
          ${editable ? `<button class="row-del-btn" onclick="eliminarFilaOtTag(${i})" title="Eliminar">✕</button>` : ''}
        </div>
      </td>`;

    let tdDer = '';
    if (der) {
      tdDer = `
        <td style="border:1px solid var(--border);padding:5px 7px;background:#fff;width:24%">
          <input type="text" inputmode="numeric" maxlength="10"
            data-ot-col="ot" data-ot-idx="${i+1}" value="${escapeHtml(der.ot||'')}"
            ${editable?'':'disabled'}
            style="width:100%;background:#fff;border:none;color:#1a1a1a;font-size:13px;font-family:var(--font)"
            placeholder="0000000000" />
        </td>
        <td style="border:1px solid var(--border);padding:5px 7px;background:#fff">
          <div style="display:flex;align-items:center;gap:4px">
            <input type="text" data-ot-col="tag" data-ot-idx="${i+1}" value="${escapeHtml(der.tag||'')}"
              ${editable?'':'disabled'}
              style="flex:1;background:#fff;border:none;color:#1a1a1a;font-size:13px;font-family:var(--font)"
              placeholder="FV-0000" />
            ${editable ? `<button class="row-del-btn" onclick="eliminarFilaOtTag(${i+1})" title="Eliminar">✕</button>` : ''}
          </div>
        </td>`;
    } else {
      // Celda derecha vacía cuando hay número impar de entradas
      tdDer = `
        <td style="border:1px solid var(--border);background:var(--card);opacity:.3"></td>
        <td style="border:1px solid var(--border);background:var(--card);opacity:.3"></td>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = tdIzq + tdDer;
    tbody.appendChild(tr);
  }
}

function agregarFilaOtTag() {
  const ficha = AtsState.fichaActual;
  if (!ficha) return;
  ficha.ot_tags = leerOtTagsDOM();
  if (ficha.ot_tags.length >= 20) {
    toast('Máximo 20 entradas de OT/TAG', 'error');
    return;
  }
  ficha.ot_tags.push({ ot: '', tag: '' });
  renderTablaOtTag(ficha.ot_tags, true);
  // Foco en el último input OT agregado
  const inputs = document.querySelectorAll('#tbody-ottag [data-ot-col="ot"]');
  inputs[inputs.length - 1]?.focus();
}

function eliminarFilaOtTag(index) {
  const ficha = AtsState.fichaActual;
  if (!ficha) return;
  ficha.ot_tags = leerOtTagsDOM();
  ficha.ot_tags.splice(index, 1);
  renderTablaOtTag(ficha.ot_tags, true);
}

function leerOtTagsDOM() {
  const filas = [];
  // Leer por índice explícito en data-ot-idx para no depender del orden del DOM
  const otInputs = document.querySelectorAll('#tbody-ottag [data-ot-col="ot"]');
  otInputs.forEach(input => {
    const idx = parseInt(input.dataset.otIdx);
    const tag = document.querySelector(`#tbody-ottag [data-ot-col="tag"][data-ot-idx="${idx}"]`);
    filas[idx] = {
      ot:  input.value.trim()       || '',
      tag: tag?.value.trim()        || '',
    };
  });
  // Filtrar posibles huecos undefined
  return filas.filter(f => f !== undefined && f !== null);
}

async function exportarPdfAts(id) {
  let ficha = AtsState.fichaActual;
  if (id) { try { ficha = await Storage.ATS.getById(id); } catch(e) {} }
  if (!ficha) return;

  if (!window.jspdf) {
    toast('Librería PDF no cargada, intentá de nuevo', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fechaHoy = new Date().toLocaleDateString('es-AR');
  const prefijoCodigo = ficha.codigo ? `${ficha.codigo}_` : '';
  const nombreArchivo = `${prefijoCodigo}${ficha.nombre || 'ATS'}.pdf`;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Encabezado página 1
  const dibujarHeader = (pg) => {
    doc.setFillColor(45, 74, 110);
    doc.rect(0, 0, pageW, pg === 1 ? 14 : 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pg === 1 ? 10 : 7.5);
    doc.text('SGAS', 6, pg === 1 ? 9 : 6);
    doc.setFontSize(pg === 1 ? 8.5 : 7);
    doc.text('ANÁLISIS DE TRABAJO SEGURO (ATS)', pageW / 2, pg === 1 ? 9 : 6, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaHoy, pageW - 6, pg === 1 ? 9 : 6, { align: 'right' });
  };

  dibujarHeader(1);

  // Subtítulo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Categoría: ${ficha.categoria}`, 6, 19);
  doc.setFont('helvetica', 'bold');
  const nombreLines = doc.splitTextToSize(`Tarea: ${ficha.nombre}`, pageW - 12);
  doc.text(nombreLines, 6, 24);

  // Tabla con autoTable
  const body = (ficha.filas || []).map((f) => [
    String(f.paso    || ''),
    String(f.peligro || ''),
    String(f.control || ''),
  ]);

  doc.autoTable({
    startY: 29,
    head: [[
      'PASOS DE LA TAREA\nDescribe los pasos a seguir para ejecutar la actividad',
      'PELIGROS IDENTIFICADOS\nDetalla los peligros asociados a cada paso',
      'MEDIDAS DE CONTROL\nEspecifique acciones a tomar para prevenir o mitigar cada riesgo',
    ]],
    body,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.5, right: 2.5, bottom: 1.5, left: 2.5 },
      valign: 'top',
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      overflow: 'linebreak',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [45, 74, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      valign: 'middle',
      halign: 'left',
      cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
    },
    columnStyles: {},
    tableWidth: 'auto',
    alternateRowStyles: { fillColor: [248, 250, 252] },
    rowPageBreak: 'auto',
    showHead: 'firstPage',
    margin: { top: 12, left: 6, right: 6, bottom: 10 },
    didDrawPage: (data) => {
      const pg = doc.internal.getCurrentPageInfo().pageNumber;
      if (pg > 1) dibujarHeader(pg);
      // Pie
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${ficha.categoria} — ${ficha.nombre}`, 6, pageH - 3.5);
      doc.text(`Página ${pg}`, pageW / 2, pageH - 3.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      const estadoTexto = ficha.estado === 'guardado' ? 'ESTADO: GUARDADO' : 'ESTADO: BORRADOR';
      const estadoColor = ficha.estado === 'guardado' ? [45, 106, 79] : [181, 86, 10];
      doc.setTextColor(...estadoColor);
      doc.text(estadoTexto, pageW - 6, pageH - 3.5, { align: 'right' });
    },
  });

  // Observaciones
  if (ficha.observaciones) {
    const finalY = (doc.lastAutoTable?.finalY || 29) + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text('Observaciones / Recomendaciones:', 6, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const lines = doc.splitTextToSize(ficha.observaciones, pageW - 12);
    doc.text(lines, 6, finalY + 4);
  }

  doc.save(nombreArchivo);
}

/* ================================================================
   EXPORTAR EXCEL — ExcelJS → .xlsx nativo con estilos reales
   ================================================================ */
async function exportarExcelAts(id) {
  let ficha = AtsState.fichaActual;
  if (id) { try { ficha = await Storage.ATS.getById(id); } catch(e) {} }
  if (!ficha) return;

  /* ── Cargar ExcelJS dinámicamente si no está disponible aún ── */
  if (!window.ExcelJS) {
    toast('Cargando librería Excel...');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src     = 'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }).catch(() => null);
  }

  const EJS = window.ExcelJS;
  if (!EJS || !EJS.Workbook) {
    toast('No se pudo cargar la librería Excel. Verificá tu conexión.', 'error');
    return;
  }

  const fechaHoy      = new Date().toLocaleDateString('es-AR');
  const prefijoCodigo = ficha.codigo ? `${ficha.codigo}_` : '';
  const nombreArchivo = `${prefijoCodigo}${ficha.nombre || 'ATS'}.xlsx`;
  const filas         = ficha.filas || [];

  /* ── Helpers de estilo ── */
  const AZUL    = { argb: 'FF2D4A6E' };
  const VERDE   = { argb: 'FF4A6741' };
  const GRIS    = { argb: 'FFEEF2F7' };
  const GRIS2   = { argb: 'FFE8EDF5' };
  const BLANCO  = { argb: 'FFFFFFFF' };
  const GRISF   = { argb: 'FFF8FAFB' };
  const AMARILL = { argb: 'FFFFFBEA' };
  const NEGRO   = { argb: 'FF1A1A1A' };
  const BLANCOT = { argb: 'FFFFFFFF' };

  const borde = {
    top:    { style: 'thin', color: { argb: 'FFB4B4B4' } },
    left:   { style: 'thin', color: { argb: 'FFB4B4B4' } },
    bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
    right:  { style: 'thin', color: { argb: 'FFB4B4B4' } },
  };

  function estilo(fgColor, fontColor, bold = false, vAlign = 'middle', hAlign = 'left') {
    return {
      font:      { name: 'Calibri', size: 10, bold, color: { argb: fontColor.argb } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor },
      alignment: { vertical: vAlign, horizontal: hAlign, wrapText: true },
      border:    borde,
    };
  }

  const sTitulo   = estilo(AZUL,    BLANCOT, true,  'middle', 'center');
  const sMeta     = estilo(GRIS,    NEGRO,   false, 'middle', 'left');
  const sCabecera = estilo(AZUL,    BLANCOT, true,  'middle', 'center');
  const sPaso     = estilo(GRIS2,   NEGRO,   true,  'middle', 'left');
  const sDato     = estilo(BLANCO,  NEGRO,   false, 'top',    'left');
  const sDatoAlt  = estilo(GRISF,   NEGRO,   false, 'top',    'left');
  const sObsHead  = estilo(VERDE,   BLANCOT, true,  'middle', 'left');
  const sObsBody  = estilo(AMARILL, NEGRO,   false, 'top',    'left');

  /* ── Crear libro y hoja ── */
  const wb = new EJS.Workbook();
  wb.creator = 'SGAS';
  const ws = wb.addWorksheet('ATS', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  /* ── Anchos de columna ── */
  ws.columns = [
    { width: 38 },  // A — Etapas
    { width: 42 },  // B — Peligros
    { width: 42 },  // C — Medidas
  ];

  /* ── Helper para agregar fila con estilo ── */
  function agregarFila(valores, estilos, altura = 18) {
    const row = ws.addRow(valores);
    row.height = altura;
    estilos.forEach((s, i) => {
      if (s) Object.assign(row.getCell(i + 1), s);
    });
    return row;
  }

  function aplicarEstilo(cell, s) {
    cell.style = s;
  }

  /* ── Fila 1: Título (merge A-C) ── */
  agregarFila(['ANÁLISIS DE TRABAJO SEGURO (ATS)', '', ''], [sTitulo, sTitulo, sTitulo], 28);
  ws.mergeCells('A1:C1');

  /* ── Fila 2: Metadatos ── */
  agregarFila(
    [`Categoría: ${ficha.categoria}`, `Fecha: ${fechaHoy}`, `Estado: ${ficha.estado === 'guardado' ? 'Guardado' : 'Borrador'}`],
    [sMeta, sMeta, sMeta], 18
  );

  /* ── Fila 3: Nombre tarea (merge A-C) ── */
  agregarFila([`Tarea: ${ficha.nombre}`, '', ''], [sMeta, sMeta, sMeta], 18);
  ws.mergeCells(`A3:C3`);

  /* ── Fila 4: Código y OT/TAG (si existen) ── */
  let filaActual = 4; // próxima fila disponible (1-indexed) antes de cabeceras

  if (ficha.codigo && ficha.codigo.trim()) {
    agregarFila([`Código: ${ficha.codigo}`, '', ''], [sMeta, sMeta, sMeta], 16);
    ws.mergeCells(`A${filaActual}:C${filaActual}`);
    filaActual++;
  }

  if (ficha.ot_tags && ficha.ot_tags.length > 0) {
    const sOtHead = estilo(AZUL, BLANCOT, true, 'middle', 'center');
    const sOtDato = estilo(GRIS, NEGRO, false, 'middle', 'left');
    // Cabecera: OT | TAG (siempre 2 columnas en el Excel para mantener el formato)
    agregarFila(['OT', 'TAG Equipo', ''], [sOtHead, sOtHead, sOtHead], 16);
    ws.mergeCells(`B${filaActual}:C${filaActual}`);
    filaActual++;
    ficha.ot_tags.filter(f => f.ot || f.tag).forEach(item => {
      agregarFila([item.ot || '', item.tag || '', ''], [sOtDato, sOtDato, sOtDato], 16);
      ws.mergeCells(`B${filaActual}:C${filaActual}`);
      filaActual++;
    });
  }

  /* ── Cabeceras de tabla ── */
  agregarFila(
    [
      'Etapas de la Tarea\n(describa paso a paso las actividades)',
      'Peligros / Consecuencias\n(Escriba lo que puede suceder si no se implementan controles)',
      'Medidas de control requeridas',
    ],
    [sCabecera, sCabecera, sCabecera], 36
  );

  /* ── Filas de datos ── */

  // Divide un texto con ítems numerados "1. xxx 2. yyy" en un array de strings
  // Soporta "1.", "1)", números con o sin espacio después
  function dividirNumerados(texto) {
    if (!texto || !texto.trim()) return [''];
    // Separar cuando el número está precedido por inicio, salto de línea o espacio
    // Nunca parte en medio de un número (10. 11. 23. 30. funcionan bien)
    // No parte decimales como 13.41 porque después del punto no hay espacio
    const partes = texto.split(/(?:^|\n| )(?=\d{1,2}\. )/m);
    const resultado = partes.map(p => p.trim()).filter(p => p.length > 0);
    return resultado.length > 1 ? resultado : [texto.trim()];
  }

  let rowIdx = filaActual + 1; // siguiente fila disponible después de cabeceras

  filas.forEach((f, fi) => {
    const sFilaDato = fi % 2 === 0 ? sDato : sDatoAlt;
    const paso      = (f.paso    || '').trim();
    const peligros  = dividirNumerados(f.peligro);
    const medidas   = dividirNumerados(f.control);
    const cantFilas = Math.max(peligros.length, medidas.length);
    const filaInicio = rowIdx;

    for (let i = 0; i < cantFilas; i++) {
      const peligroTexto = peligros[i] || '';
      const medidaTexto  = medidas[i]  || '';

      // Columna A solo en la primera sub-fila, las demás vacías (quedan bajo el merge)
      const row = ws.addRow([i === 0 ? paso : '', peligroTexto, medidaTexto]);

      // Altura proporcional al texto más largo de la fila
      const maxLen = Math.max(peligroTexto.length, medidaTexto.length);
      row.height = maxLen > 200 ? 90 : maxLen > 100 ? 60 : 40;

      aplicarEstilo(row.getCell(1), sPaso);
      aplicarEstilo(row.getCell(2), sFilaDato);
      aplicarEstilo(row.getCell(3), sFilaDato);
      rowIdx++;
    }

    // Merge vertical en columna A si hay más de 1 sub-fila
    if (cantFilas > 1) {
      ws.mergeCells(`A${filaInicio}:A${filaInicio + cantFilas - 1}`);
    }
  });

  /* ── Observaciones ── */
  if (ficha.observaciones && ficha.observaciones.trim()) {
    // Fila separadora
    const sepRow = ws.addRow(['', '', '']);
    sepRow.height = 6;
    rowIdx++;

    // Encabezado observaciones
    const headRow = ws.addRow(['Observaciones / Recomendaciones:', '', '']);
    headRow.height = 20;
    aplicarEstilo(headRow.getCell(1), sObsHead);
    aplicarEstilo(headRow.getCell(2), sObsHead);
    aplicarEstilo(headRow.getCell(3), sObsHead);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
    rowIdx++;

    // Contenido observaciones
    const obsRow = ws.addRow([ficha.observaciones, '', '']);
    obsRow.height = 60;
    aplicarEstilo(obsRow.getCell(1), sObsBody);
    aplicarEstilo(obsRow.getCell(2), sObsBody);
    aplicarEstilo(obsRow.getCell(3), sObsBody);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
  }

  /* ── Descargar ── */
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('✓ Excel descargado');
}

/* ================================================================
   DESCARGAR ZIP — PDF o EXCEL de todas las fichas de la categoría
   ================================================================ */

function nombreArchivoFicha(ficha, ext) {
  const codigo = (ficha.codigo || '').trim();
  const nombre = (ficha.nombre || 'ATS').trim()
    .replace(/[/\\:*?"<>|]/g, '-'); // caracteres inválidos en nombres de archivo
  return codigo ? `${codigo}_${nombre}.${ext}` : `${nombre}.${ext}`;
}

async function descargarZipPdf() {
  if (!window.JSZip) {
    toast('Librería ZIP no cargada, esperá un momento', 'error');
    return;
  }
  if (!window.jspdf) {
    toast('Librería PDF no cargada, esperá un momento', 'error');
    return;
  }

  const fichas = AtsState._fichasLista;
  if (!fichas || fichas.length === 0) {
    toast('No hay fichas para descargar', 'error');
    return;
  }

  toast(`⏳ Generando ZIP con ${fichas.length} PDF${fichas.length > 1 ? 's' : ''}...`);

  const zip = new JSZip();

  for (const item of fichas) {
    try {
      const ficha = await Storage.ATS.getById(item.id);
      if (!ficha) continue;
      const pdfBytes = await generarPdfBytes(ficha);
      zip.file(nombreArchivoFicha(ficha, 'pdf'), pdfBytes);
    } catch(e) { console.error('Error generando PDF para', item.nombre, e); }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${AtsState.categoria}_PDF.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('✓ ZIP PDF descargado');
}

async function descargarZipExcel() {
  if (!window.JSZip) {
    toast('Librería ZIP no cargada, esperá un momento', 'error');
    return;
  }
  if (!window.ExcelJS) {
    toast('Librería Excel no cargada, esperá un momento', 'error');
    return;
  }

  const fichas = AtsState._fichasLista;
  if (!fichas || fichas.length === 0) {
    toast('No hay fichas para descargar', 'error');
    return;
  }

  toast(`⏳ Generando ZIP con ${fichas.length} Excel${fichas.length > 1 ? 's' : ''}...`);

  const zip = new JSZip();

  for (const item of fichas) {
    try {
      const ficha = await Storage.ATS.getById(item.id);
      if (!ficha) continue;
      const xlsxBytes = await generarExcelBytes(ficha);
      zip.file(nombreArchivoFicha(ficha, 'xlsx'), xlsxBytes);
    } catch(e) { console.error('Error generando Excel para', item.nombre, e); }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${AtsState.categoria}_Excel.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('✓ ZIP Excel descargado');
}

// Genera un PDF en memoria y retorna los bytes (Uint8Array)
async function generarPdfBytes(ficha) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fechaHoy = new Date().toLocaleDateString('es-AR');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const dibujarHeader = (pg) => {
    doc.setFillColor(45, 74, 110);
    doc.rect(0, 0, pageW, pg === 1 ? 14 : 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pg === 1 ? 10 : 7.5);
    doc.text('SGAS', 6, pg === 1 ? 9 : 6);
    doc.setFontSize(pg === 1 ? 8.5 : 7);
    doc.text('ANÁLISIS DE TRABAJO SEGURO (ATS)', pageW / 2, pg === 1 ? 9 : 6, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaHoy, pageW - 6, pg === 1 ? 9 : 6, { align: 'right' });
  };

  dibujarHeader(1);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Categoría: ${ficha.categoria}`, 6, 19);
  doc.setFont('helvetica', 'bold');
  const tituloCompleto = (ficha.codigo ? `${ficha.codigo} — ` : '') + ficha.nombre;
  const nombreLines = doc.splitTextToSize(`Tarea: ${tituloCompleto}`, pageW - 12);
  doc.text(nombreLines, 6, 24);

  const body = (ficha.filas || []).map(f => [
    String(f.paso || ''), String(f.peligro || ''), String(f.control || ''),
  ]);

  doc.autoTable({
    startY: 29,
    head: [['PASOS DE LA TAREA', 'PELIGROS IDENTIFICADOS', 'MEDIDAS DE CONTROL']],
    body,
    styles: { fontSize: 6.5, cellPadding: { top: 1.5, right: 2.5, bottom: 1.5, left: 2.5 }, valign: 'top', lineColor: [180,180,180], lineWidth: 0.2, overflow: 'linebreak', font: 'helvetica' },
    headStyles: { fillColor: [45,74,110], textColor: [255,255,255], fontStyle: 'bold', fontSize: 6.5, valign: 'middle', halign: 'left', cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 } },
    tableWidth: 'auto',
    alternateRowStyles: { fillColor: [248,250,252] },
    rowPageBreak: 'auto',
    showHead: 'firstPage',
    margin: { top: 12, left: 6, right: 6, bottom: 10 },
    didDrawPage: (data) => {
      const pg = doc.internal.getCurrentPageInfo().pageNumber;
      if (pg > 1) dibujarHeader(pg);
      doc.setTextColor(120,120,120);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${ficha.categoria} — ${ficha.nombre}`, 6, pageH - 3.5);
      doc.text(`Página ${pg}`, pageW / 2, pageH - 3.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      const estadoColor = ficha.estado === 'guardado' ? [45,106,79] : [181,86,10];
      doc.setTextColor(...estadoColor);
      const estadoTexto = ficha.estado === 'guardado' ? 'ESTADO: GUARDADO' : 'ESTADO: BORRADOR';
      doc.text(estadoTexto, pageW - 6, pageH - 3.5, { align: 'right' });
    },
  });

  if (ficha.observaciones) {
    const finalY = (doc.lastAutoTable?.finalY || 29) + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0,0,0);
    doc.text('Observaciones / Recomendaciones:', 6, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const lines = doc.splitTextToSize(ficha.observaciones, pageW - 12);
    doc.text(lines, 6, finalY + 4);
  }

  return doc.output('arraybuffer');
}

// Genera un Excel en memoria y retorna los bytes (ArrayBuffer)
async function generarExcelBytes(ficha) {
  const EJS = window.ExcelJS;
  const wb  = new EJS.Workbook();
  wb.creator = 'SGAS';
  const ws  = wb.addWorksheet('ATS', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws.columns = [{ width: 38 }, { width: 42 }, { width: 42 }];

  const fechaHoy = new Date().toLocaleDateString('es-AR');

  // Reutiliza los mismos estilos que exportarExcelAts
  const AZUL = { argb: 'FF2D4A6E' }, VERDE = { argb: 'FF4A6741' };
  const GRIS = { argb: 'FFEEF2F7' }, GRIS2 = { argb: 'FFE8EDF5' };
  const BLANCO = { argb: 'FFFFFFFF' }, GRISF = { argb: 'FFF8FAFB' };
  const AMARILL = { argb: 'FFFFFBEA' }, NEGRO = { argb: 'FF1A1A1A' };
  const BLANCOT = { argb: 'FFFFFFFF' };
  const borde = { top: { style:'thin', color:{argb:'FFB4B4B4'} }, left: { style:'thin', color:{argb:'FFB4B4B4'} }, bottom: { style:'thin', color:{argb:'FFB4B4B4'} }, right: { style:'thin', color:{argb:'FFB4B4B4'} } };
  const estilo = (fgColor, fontColor, bold=false, vAlign='middle', hAlign='left') => ({
    font: { name:'Calibri', size:10, bold, color:{argb:fontColor.argb} },
    fill: { type:'pattern', pattern:'solid', fgColor },
    alignment: { vertical:vAlign, horizontal:hAlign, wrapText:true },
    border: borde,
  });
  const sTitulo = estilo(AZUL,BLANCOT,true,'middle','center');
  const sMeta   = estilo(GRIS,NEGRO,false,'middle','left');
  const sCab    = estilo(AZUL,BLANCOT,true,'middle','center');
  const sPaso   = estilo(GRIS2,NEGRO,true,'middle','left');
  const sDato   = estilo(BLANCO,NEGRO,false,'top','left');
  const sDatoA  = estilo(GRISF,NEGRO,false,'top','left');
  const sObsH   = estilo(VERDE,BLANCOT,true,'middle','left');
  const sObsB   = estilo(AMARILL,NEGRO,false,'top','left');

  const addFila = (vals, ests, h=18) => { const row=ws.addRow(vals); row.height=h; ests.forEach((s,i)=>{ if(s) row.getCell(i+1).style=s; }); return row; };

  const tituloCompleto = (ficha.codigo ? `${ficha.codigo} — ` : '') + ficha.nombre;
  addFila(['ANÁLISIS DE TRABAJO SEGURO (ATS)','',''], [sTitulo,sTitulo,sTitulo], 28);
  ws.mergeCells('A1:C1');
  addFila([`Categoría: ${ficha.categoria}`, `Fecha: ${fechaHoy}`, `Estado: ${ficha.estado==='guardado'?'Guardado':'Borrador'}`], [sMeta,sMeta,sMeta], 18);
  addFila([`Tarea: ${tituloCompleto}`,'',''], [sMeta,sMeta,sMeta], 18);
  ws.mergeCells('A3:C3');

  let filaActual = 4;
  if (ficha.codigo && ficha.codigo.trim()) {
    addFila([`Código: ${ficha.codigo}`,'',''], [sMeta,sMeta,sMeta], 16);
    ws.mergeCells(`A${filaActual}:C${filaActual}`);
    filaActual++;
  }
  if (ficha.ot_tags && ficha.ot_tags.length > 0) {
    const sOtH = estilo(AZUL,BLANCOT,true,'middle','center');
    const sOtD = estilo(GRIS,NEGRO,false,'middle','left');
    addFila(['OT','TAG Equipo',''], [sOtH,sOtH,sOtH], 16);
    ws.mergeCells(`B${filaActual}:C${filaActual}`); filaActual++;
    ficha.ot_tags.filter(f => f.ot || f.tag).forEach(item => {
      addFila([item.ot||'', item.tag||'',''], [sOtD,sOtD,sOtD], 16);
      ws.mergeCells(`B${filaActual}:C${filaActual}`); filaActual++;
    });
  }

  addFila(['Etapas de la Tarea\n(describa paso a paso las actividades)','Peligros / Consecuencias\n(Escriba lo que puede suceder si no se implementan controles)','Medidas de control requeridas'], [sCab,sCab,sCab], 36);

  const dividir = (txt) => {
    if (!txt || !txt.trim()) return [''];
    const p = txt.split(/(?:^|\n| )(?=\d{1,2}\. )/m);
    const r = p.map(x=>x.trim()).filter(x=>x.length>0);
    return r.length>1 ? r : [txt.trim()];
  };

  let rowIdx = filaActual + 1;
  (ficha.filas||[]).forEach((f, fi) => {
    const sF = fi%2===0 ? sDato : sDatoA;
    const paso = (f.paso||'').trim();
    const peligros = dividir(f.peligro);
    const medidas  = dividir(f.control);
    const cant = Math.max(peligros.length, medidas.length);
    const filaIni = rowIdx;
    for (let i=0; i<cant; i++) {
      const row = ws.addRow([i===0?paso:'', peligros[i]||'', medidas[i]||'']);
      const ml = Math.max((peligros[i]||'').length, (medidas[i]||'').length);
      row.height = ml>200?90:ml>100?60:40;
      row.getCell(1).style = sPaso;
      row.getCell(2).style = sF;
      row.getCell(3).style = sF;
      rowIdx++;
    }
    if (cant>1) ws.mergeCells(`A${filaIni}:A${filaIni+cant-1}`);
  });

  if (ficha.observaciones && ficha.observaciones.trim()) {
    ws.addRow(['','','']).height = 6; rowIdx++;
    const hRow = ws.addRow(['Observaciones / Recomendaciones:','','']);
    hRow.height=20; hRow.getCell(1).style=sObsH; hRow.getCell(2).style=sObsH; hRow.getCell(3).style=sObsH;
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`); rowIdx++;
    const oRow = ws.addRow([ficha.observaciones,'','']);
    oRow.height=60; oRow.getCell(1).style=sObsB; oRow.getCell(2).style=sObsB; oRow.getCell(3).style=sObsB;
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
  }

  return wb.xlsx.writeBuffer();
}

/* ================================================================
   FAVORITO — Toggle sin tocar el resto de la ficha
   ================================================================ */
async function toggleFavorito(id, btn) {
  try {
    const result = await Storage.ATS.toggleFavorito(id);
    if (btn) {
      const esFav = result?.favorito ?? false;
      btn.style.opacity = esFav ? '1' : '0.3';
      btn.title = esFav ? 'Quitar favorito' : 'Marcar como favorito';
    }
    // Actualizar en la lista en memoria también
    if (AtsState._fichasLista) {
      const ficha = AtsState._fichasLista.find(f => f.id === id);
      if (ficha) ficha.favorito = result?.favorito ?? !ficha.favorito;
    }
  } catch(e) {
    toast('Error al actualizar favorito', 'error');
  }
}

/* ================================================================
   REPORTE PARADA DE PLANTA — Vista y Excel
   ================================================================ */
let _reporteFiltro = 'todo'; // 'hoy' | 'semana' | 'mes' | 'todo'

async function renderReporteParada() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Reporte Parada de Planta' },
  ]);

  showView('reporte_parada');

  const container = document.getElementById('reporte-parada-content');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-dim)">Cargando reporte...</div>';

  let fichas = [];
  try { fichas = await Storage.ATS.getReporteParada(); } catch(e) {
    container.innerHTML = '<div style="color:#f87171;padding:20px">Error al cargar el reporte.</div>';
    return;
  }

  // Aplicar filtro de fecha
  const ahora = new Date();
  const fichasFiltradas = fichas.filter(f => {
    if (_reporteFiltro === 'todo') return true;
    const fecha = new Date(f.updated_at || f.created_at);
    if (_reporteFiltro === 'hoy') {
      return fecha.toDateString() === ahora.toDateString();
    }
    if (_reporteFiltro === 'semana') {
      const hace7 = new Date(ahora); hace7.setDate(ahora.getDate() - 7);
      return fecha >= hace7;
    }
    if (_reporteFiltro === 'mes') {
      return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    }
    return true;
  });

  // Agrupar por categoría
  const porCategoria = {};
  fichasFiltradas.forEach(f => {
    const cat = f.categoria || 'Sin categoría';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(f);
  });

  const totalGeneral  = fichasFiltradas.length;
  const totalNuevos   = fichasFiltradas.filter(f => f.esNuevo).length;
  const totalActualiz = fichasFiltradas.filter(f => !f.esNuevo).length;
  const totalFavoritos = fichasFiltradas.filter(f => f.favorito).length;

  // Filtros
  const filtrosHtml = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${['todo','hoy','semana','mes'].map(f => `
        <button onclick="cambiarFiltroReporte('${f}')"
          class="btn btn-sm ${_reporteFiltro === f ? 'btn-primary' : 'btn-ghost'}"
          id="filtro-${f}">
          ${f === 'todo' ? 'Todo' : f === 'hoy' ? 'Hoy' : f === 'semana' ? 'Esta semana' : 'Este mes'}
        </button>`).join('')}
      <button class="btn btn-save btn-sm" onclick="descargarExcelReporteParada()" style="margin-left:auto">
        📥 Descargar Excel
      </button>
    </div>`;

  // Tabla resumen por categoría
  const resumenRows = Object.entries(porCategoria).map(([cat, lista]) => {
    const nuevos   = lista.filter(f => f.esNuevo).length;
    const actualiz = lista.filter(f => !f.esNuevo).length;
    const favs     = lista.filter(f => f.favorito).length;
    return `<tr>
      <td style="padding:10px 14px;font-weight:600">${escapeHtml(cat)}</td>
      <td style="padding:10px 14px;text-align:center;font-size:18px;font-weight:700;color:var(--accent)">${lista.length}</td>
      <td style="padding:10px 14px;text-align:center;color:#10b981;font-weight:600">${nuevos}</td>
      <td style="padding:10px 14px;text-align:center;color:#f59e0b;font-weight:600">${actualiz}</td>
      <td style="padding:10px 14px;text-align:center">⭐ ${favs}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    ${filtrosHtml}

    <!-- Stats rápidas -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px">
      <div class="stat-card" style="padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:var(--accent)">${totalGeneral}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Total ATS</div>
      </div>
      <div class="stat-card" style="padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:#10b981">${totalNuevos}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">🆕 Nuevos</div>
      </div>
      <div class="stat-card" style="padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:#f59e0b">${totalActualiz}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">🔄 Actualizados</div>
      </div>
      <div class="stat-card" style="padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:700;color:#fbbf24">${totalFavoritos}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">⭐ Favoritos</div>
      </div>
    </div>

    <!-- Tabla por especialidad -->
    <div class="stat-card" style="padding:0;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--header)">
            <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.5px">Especialidad</th>
            <th style="padding:12px 14px;text-align:center;font-size:11px;font-weight:700;color:var(--text);text-transform:uppercase">Total</th>
            <th style="padding:12px 14px;text-align:center;font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase">🆕 Nuevos</th>
            <th style="padding:12px 14px;text-align:center;font-size:11px;font-weight:700;color:#f59e0b;text-transform:uppercase">🔄 Actualiz.</th>
            <th style="padding:12px 14px;text-align:center;font-size:11px;font-weight:700;color:#fbbf24;text-transform:uppercase">⭐ Favoritos</th>
          </tr>
        </thead>
        <tbody>${resumenRows}</tbody>
        <tfoot>
          <tr style="background:var(--card);font-weight:700">
            <td style="padding:12px 14px">TOTAL GENERAL</td>
            <td style="padding:12px 14px;text-align:center;color:var(--accent);font-size:18px">${totalGeneral}</td>
            <td style="padding:12px 14px;text-align:center;color:#10b981">${totalNuevos}</td>
            <td style="padding:12px 14px;text-align:center;color:#f59e0b">${totalActualiz}</td>
            <td style="padding:12px 14px;text-align:center;color:#fbbf24">⭐ ${totalFavoritos}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

function cambiarFiltroReporte(filtro) {
  _reporteFiltro = filtro;
  renderReporteParada();
}

async function descargarExcelReporteParada() {
  if (!window.ExcelJS) {
    toast('Librería Excel no disponible', 'error');
    return;
  }
  toast('⏳ Generando reporte Excel...');

  let fichas = [];
  try { fichas = await Storage.ATS.getReporteParada(); } catch(e) {
    toast('Error al generar reporte', 'error');
    return;
  }

  const EJS = window.ExcelJS;
  const wb  = new EJS.Workbook();
  wb.creator = 'SGAS';

  const AZUL    = { argb: 'FF2D4A6E' };
  const VERDE   = { argb: 'FF10B981' };
  const AMARILL = { argb: 'FFF59E0B' };
  const BLANCO  = { argb: 'FFFFFFFF' };
  const NEGRO   = { argb: 'FF1A1A1A' };
  const GRIS    = { argb: 'FFEEF2F7' };
  const borde   = { style: 'thin', color: { argb: 'FFB4B4B4' } };
  const bords   = { top: borde, left: borde, bottom: borde, right: borde };

  const sCab  = { font: { bold: true, color: { argb: BLANCO.argb }, name: 'Calibri', size: 10 }, fill: { type: 'pattern', pattern: 'solid', fgColor: AZUL }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: bords };
  const sDato = { font: { name: 'Calibri', size: 10, color: { argb: NEGRO.argb } }, fill: { type: 'pattern', pattern: 'solid', fgColor: GRIS }, alignment: { vertical: 'top', wrapText: true }, border: bords };
  const sNuevo = { ...sDato, font: { ...sDato.font, color: { argb: VERDE.argb }, bold: true } };
  const sAct   = { ...sDato, font: { ...sDato.font, color: { argb: AMARILL.argb }, bold: true } };

  // Agrupar por categoría
  const porCategoria = {};
  fichas.forEach(f => {
    const cat = f.categoria || 'Sin categoría';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(f);
  });

  // Una hoja por categoría
  Object.entries(porCategoria).forEach(([cat, lista]) => {
    const nombreHoja = cat.substring(0, 31).replace(/[*?:\\/\[\]]/g, '-');
    const ws = wb.addWorksheet(nombreHoja);
    ws.columns = [
      { width: 22 }, // Código
      { width: 45 }, // Título
      { width: 14 }, // OT
      { width: 16 }, // TAG
      { width: 13 }, // Estado
    ];

    // Título de la hoja
    ws.mergeCells('A1:E1');
    const titleRow = ws.getRow(1);
    titleRow.height = 28;
    titleRow.getCell(1).value = `PARADA DE PLANTA — ${cat.toUpperCase()}`;
    titleRow.getCell(1).style = { ...sCab, font: { ...sCab.font, size: 12 } };

    // Cabeceras
    const cabRow = ws.addRow(['CÓDIGO', 'TÍTULO DEL ATS', 'OT', 'TAG', 'ESTADO']);
    cabRow.height = 30;
    cabRow.eachCell(cell => { cell.style = sCab; });

    // Datos
    lista.forEach(ficha => {
      const otTags = (ficha.ot_tags || []).filter(t => t.ot || t.tag);
      const estado = ficha.esNuevo ? 'NUEVO' : 'ACTUALIZADO';
      const sEstado = ficha.esNuevo ? sNuevo : sAct;

      if (otTags.length === 0) {
        const row = ws.addRow([ficha.codigo || '', ficha.nombre || '', '', '', estado]);
        row.height = 30;
        row.getCell(1).style = sDato;
        row.getCell(2).style = sDato;
        row.getCell(3).style = sDato;
        row.getCell(4).style = sDato;
        row.getCell(5).style = sEstado;
      } else {
        const startRow = ws.rowCount + 1;
        otTags.forEach((ot, i) => {
          const row = ws.addRow([
            i === 0 ? (ficha.codigo || '') : '',
            i === 0 ? (ficha.nombre || '') : '',
            ot.ot  || '',
            ot.tag || '',
            i === 0 ? estado : '',
          ]);
          row.height = 28;
          row.getCell(1).style = sDato;
          row.getCell(2).style = sDato;
          row.getCell(3).style = sDato;
          row.getCell(4).style = sDato;
          row.getCell(5).style = sEstado;
        });
        // Merge vertical en código, título y estado
        if (otTags.length > 1) {
          const endRow = ws.rowCount;
          ws.mergeCells(`A${startRow}:A${endRow}`);
          ws.mergeCells(`B${startRow}:B${endRow}`);
          ws.mergeCells(`E${startRow}:E${endRow}`);
        }
      }
    });
  });

  // Hoja de resumen
  const wsRes = wb.addWorksheet('RESUMEN GENERAL');
  wsRes.columns = [{ width: 30 }, { width: 12 }, { width: 12 }, { width: 14 }];

  wsRes.mergeCells('A1:D1');
  wsRes.getRow(1).height = 28;
  wsRes.getRow(1).getCell(1).value = 'RESUMEN GENERAL — ATS PARADA DE PLANTA SS.GG';
  wsRes.getRow(1).getCell(1).style = { ...sCab, font: { ...sCab.font, size: 12 } };

  const cabRes = wsRes.addRow(['ESPECIALIDAD', 'TOTAL', '🆕 NUEVOS', '🔄 ACTUALIZADOS']);
  cabRes.height = 28;
  cabRes.eachCell(c => { c.style = sCab; });

  let totalGen = 0, totalNue = 0, totalAct = 0;
  Object.entries(porCategoria).forEach(([cat, lista]) => {
    const nue = lista.filter(f => f.esNuevo).length;
    const act = lista.filter(f => !f.esNuevo).length;
    totalGen += lista.length; totalNue += nue; totalAct += act;
    const row = wsRes.addRow([cat, lista.length, nue, act]);
    row.height = 22;
    row.eachCell(c => { c.style = sDato; });
  });

  const totRow = wsRes.addRow(['TOTAL GENERAL', totalGen, totalNue, totalAct]);
  totRow.height = 24;
  totRow.eachCell(c => { c.style = { ...sCab, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2035' } } }; });

  // Descargar
  // Agregar hoja Control OT si está disponible
  if (typeof agregarHojaControlOtAlReporte === 'function') {
    await agregarHojaControlOtAlReporte(wb);
  }

  const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = `Reporte_ATS_Parada_Planta_SSGG_${fecha}.xlsx`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('✓ Reporte Excel descargado');
}

/* ── Registrar vistas en el router ── */
Views.atsLista = (cat, tipo) => renderAtsLista(cat, tipo || 'ats');
Views.reporteParada = () => renderReporteParada();
Views.genericoLista = (slug, label) => {
  AtsState.categoria = label;
  AtsState.tipo      = 'ats';
  renderAtsLista(label, 'ats');
};

/* ── Exponer globalmente ── */
window.agregarFila      = agregarFila;
window.eliminarFila     = eliminarFila;
window.guardarFicha     = guardarFicha;
window.editarFicha      = editarFicha;
window.eliminarFicha    = eliminarFicha;
window.abrirFichaSaved  = abrirFichaSaved;
window.abrirFichaEdit   = abrirFichaEdit;
window.exportarPdfAts   = exportarPdfAts;
window.exportarExcelAts = exportarExcelAts;
window.renderAtsLista   = renderAtsLista;
window.crearNuevaFicha   = crearNuevaFicha;
window.agregarFilaOtTag  = agregarFilaOtTag;
window.eliminarFilaOtTag = eliminarFilaOtTag;
window.descargarZipPdf   = descargarZipPdf;
window.descargarZipExcel = descargarZipExcel;
window.toggleFavorito             = toggleFavorito;
window.renderReporteParada        = renderReporteParada;
window.descargarExcelReporteParada = descargarExcelReporteParada;
window.cambiarFiltroReporte       = cambiarFiltroReporte;

/* ── escapeHtml se define en js/utils.js (cargado antes que este módulo) ── */
