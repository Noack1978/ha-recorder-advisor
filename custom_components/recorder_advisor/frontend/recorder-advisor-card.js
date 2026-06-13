/**
 * Recorder Advisor Card v1.1.0
 */
const DOMAIN = "recorder_advisor";
const CARD_VERSION = "1.1.0";

const REC = {
  exclude_strongly:    { label: "⛔ Dringend ausschließen", color: "#db4437" },
  exclude_recommended: { label: "🔴 Empfohlen",             color: "#e65100" },
  exclude_consider:    { label: "🟡 Erwägen",               color: "#f9a825" },
  ok:                  { label: "✅ OK",                     color: "#4caf50" },
  critical_keep:       { label: "🔒 Kritisch – behalten",   color: "#1565c0" },
};

const CSS = `
  :host { display: block; }
  ha-card { padding: 0; overflow: hidden; }
  .loading-bar { height: 3px; overflow: hidden; background: var(--primary-color); animation: slide 1.2s ease-in-out infinite; }
  @keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }
  .header { display:flex; align-items:center; justify-content:space-between; padding:16px 16px 8px; border-bottom:1px solid var(--divider-color); flex-wrap:wrap; gap:8px; }
  .title { font-size:1.1em; font-weight:600; color:var(--primary-text-color); }
  .stats { display:flex; gap:8px; padding:8px 16px; border-bottom:1px solid var(--divider-color); flex-wrap:wrap; }
  .chip { font-size:0.78em; padding:3px 10px; border-radius:12px; font-weight:600; }
  .chip-total  { background:var(--secondary-background-color); color:var(--secondary-text-color); }
  .chip-red    { background:rgba(219,68,55,.12); color:#db4437; }
  .chip-orange { background:rgba(230,81,0,.12);  color:#e65100; }
  .tabs { display:flex; border-bottom:1px solid var(--divider-color); }
  .tab { flex:1; padding:10px 8px; text-align:center; cursor:pointer; font-size:.88em; font-weight:500; color:var(--secondary-text-color); border-bottom:2px solid transparent; user-select:none; }
  .tab.active { color:var(--primary-color); border-bottom-color:var(--primary-color); }
  .tab:hover:not(.active) { background:var(--secondary-background-color); }
  .toolbar { display:flex; gap:8px; padding:8px 16px; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--divider-color); }
  .toolbar input[type=text] { flex:1; min-width:100px; border:1px solid var(--divider-color); border-radius:4px; padding:6px 10px; background:var(--card-background-color); color:var(--primary-text-color); font-size:.9em; }
  .toolbar select { border:1px solid var(--divider-color); border-radius:4px; padding:6px; background:var(--card-background-color); color:var(--primary-text-color); font-size:.85em; }
  .action-bar { display:flex; gap:8px; padding:8px 16px; border-bottom:1px solid var(--divider-color); flex-wrap:wrap; align-items:center; }
  .info { font-size:.82em; color:var(--secondary-text-color); flex:1; }
  button { padding:6px 14px; border-radius:4px; border:none; cursor:pointer; font-size:.82em; font-weight:500; }
  button:disabled { opacity:.4; cursor:default; }
  .btn-primary   { background:var(--primary-color); color:white; }
  .btn-success   { background:#4caf50; color:white; }
  .btn-secondary { background:var(--secondary-background-color); color:var(--primary-text-color); border:1px solid var(--divider-color); }
  .btn-copy      { background:#1565c0; color:white; }
  .btn-ignore    { background:#4fc3f7; color:white; }
  .btn-unignore  { background:#4caf50; color:white; }
  .sel-all { display:flex; align-items:center; gap:8px; padding:8px 16px; border-bottom:1px solid var(--divider-color); font-size:.82em; color:var(--secondary-text-color); cursor:pointer; user-select:none; }
  .sel-all:hover { background:var(--secondary-background-color); }
  .quick { display:flex; gap:6px; flex-wrap:wrap; padding:4px 16px 8px; border-bottom:1px solid var(--divider-color); }
  .quick span { font-size:.78em; color:var(--secondary-text-color); align-self:center; }
  .quick button { font-size:.75em; padding:3px 9px; }
  .list { max-height:500px; overflow-y:auto; }
  .row { display:flex; align-items:flex-start; padding:10px 16px; border-bottom:1px solid var(--divider-color); gap:12px; cursor:pointer; }
  .row:hover { background:var(--secondary-background-color); }
  .row.sel { background:rgba(var(--rgb-primary-color,3,169,244),.08); }
  .row.crit { opacity:.6; cursor:default; }
  .row input { margin-top:2px; cursor:pointer; width:16px; height:16px; flex-shrink:0; }
  .entity-info { flex:1; min-width:0; }
  .eid { font-size:.8em; font-family:monospace; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .meta { display:flex; gap:6px; margin-top:4px; align-items:center; flex-wrap:wrap; }
  .tag { font-size:.72em; padding:2px 7px; border-radius:10px; font-weight:500; }
  .tag-domain { background:var(--secondary-background-color); color:var(--secondary-text-color); border:1px solid var(--divider-color); }
  .changes { text-align:right; font-size:.85em; color:var(--secondary-text-color); min-width:65px; }
  .changes .num { font-weight:700; font-size:1em; color:var(--primary-text-color); }
  .changes .unit { font-size:.72em; }
  .msg { margin:8px 16px; padding:10px 14px; border-radius:6px; font-size:.88em; }
  .msg.error   { background:rgba(219,68,55,.12);  color:#db4437; }
  .msg.success { background:rgba(76,175,80,.12);   color:#4caf50; }
  .msg.warning { background:rgba(255,152,0,.12);   color:#ff9800; }
  .empty { padding:32px 16px; text-align:center; color:var(--secondary-text-color); font-size:.9em; }
  .yaml-panel { padding:16px; }
  .yaml-panel h3 { margin:0 0 8px; font-size:.95em; }
  .yaml-panel p  { font-size:.82em; color:var(--secondary-text-color); margin:0 0 12px; }
  pre { background:var(--secondary-background-color); border-radius:6px; padding:12px; font-size:.8em; overflow-x:auto; white-space:pre; font-family:monospace; border:1px solid var(--divider-color); max-height:400px; overflow-y:auto; cursor:text; user-select:all; }
  .yaml-actions { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
  .ign-row { display:flex; align-items:center; padding:10px 16px; border-bottom:1px solid var(--divider-color); gap:12px; cursor:pointer; }
  .ign-row:hover { background:var(--secondary-background-color); }
  .ign-row.sel { background:rgba(var(--rgb-primary-color,3,169,244),.08); }
  .ign-row input { cursor:pointer; width:16px; height:16px; flex-shrink:0; }
  .ign-id { font-size:.82em; font-family:monospace; color:var(--primary-text-color); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ign-dom { font-size:.72em; padding:2px 7px; border-radius:10px; background:rgba(158,158,158,.15); color:#757575; font-weight:500; }
`;

class RecorderAdvisorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._entities = [];
    this._ignored = [];
    this._selected = new Set();
    this._selIgnored = new Set();
    this._filter = "";
    this._filterRec = "all";
    this._sortBy = "changes_per_day";
    this._tab = "list";
    this._loading = false;
    this._message = null;
    this._yaml = null;
    this._applied = [];
    this._selApplied = new Set();
    this._initialized = false;
    this._activeSearchId = null;
  }

  setConfig(config) { this._config = config || {}; }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._render(); // initial render only
      this._subscribe();
      this._load();
    }
    // Do NOT re-render on every hass update — only event callbacks trigger render
  }

  _subscribe() {
    try {
      this._hass.connection.subscribeEvents((ev) => {
        this._entities = ev.data.entities || [];
        this._ignored  = ev.data.ignored  || [];
        this._applied  = ev.data.applied  || [];
        this._loading  = false;
        this._render();
      }, `${DOMAIN}_results`);
      this._hass.connection.subscribeEvents((ev) => {
        this._yaml = ev.data.yaml || "";
        this._tab  = "yaml";
        this._render();
      }, `${DOMAIN}_yaml`);
    } catch (e) {
      console.warn("recorder-advisor-card: subscribe failed", e);
    }
  }

  async _load() {
    this._loading = true;
    this._render();
    try {
      await this._hass.callService(DOMAIN, "get_results", {});
    } catch (e) {
      this._message = { type: "error", text: "Fehler: " + e.message };
      this._loading = false;
      this._render();
      return;
    }
    setTimeout(async () => {
      if (!this._entities.length && !this._loading) {
        try { await this._hass.callService(DOMAIN, "get_results", {}); } catch (_) {}
      }
    }, 3000);
  }

  async _reanalyze() {
    this._loading = true; this._message = null; this._yaml = null; this._render();
    try { await this._hass.callService(DOMAIN, "reanalyze", {}); }
    catch (e) { this._message = { type: "error", text: e.message }; this._loading = false; this._render(); }
  }

  async _generateYaml() {
    if (!this._selected.size) { this._message = { type: "warning", text: "Keine Entitäten ausgewählt." }; this._render(); return; }
    try { await this._hass.callService(DOMAIN, "generate_yaml", { entity_ids: [...this._selected] }); }
    catch (e) { this._message = { type: "error", text: e.message }; this._render(); }
  }

  async _markApplied() {
    if (!this._selected.size) return;
    try {
      await this._hass.callService(DOMAIN, "mark_applied", { entity_ids: [...this._selected] });
      this._message = { type: "success", text: `${this._selected.size} Entitaet(en) als angewendet markiert.` };
      this._selected.clear(); this._render();
    } catch (e) { this._message = { type: "error", text: e.message }; this._render(); }
  }

  async _ignore() {
    if (!this._selected.size) { this._message = { type: "warning", text: "Keine Entitaeten ausgewaehlt." }; this._render(); return; }
    let ok = 0;
    for (const eid of this._selected) {
      try { await this._hass.callService(DOMAIN, "ignore_entity", { entity_id: eid }); ok++; } catch (_) {}
    }
    this._selected.clear();
    this._message = { type: "success", text: `${ok} Entitaet(en) ignoriert.` };
  }

  async _unignore() {
    if (!this._selIgnored.size) return;
    let ok = 0;
    for (const eid of this._selIgnored) {
      try { await this._hass.callService(DOMAIN, "unignore_entity", { entity_id: eid }); ok++; } catch (_) {}
    }
    this._selIgnored.clear();
    this._message = { type: "success", text: `${ok} Entitaet(en) wieder analysiert.` };
  }

  async _unmarkApplied() {
    if (!this._selApplied.size) return;
    this._loading = true; this._render();
    try {
      await this._hass.callService(DOMAIN, "unmark_applied", { entity_ids: [...this._selApplied] });
      this._message = { type: "success", text: `${this._selApplied.size} Entitaet(en) wieder in Analyse aufgenommen.` };
      this._selApplied.clear();
    } catch (e) {
      this._message = { type: "error", text: e.message };
      this._loading = false; this._render();
    }
  }

  _copyYaml() {
    if (!this._yaml) return;
    const text = this._yaml;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { this._message = { type: "success", text: "YAML kopiert!" }; this._render(); })
        .catch(() => this._copyFallback(text));
    } else {
      this._copyFallback(text);
    }
  }

  _copyFallback(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      this._message = ok
        ? { type: "success", text: "YAML kopiert!" }
        : { type: "warning", text: "Bitte Text manuell markieren und kopieren." };
    } catch (_) {
      this._message = { type: "warning", text: "Bitte Text manuell markieren und kopieren." };
    }
    this._render();
  }

  _filtered() {
    const f = this._filter.toLowerCase();
    return this._entities
      .filter(e => {
        if (f && !e.entity_id.toLowerCase().includes(f) && !e.domain.toLowerCase().includes(f)) return false;
        if (this._filterRec !== "all" && e.recommendation !== this._filterRec) return false;
        return true;
      })
      .sort((a, b) => {
        if (this._sortBy === "changes_per_day") return b.changes_per_day - a.changes_per_day;
        if (this._sortBy === "domain") return a.domain.localeCompare(b.domain);
        return a.entity_id.localeCompare(b.entity_id);
      });
  }

  _filteredApplied() {
    const f = this._filter.toLowerCase();
    return this._applied.filter(id => !f || id.toLowerCase().includes(f)).sort();
  }

  _selAllApplied() {
    const f = this._filteredApplied();
    if (this._selApplied.size >= f.length) this._selApplied.clear();
    else f.forEach(id => this._selApplied.add(id));
    this._render();
  }

  _toggleApp(id) { this._selApplied.has(id) ? this._selApplied.delete(id) : this._selApplied.add(id); this._render(); }

  _filteredIgnored() {
    const f = this._filter.toLowerCase();
    return this._ignored.filter(id => !f || id.toLowerCase().includes(f)).sort();
  }

  _selAll() {
    const f = this._filtered().filter(e => !e.is_critical);
    if (this._selected.size >= f.length) this._selected.clear();
    else f.forEach(e => this._selected.add(e.entity_id));
    this._render();
  }

  _selAllIgnored() {
    const f = this._filteredIgnored();
    if (this._selIgnored.size >= f.length) this._selIgnored.clear();
    else f.forEach(id => this._selIgnored.add(id));
    this._render();
  }

  _toggle(id) { this._selected.has(id) ? this._selected.delete(id) : this._selected.add(id); this._render(); }
  _toggleIgn(id) { this._selIgnored.has(id) ? this._selIgnored.delete(id) : this._selIgnored.add(id); this._render(); }
  _selectRec(rec) { this._filtered().filter(e => e.recommendation === rec).forEach(e => this._selected.add(e.entity_id)); this._render(); }
  _esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  _render() {
    if (!this.shadowRoot) return;
    const filtered  = this._filtered();
    const filtIgn   = this._filteredIgnored();
    const selable   = filtered.filter(e => !e.is_critical);
    const allSel    = selable.length > 0 && this._selected.size >= selable.length;
    const allSelI   = filtIgn.length  > 0 && this._selIgnored.size >= filtIgn.length;
    const strongly    = this._entities.filter(e => e.recommendation === "exclude_strongly").length;
    const recommended = this._entities.filter(e => e.recommendation === "exclude_recommended").length;

    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <ha-card>
        ${this._loading ? '<div class="loading-bar"></div>' : ""}
        <div class="header">
          <div class="title">📊 Recorder Advisor</div>
          <button class="btn-primary" id="btn-ra">🔄 Neu analysieren</button>
        </div>
        <div class="stats">
          <span class="chip chip-total">Gesamt: ${this._entities.length}</span>
          ${strongly    > 0 ? `<span class="chip chip-red">⛔ Dringend: ${strongly}</span>` : ""}
          ${recommended > 0 ? `<span class="chip chip-orange">🔴 Empfohlen: ${recommended}</span>` : ""}
        </div>
        <div class="tabs">
          <div class="tab ${this._tab==="list"    ? "active" : ""}" id="tab-list">📋 Entitäten (${this._entities.length})</div>
          <div class="tab ${this._tab==="yaml"    ? "active" : ""}" id="tab-yaml">📄 YAML</div>
          <div class="tab ${this._tab==="ignored" ? "active" : ""}" id="tab-ign">👁 Ignoriert (${this._ignored.length})</div>
          <div class="tab ${this._tab==="applied" ? "active" : ""}" id="tab-app">✅ Angewendet (${this._applied.length})</div>
        </div>
        ${this._message ? `<div class="msg ${this._message.type}">${this._message.text}</div>` : ""}
        ${this._tab === "list"    ? this._renderList(filtered, selable, allSel) : ""}
        ${this._tab === "yaml"    ? this._renderYaml() : ""}
        ${this._tab === "ignored" ? this._renderIgnored(filtIgn, allSelI) : ""}
        ${this._tab === "applied" ? this._renderApplied() : ""}
      </ha-card>
    `;
    this._wire();
    // Restore focus to search field if it was active before render
    if (this._activeSearchId) {
      const el = this.shadowRoot.getElementById(this._activeSearchId);
      if (el) {
        el.focus();
        // Restore cursor position at end
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }

  _renderList(filtered, selable, allSel) {
    return `
      <div class="toolbar">
        <input type="text" id="s-search" placeholder="Suchen... (Enter)" value="${this._filter}">
        <select id="s-rec">
          <option value="all"                 ${this._filterRec==="all"                 ? "selected" : ""}>Alle</option>
          <option value="exclude_strongly"    ${this._filterRec==="exclude_strongly"    ? "selected" : ""}>⛔ Dringend</option>
          <option value="exclude_recommended" ${this._filterRec==="exclude_recommended" ? "selected" : ""}>🔴 Empfohlen</option>
          <option value="exclude_consider"    ${this._filterRec==="exclude_consider"    ? "selected" : ""}>🟡 Erwaegen</option>
          <option value="ok"                  ${this._filterRec==="ok"                  ? "selected" : ""}>✅ OK</option>
          <option value="critical_keep"       ${this._filterRec==="critical_keep"       ? "selected" : ""}>🔒 Kritisch</option>
        </select>
        <select id="s-sort">
          <option value="changes_per_day" ${this._sortBy==="changes_per_day" ? "selected" : ""}>Aend./Tag</option>
          <option value="domain"          ${this._sortBy==="domain"          ? "selected" : ""}>Domain</option>
          <option value="entity_id"       ${this._sortBy==="entity_id"       ? "selected" : ""}>ID</option>
        </select>
      </div>
      <div class="action-bar">
        <span class="info">${this._selected.size} ausgewaehlt</span>
        <button class="btn-primary" id="btn-yaml"    ${!this._selected.size ? "disabled" : ""}>📄 YAML</button>
        <button class="btn-success" id="btn-applied" ${!this._selected.size ? "disabled" : ""}>✅ Angewendet</button>
        <button class="btn-ignore"  id="btn-ign"     ${!this._selected.size ? "disabled" : ""}>👁 Ignorieren</button>
      </div>
      <div class="quick">
        <span>Schnellauswahl:</span>
        <button class="btn-secondary" id="qs-strong">⛔ Alle dringend</button>
        <button class="btn-secondary" id="qs-rec">🔴 Alle empfohlen</button>
      </div>
      <div class="sel-all" id="sel-all">
        <input type="checkbox" ${allSel ? "checked" : ""}> Alle (${selable.length})
      </div>
      <div class="list">
        ${!filtered.length
          ? `<div class="empty">${this._loading ? "Lade..." : this._entities.length ? "Keine Treffer." : "Noch keine Analyse. Bitte 'Neu analysieren' klicken."}</div>`
          : filtered.map(e => {
              const sel = this._selected.has(e.entity_id);
              const rec = REC[e.recommendation] || { label: e.recommendation, color: "#888" };
              return `<div class="row${sel ? " sel" : ""}${e.is_critical ? " crit" : ""}" data-id="${e.entity_id}">
                <input type="checkbox" data-cb="${e.entity_id}" ${sel ? "checked" : ""} ${e.is_critical ? "disabled" : ""}>
                <div class="entity-info">
                  <div class="eid">${e.entity_id}</div>
                  <div class="meta">
                    <span class="tag tag-domain">${e.domain}</span>
                    <span class="tag" style="background:${rec.color}22;color:${rec.color}">${rec.label}</span>
                  </div>
                </div>
                <div class="changes"><div class="num">${e.changes_per_day}</div><div class="unit">Aend./Tag</div></div>
              </div>`;
            }).join("")
        }
      </div>
    `;
  }

  _renderYaml() {
    if (!this._yaml) return `<div class="yaml-panel"><div class="empty">📄 Noch kein YAML generiert.<br><small>Entitaeten auswaehlen und auf 📄 YAML klicken.</small></div></div>`;
    return `
      <div class="yaml-panel">
        <h3>📄 recorder.yaml Ausschluesse</h3>
        <p>In deine <code>recorder.yaml</code> unter <code>exclude:</code> einfuegen:</p>
        <pre id="yaml-code">${this._esc(this._yaml)}</pre>
        <div class="yaml-actions">
          <button class="btn-copy"      id="btn-copy">📋 Kopieren</button>
          <button class="btn-success"   id="btn-applied2" ${!this._selected.size ? "disabled" : ""}>✅ Als angewendet</button>
          <button class="btn-secondary" id="btn-back">← Zurueck</button>
        </div>
      </div>
    `;
  }

  _renderIgnored(filtIgn, allSelI) {
    return `
      <div class="toolbar">
        <input type="text" id="s-ign" placeholder="Suchen... (Enter)" value="${this._filter}">
      </div>
      <div class="action-bar">
        <span class="info">${this._selIgnored.size} von ${filtIgn.length} ausgewaehlt</span>
        <button class="btn-unignore" id="btn-unign" ${!this._selIgnored.size ? "disabled" : ""}>↩ Wieder analysieren</button>
      </div>
      <div class="sel-all" id="sel-all-ign">
        <input type="checkbox" ${allSelI ? "checked" : ""}> Alle (${filtIgn.length})
      </div>
      <div class="list">
        ${!filtIgn.length
          ? `<div class="empty">${this._ignored.length ? "Keine Treffer." : "Keine ignorierten Entitaeten."}</div>`
          : filtIgn.map(id => {
              const sel = this._selIgnored.has(id);
              return `<div class="ign-row${sel ? " sel" : ""}" data-ign="${id}">
                <input type="checkbox" data-icb="${id}" ${sel ? "checked" : ""}>
                <span class="ign-id">${id}</span>
                <span class="ign-dom">${id.split(".")[0]}</span>
              </div>`;
            }).join("")
        }
      </div>
    `;
  }

  _renderApplied() {
    const filtApp = this._filteredApplied();
    const allSelA = filtApp.length > 0 && this._selApplied.size >= filtApp.length;
    return `
      <div class="toolbar">
        <input type="text" id="s-app" placeholder="Suchen... (Enter)" value="${this._filter}">
      </div>
      <div class="action-bar">
        <span class="info">${this._selApplied.size} von ${filtApp.length} ausgewaehlt</span>
        <button class="btn-secondary" id="btn-unapp" ${!this._selApplied.size ? "disabled" : ""}>↩ Wieder analysieren</button>
      </div>
      <div class="sel-all" id="sel-all-app">
        <input type="checkbox" ${allSelA ? "checked" : ""}> Alle (${filtApp.length})
      </div>
      <div class="list">
        ${!filtApp.length
          ? '<div class="empty">Keine angewendeten Ausschluesse gespeichert.</div>'
          : filtApp.map(id => {
              const sel = this._selApplied.has(id);
              return `<div class="ign-row${sel ? " sel" : ""}" data-app="${id}">
                <input type="checkbox" data-acb="${id}" ${sel ? "checked" : ""}>
                <span class="ign-id">${id}</span>
                <span class="ign-dom">${id.split(".")[0]}</span>
              </div>`;
            }).join("")
        }
      </div>
    `;
  }

  _wire() {
    const r = this.shadowRoot;
    r.getElementById("btn-ra")      ?.addEventListener("click", () => this._reanalyze());
    r.getElementById("tab-list")    ?.addEventListener("click", () => { this._tab="list";    this._filter=""; this._selected.clear();    this._render(); });
    r.getElementById("tab-yaml")    ?.addEventListener("click", () => { this._tab="yaml";    this._render(); });
    r.getElementById("tab-ign")     ?.addEventListener("click", () => { this._tab="ignored"; this._filter=""; this._selIgnored.clear(); this._render(); });
    r.getElementById("tab-app")     ?.addEventListener("click", () => { this._tab="applied"; this._filter=""; this._selApplied.clear(); this._render(); });
    r.getElementById("btn-yaml")    ?.addEventListener("click", () => this._generateYaml());
    r.getElementById("btn-applied") ?.addEventListener("click", () => this._markApplied());
    r.getElementById("btn-ign")     ?.addEventListener("click", () => this._ignore());
    r.getElementById("qs-strong")   ?.addEventListener("click", () => this._selectRec("exclude_strongly"));
    r.getElementById("qs-rec")      ?.addEventListener("click", () => this._selectRec("exclude_recommended"));
    r.getElementById("sel-all")     ?.addEventListener("click", () => this._selAll());
    r.getElementById("s-search")    ?.addEventListener("input",  e => { this._filter=e.target.value; this._render(); });
    r.getElementById("s-rec")       ?.addEventListener("change", e => { this._filterRec=e.target.value; this._render(); });
    r.getElementById("s-sort")      ?.addEventListener("change", e => { this._sortBy=e.target.value; this._render(); });
    r.querySelectorAll("[data-cb]").forEach(cb => cb.addEventListener("change", e => { e.stopPropagation(); this._toggle(cb.dataset.cb); }));
    r.querySelectorAll(".row:not(.crit)").forEach(row => row.addEventListener("click", e => { if (e.target.tagName==="INPUT") return; this._toggle(row.dataset.id); }));
    r.getElementById("btn-copy")    ?.addEventListener("click", () => this._copyYaml());
    r.getElementById("btn-applied2")?.addEventListener("click", () => this._markApplied());
    r.getElementById("btn-back")    ?.addEventListener("click", () => { this._tab="list"; this._render(); });
    r.getElementById("btn-unign")   ?.addEventListener("click", () => this._unignore());
    r.getElementById("sel-all-ign") ?.addEventListener("click", () => this._selAllIgnored());
    r.getElementById("s-ign")       ?.addEventListener("input",  e => { this._filter=e.target.value; this._render(); });
    r.querySelectorAll("[data-icb]").forEach(cb => cb.addEventListener("change", e => { e.stopPropagation(); this._toggleIgn(cb.dataset.icb); }));
    r.querySelectorAll(".ign-row").forEach(row => row.addEventListener("click", e => { if (e.target.tagName==="INPUT") return; this._toggleIgn(row.dataset.ign); }));
    r.getElementById("btn-unapp")   ?.addEventListener("click", () => this._unmarkApplied());
    r.getElementById("sel-all-app") ?.addEventListener("click", () => this._selAllApplied());
    r.getElementById("s-app")       ?.addEventListener("input",  e => { this._filter=e.target.value; this._render(); });
    r.querySelectorAll("[data-acb]").forEach(cb => cb.addEventListener("change", e => { e.stopPropagation(); this._toggleApp(cb.dataset.acb); }));
    r.querySelectorAll("[data-app]").forEach(row => row.addEventListener("click", e => { if (e.target.tagName==="INPUT") return; this._toggleApp(row.dataset.app); }));
  }

  getCardSize() { return 7; }
  static getStubConfig() { return {}; }
}

customElements.define("recorder-advisor-card", RecorderAdvisorCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "recorder-advisor-card",
  name: "Recorder Advisor Card",
  description: "Analysiert den HA Recorder und schlaegt Ausschluesse fuer recorder.yaml vor.",
  preview: false,
});

console.info(
  `%c RECORDER-ADVISOR-CARD %c v${CARD_VERSION} `,
  "color:white;background:#1565c0;font-weight:700;",
  "color:#1565c0;background:white;font-weight:700;"
);
