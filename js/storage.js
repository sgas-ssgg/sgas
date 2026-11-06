/* ================================================================
   SGAS — storage.js
   Abstracción automática:
   - Modo RED:   detecta servidor → usa API REST
   - Modo LOCAL: sin servidor     → usa IndexedDB
   ================================================================ */

const Storage = (() => {

  /* ── Configuración ── */
  // Cambiá esta URL por la URL de tu servidor en Render
  const SERVER_URL = 'https://sgas-server.onrender.com';

  /* ── ADVERTENCIA DE SEGURIDAD ──────────────────────────────────────
     La API Key está expuesta aquí porque este archivo es público
     (GitHub Pages). Cualquier persona puede verla en el código fuente.

     RIESGO: Alguien con esta clave puede leer, crear o borrar datos
     llamando directamente a la API desde fuera de la app.

     SOLUCIONES RECOMENDADAS (de menor a mayor complejidad):
       1. MÍNIMA: Cambiá la clave periódicamente en Render
          (Settings → Environment Variables → API_KEY) y actualizá
          este archivo. Esto limita la ventana de exposición.
       2. MEJOR: Implementar autenticación de usuarios (login/password)
          en el servidor y reemplazar la API Key estática por tokens
          de sesión por usuario.
       3. IDEAL: Mover el servidor a una arquitectura donde el frontend
          no necesite claves, usando sesiones del lado del servidor
          (ej. cookie httpOnly).
  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── */
  // API Key — debe coincidir con la variable de entorno API_KEY en Render
  const API_KEY = 'sgas-2024-clave-segura';

  let modoRed = false;
  let db      = null;  // IndexedDB (modo local)

  /* ================================================================
     DETECCIÓN AUTOMÁTICA DE MODO
     ================================================================ */
  // Promesa que se resuelve cuando el usuario hace clic en "Usar sin conexión"
  let _resolverModoLocal = null;

  async function init() {
    mostrarEstadoConexion('conectando');
    try {
      // Timeout de 12s — si el servidor no responde, caer a modo local.
      // El usuario puede acelerar esto con el botón "Usar sin conexión".
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      // Carrera: fetch contra el botón "Usar sin conexión"
      const saltarPromesa = new Promise(res => { _resolverModoLocal = res; });
      const resultado = await Promise.race([
        fetch(`${SERVER_URL}/api/ping`, { signal: controller.signal })
          .then(r => ({ tipo: 'fetch', res: r }))
          .catch(() => ({ tipo: 'error' })),
        saltarPromesa.then(() => ({ tipo: 'saltar' })),
      ]);
      clearTimeout(timer);
      _resolverModoLocal = null;

      if (resultado.tipo === 'fetch' && resultado.res?.ok) {
        modoRed = true;
        mostrarEstadoConexion('red');
        console.log('SGAS: Modo RED activo →', SERVER_URL);
        return;
      }
    } catch(e) {
      // Servidor no disponible o timeout — usar local
    }
    await initIndexedDB();
    mostrarEstadoConexion('local');
    console.log('SGAS: Modo LOCAL activo (IndexedDB)');
  }

  async function reconectar() {
    mostrarEstadoConexion('conectando');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${SERVER_URL}/api/ping`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        modoRed = true;
        mostrarEstadoConexion('red');
        console.log('SGAS: Reconectado → Modo RED');
        return true;
      }
    } catch(e) {}
    mostrarEstadoConexion('local');
    return false;
  }

  // Permite al usuario saltar la espera y entrar en modo local inmediatamente
  function usarSinConexion() {
    if (_resolverModoLocal) _resolverModoLocal();
  }

  function mostrarEstadoConexion(estado) {
    const el = document.getElementById('conn-status');
    if (!el) return;
    if (estado === 'conectando') {
      el.innerHTML = `<span class="conn-dot conn-waiting"></span> Conectando al servidor...
        &nbsp;<button onclick="Storage.usarSinConexion()" class="conn-retry" title="Entrar sin esperar al servidor">Usar sin conexión</button>`;
      el.style.display = 'flex';
    } else if (estado === 'red') {
      el.innerHTML = `<span class="conn-dot conn-ok"></span> En línea`;
      el.style.display = 'flex';
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    } else if (estado === 'local') {
      el.innerHTML = `<span class="conn-dot conn-off"></span> Sin servidor — datos locales &nbsp;
        <button onclick="intentarReconectar()" class="conn-retry">🔄 Reconectar</button>`;
      el.style.display = 'flex';
    }
  }

  function getModo() { return modoRed ? 'red' : 'local'; }

  /* ================================================================
     FETCH HELPER (modo red)
     ================================================================ */
  async function apiFetch(path, options = {}) {
    let res;
    try {
      res = await fetch(`${SERVER_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch(e) {
      // Error de red: sin conexión, timeout, servidor caído
      throw new Error('RED: No se pudo conectar con el servidor. Verificá tu conexión.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      if (res.status === 401) throw new Error('AUTH: Sin autorización para realizar esta acción.');
      if (res.status === 404) throw new Error('NOTFOUND: El registro no fue encontrado.');
      if (res.status === 400) throw new Error(`VALIDACION: ${err.error || 'Datos inválidos.'}`);
      throw new Error(`SERVER: Error del servidor (${res.status}): ${err.error || res.statusText}`);
    }
    return res.json();
  }

  /* ── Clasificar mensaje de error para mostrar al usuario ── */
  function mensajeError(e) {
    const msg = e?.message || '';
    if (msg.startsWith('RED:'))        return { texto: 'Sin conexión con el servidor. Verificá tu red.', tipo: 'red' };
    if (msg.startsWith('AUTH:'))       return { texto: 'Sin autorización. Recargá la página.', tipo: 'auth' };
    if (msg.startsWith('NOTFOUND:'))   return { texto: 'El registro no existe o fue eliminado.', tipo: 'notfound' };
    if (msg.startsWith('VALIDACION:')) return { texto: msg.replace('VALIDACION: ', ''), tipo: 'validacion' };
    if (msg.startsWith('SERVER:'))     return { texto: 'Error en el servidor. Intentá de nuevo en unos segundos.', tipo: 'server' };
    return { texto: 'Ocurrió un error inesperado. Intentá de nuevo.', tipo: 'desconocido' };
  }

  /* ================================================================
     INDEXEDDB (modo local)
     ================================================================ */
  const DB_NAME    = 'SGAS_DB';
  const DB_VERSION = 3;

  function initIndexedDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains('ats')) {
          const s = database.createObjectStore('ats', { keyPath: 'id', autoIncrement: true });
          s.createIndex('categoria', 'categoria', { unique: false });
        }
        if (!database.objectStoreNames.contains('emergencias'))
          database.createObjectStore('emergencias', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('documentos'))
          database.createObjectStore('documentos', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('config'))
          database.createObjectStore('config', { keyPath: 'key' });
        if (!database.objectStoreNames.contains('categorias'))
          database.createObjectStore('categorias', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('sheets'))
          database.createObjectStore('sheets', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('checklists'))
          database.createObjectStore('checklists', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  function idbStore(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
  }
  function idbGetAll(storeName) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbGet(storeName, id) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName).get(id);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbGetByIndex(storeName, indexName, value) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName).index(indexName).getAll(value);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbSave(storeName, record) {
    return new Promise((res, rej) => {
      const store = idbStore(storeName, 'readwrite');
      const r     = record.id ? store.put(record) : store.add(record);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbRemove(storeName, id) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName, 'readwrite').delete(id);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  /* ================================================================
     API PÚBLICA — ATS
     ================================================================ */
  const ATS = {
    getAll: async (tipo = 'ats') => {
      if (modoRed) {
        let page = 1, all = [];
        while (true) {
          const resp = await apiFetch(`/api/ats?page=${page}&limit=50&tipo=${tipo}`);
          all = all.concat(resp.data);
          if (page >= resp.pages || page >= 100) break;
          page++;
        }
        return all;
      }
      const rows = await idbGetAll('ats');
      return rows.filter(r => (r.tipo || 'ats') === tipo);
    },
    getByCategoria: async (cat, tipo = 'ats') => {
      if (modoRed) {
        let page = 1, all = [];
        while (true) {
          const resp = await apiFetch(`/api/ats?categoria=${encodeURIComponent(cat)}&tipo=${tipo}&page=${page}&limit=50`);
          all = all.concat(resp.data);
          if (page >= resp.pages || page >= 100) break;
          page++;
        }
        return all;
      }
      const rows = await idbGetByIndex('ats', 'categoria', cat);
      return rows.filter(r => (r.tipo || 'ats') === tipo);
    },
    getById: async (id) => {
      if (modoRed) return apiFetch(`/api/ats/${id}`);
      return idbGet('ats', id);
    },
    save: async (record) => {
      if (!record.tipo) record.tipo = 'ats';
      if (modoRed) {
        if (record.id) {
          const r = await apiFetch(`/api/ats/${record.id}`, { method: 'PUT', body: record });
          return r.id;
        } else {
          const r = await apiFetch('/api/ats', { method: 'POST', body: record });
          record.id = r.id;
          return r.id;
        }
      }
      return idbSave('ats', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/ats/${id}`, { method: 'DELETE' });
      return idbRemove('ats', id);
    },
    toggleFavorito: async (id) => {
      if (modoRed) return apiFetch(`/api/ats/${id}/favorito`, { method: 'PATCH' });
      // Modo local: toggle manual
      const ficha = await idbGet('ats', id);
      if (!ficha) return;
      ficha.favorito = !ficha.favorito;
      await idbSave('ats', ficha);
      return { id, favorito: ficha.favorito };
    },
    getReporteParada: async () => {
      if (modoRed) return apiFetch('/api/ats/reporte/parada');
      // Modo local: traer todas las de tipo parada
      const rows = await idbGetAll('ats');
      return rows
        .filter(r => (r.tipo || 'ats') === 'parada')
        .map(r => ({
          ...r,
          ot_tags:  r.ot_tags  || [],
          codigo:   r.codigo   || '',
          favorito: r.favorito || false,
          esNuevo:  r.created_at && r.updated_at
            ? Math.abs(new Date(r.updated_at) - new Date(r.created_at)) < 60000
            : true,
        }))
        .sort((a, b) => (a.categoria || '').localeCompare(b.categoria || ''));
    },
  };

  /* ================================================================
     API PÚBLICA — EMERGENCIAS
     ================================================================ */
  const Emergencias = {
    getAll: async (page = 1, limit = 20) => {
      if (modoRed) {
        const resp = await apiFetch(`/api/emergencias?page=${page}&limit=${limit}`);
        return resp; // { data, total, page, limit, pages }
      }
      const rows = await idbGetAll('emergencias');
      const total = rows.length;
      const start = (page - 1) * limit;
      return { data: rows.slice(start, start + limit), total, page, limit, pages: Math.ceil(total / limit) };
    },
    getById: async (id) => {
      if (modoRed) return apiFetch(`/api/emergencias/${id}`);
      return idbGet('emergencias', id);
    },
    save: async (record) => {
      if (modoRed) {
        if (record.id) {
          const r = await apiFetch(`/api/emergencias/${record.id}`, { method: 'PUT', body: record });
          return r.id;
        } else {
          const r = await apiFetch('/api/emergencias', { method: 'POST', body: record });
          record.id = r.id;
          return r.id;
        }
      }
      return idbSave('emergencias', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/emergencias/${id}`, { method: 'DELETE' });
      return idbRemove('emergencias', id);
    },
  };

  /* ================================================================
     API PÚBLICA — DOCUMENTOS
     ================================================================ */
  const Documentos = {
    getAll: async (page = 1, limit = 20) => {
      if (modoRed) {
        const resp = await apiFetch(`/api/documentos?page=${page}&limit=${limit}`);
        return resp; // { data, total, page, limit, pages }
      }
      const rows = await idbGetAll('documentos');
      const total = rows.length;
      const sorted = [...rows].sort((a, b) => b.id - a.id);
      const start = (page - 1) * limit;
      return { data: sorted.slice(start, start + limit), total, page, limit, pages: Math.ceil(total / limit) };
    },
    getById: async (id) => {
      if (modoRed) return apiFetch(`/api/documentos/${id}`);
      return idbGet('documentos', id);
    },
    save: async (record) => {
      if (modoRed) {
        const r = await apiFetch('/api/documentos', { method: 'POST', body: record });
        record.id = r.id;
        return r.id;
      }
      return idbSave('documentos', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/documentos/${id}`, { method: 'DELETE' });
      return idbRemove('documentos', id);
    },
  };

  /* ================================================================
     API PÚBLICA — CONFIG
     ================================================================ */
  const Config = {
    getAll: async () => {
      if (modoRed) return apiFetch('/api/config');
      return idbGetAll('config');
    },
    get: async (key) => {
      if (modoRed) {
        const all = await apiFetch('/api/config');
        return all.find(c => c.key === key) || null;
      }
      return idbGet('config', key);
    },
    set: async (key, value) => {
      if (modoRed) return apiFetch('/api/config', { method: 'POST', body: { key, value } });
      return idbSave('config', { key, value });
    },
    // Guarda todas las claves en un solo request (bulk)
    setBulk: async (entries) => {
      // entries: [{ key, value }, ...]
      if (modoRed) return apiFetch('/api/config/bulk', { method: 'POST', body: entries });
      // Modo local: guardar cada clave en IndexedDB en paralelo
      return Promise.all(entries.map(e => idbSave('config', { key: e.key, value: e.value })));
    },
  };

  /* ================================================================
     API PÚBLICA — CATEGORÍAS
     ================================================================ */
  const Categorias = {
    getAll: async (tipo = 'ats') => {
      if (modoRed) return apiFetch(`/api/categorias?tipo=${tipo}`);
      const rows = await idbGetAll('categorias');
      return rows.filter(r => (r.tipo || 'ats') === tipo);
    },
    save: async (record) => {
      if (!record.tipo) record.tipo = 'ats';
      if (modoRed) {
        if (record.id) {
          return apiFetch(`/api/categorias/${record.id}`, { method: 'PUT', body: record });
        } else {
          const r = await apiFetch('/api/categorias', { method: 'POST', body: record });
          record.id = r.id;
          return r.id;
        }
      }
      return idbSave('categorias', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/categorias/${id}`, { method: 'DELETE' });
      return idbRemove('categorias', id);
    },
  };

  /* ================================================================
     API PÚBLICA — SHEETS (Google Sheets links)
     ================================================================ */
  const Sheets = {
    getAll: async (page = 1, limit = 20) => {
      if (modoRed) {
        const resp = await apiFetch(`/api/sheets?page=${page}&limit=${limit}`);
        return resp; // { data, total, page, limit, pages }
      }
      const rows = await idbGetAll('sheets');
      const total = rows.length;
      const start = (page - 1) * limit;
      return { data: rows.slice(start, start + limit), total, page, limit, pages: Math.ceil(total / limit) };
    },
    save: async (record) => {
      if (modoRed) {
        const r = await apiFetch('/api/sheets', { method: 'POST', body: record });
        record.id = r.id;
        return r.id;
      }
      return idbSave('sheets', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/sheets/${id}`, { method: 'DELETE' });
      return idbRemove('sheets', id);
    },
  };

  /* ================================================================
     API PÚBLICA — CHECKLISTS
     ================================================================ */
  const Checklists = {
    getAll: async () => {
      if (modoRed) return apiFetch('/api/checklists');
      return idbGetAll('checklists');
    },
    getByCategoria: async (cat) => {
      if (modoRed) return apiFetch(`/api/checklists?categoria=${encodeURIComponent(cat)}`);
      const rows = await idbGetAll('checklists');
      return rows.filter(r => (r.categoria || 'General') === cat);
    },
    countByCategoria: async () => {
      if (modoRed) return apiFetch('/api/checklists/count-by-categoria');
      // Modo local: contar desde IndexedDB
      const rows = await idbGetAll('checklists');
      const counts = {};
      rows.forEach(r => {
        const cat = r.categoria || 'General';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      return counts;
    },
    getById: async (id) => {
      if (modoRed) return apiFetch(`/api/checklists/${id}`);
      return idbGet('checklists', id);
    },
    save: async (record) => {
      if (!record.categoria) record.categoria = 'General';
      if (modoRed) {
        const r = await apiFetch('/api/checklists', { method: 'POST', body: record });
        record.id = r.id;
        return r.id;
      }
      return idbSave('checklists', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/checklists/${id}`, { method: 'DELETE' });
      return idbRemove('checklists', id);
    },
  };

  return { init, reconectar, usarSinConexion, getModo, mensajeError, ATS, Emergencias, Documentos, Config, Categorias, Sheets, Checklists };

})();
