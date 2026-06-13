/**
 * Recorder Advisor Card
 * @version 1.0.0
 */

const CARD_VERSION = "1.1.0";
const DOMAIN = "recorder_advisor";

const REC_LABELS = {
  exclude_strongly:    { label: "⛔ Dringend ausschließen", color: "#db4437" },
  exclude_recommended: { label: "🔴 Ausschluss empfohlen", color: "#e65100" },
  exclude_consider:    { label: "🟡 Ausschluss erwägen",   color: "#f9a825" },
  ok:                  { label: "✅ OK",                    color: "#4caf50" },
  critical_keep:       { label: "🔒 Kritisch – behalten",  color: "#1565c0" },
};

class RecorderAdvisorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._entities = [];
    this._selected = new Set();
    this._filter = "";
    this._filterRec = "all";
    this._sortBy = "changes_per_day";
    this._loading = false;
    this._message = null;
    this._generatedYaml = null;
    this._initialized = false;
    this._tab = "list"; // "list" | "yaml"
  }

  setConfig(config) { this._config = config; }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._loadResults();
      this._subscribeEvents();
    }
    if (!this.shadowRoot.innerHTML) this._render();
  }

  _subscribeEvents() {
    this._hass.connection.subscribeEvents((event) => {
      this._entities = event.data.entities || [];
      this._loading = false;
      this._render();
    }, `${DOMAIN}_results`);

    this._hass.connection.subscribeEvents((event) => {
      this._generatedYaml = event.data.yaml || "";
      this._tab = "yaml";
      this._render();
    }, `${DOMAIN}_yaml`);
  }

  async _loadResults() {
    this._loading = true;
    this._render();
    try {
      await this._hass.callService(DOMAIN, "get_results", {});
    } catch (e) {
      this._message = { type: "error", text: "Fehler beim Laden: " + e.message };
      this._loading = false;
      this._render();
    }
  }

  async _reanalyze() {
    this._loading = true;
    this._message = null;
    this._generatedYaml = null;
    this._render();
    try {
      await this._hass.callService(DOMAIN, "reanalyze", {});
    } catch (e) {
      this._message = { type: "error", text: "Fehler: " + e.message };
      this._loading = false;
      this._render();
    }
  }

  async _generateYaml() {
    if (this._selected.size === 0) {
      this._message = { type: "warning", text: "Keine Entitäten ausgewählt." };
      this._render();
      return;
    }
    try {
      await this._hass.callService(DOMAIN, "generate_yaml", {
        entity_ids: Array.from(this._selected),
      });
    } catch (e) {
      this._message = { type: "error", text: "Fehler: " + e.message };
      this._render();
    }
  }

  async _markApplied() {
    try {
      await this._hass.callService(DOMAIN, "mark_applied", {
        entity_ids: Array.from(this._selected),
      });
      this._message = { type: "success", text: `${this._selected.size} Entität(en) als angewendet markiert.` };
      this._selected.clear();
      this._render();
    } catch (e) {
      this._message = { type: "error", text: "Fehler: " + e.message };
      this._render();
    }
  }

  _copyYaml() {
    if (!this._generatedYaml) return;
    navigator.clipboard.writeText(this._generatedYaml).then(() => {
      this._message = { type: "success", text: "YAML in Zwischenablage kopiert!" };
      this._render();
    });
  }

  _filteredEntities() {
    const f = this._filter.toLowerCase();
    return this._entities
      .filter((e) => {
        if (f && !e.entity_id.toLowerCase().includes(f) && !e.domain.toLowerCase().includes(f)) return false;
        if (this._filterRec !== "all" && e.recommendation !== this._filterRec) return false;
        return true;
      })
      .sort((a, b) => {
        if (this._sortBy === "changes_per_day") return b.changes_per_day - a.changes_per_day;
        if (this._sortBy === "domain") return a.domain.localeCompare(b.domain);
        if (this._sortBy === "entity_id") return a.entity_id.localeCompare(b.entity_id);
        return 0;
      });
  }

  _toggleSelect(entityId) {
    if (this._selected.has(entityId)) this._selected.delete(entityId);
    else this._selected.add(entityId);
    this._render();
  }

  _toggleSelectAll() {
    const filtered = this._filteredEntities().filter(e => !e.is_critical);
    if (this._selected.size >= filtered.length) this._selected.clear();
    else filtered.forEach(e => this._selected.add(e.entity_id));
    this._render();
  }

  get _selectedIgnored() {
    if (!this.__selectedIgnored) this.__selectedIgnored = new Set();
    return this.__selectedIgnored;
  }

  _toggleSelectIgnored(entityId) {
    if (this._selectedIgnored.has(entityId)) this._selectedIgnored.delete(entityId);
    else this._selectedIgnored.add(entityId);
    this._render();
  }

  _toggleSelectAllIgnored() {
    const f = this._filteredIgnored();
    if (this._selectedIgnored.size >= f.length) this._selectedIgnored.clear();
    else f.forEach(id => this._selectedIgnored.add(id));
    this._render();
  }

  _filteredIgnored() {
    const f = this._filter.toLowerCase();
    return this._ignored.filter(id => !f || id.toLowerCase().includes(f)).sort();
  }

  async _unignoreSelected() {
    if (this._selectedIgnored.size === 0) {
      this._message = { type: "warning", text: "Keine Entitäten ausgewählt." };
      this._render();
      return;
    }
    this._loading = true;
    this._message = null;
    this._render();
    let ok = 0, err = 0;
    for (const entityId of this._selectedIgnored) {
      try {
        await this._hass.callService(DOMAIN, "unignore_entity", { entity_id: entityId });
        ok++;
      } catch (e) { err++; }
    }
    this._selectedIgnored.clear();
    this._message = {
      type: err === 0 ? "success" : "warning",
      text: `${ok} Entität(en) wieder in Analyse aufgenommen.${err > 0 ? " " + err + " Fehler." : ""}`,
    };
  }

  _selectByRec(rec) {
    this._filteredEntities()
      .filter(e => e.recommendation === rec)
      .forEach(e => this._selected.add(e.entity_id));
    this._render();
  }

  _render() {
    const filtered = this._filteredEntities();
    const selectableFiltered = filtered.filter(e => !e.is_critical);
    const allSelected = selectableFiltered.length > 0 && this._selected.size >= selectableFiltered.length;

    // Stats
    const strongly = this._entities.filter(e => e.recommendation === "exclude_strongly").length;
    const recommended = this._entities.filter(e => e.recommendation === "exclude_recommended").length;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 0; overflow: hidden; }
        .loading-bar { height: 3px; background: linear-gradient(90deg, var(--primary-color) 0%, transparent 100%); animation: loading 1.2s ease-in-out infinite; overflow: hidden; }
        @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 8px; border-bottom: 1px solid var(--divider-color); flex-wrap: wrap; gap: 8px; }
        .title { font-size: 1.1em; font-weight: 600; color: var(--primary-text-color); }
        .stats { display: flex; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--divider-color); flex-wrap: wrap; }
        .stat-chip { padding: 4px 10px; border-radius: 12px; font-size: 0.78em; font-weight: 600; }
        .stat-red  { background: rgba(219,68,55,0.12); color: #db4437; }
        .stat-orange { background: rgba(230,81,0,0.12); color: #e65100; }
        .stat-total { background: var(--secondary-background-color); color: var(--secondary-text-color); }
        .tabs { display: flex; border-bottom: 1px solid var(--divider-color); }
        .tab { flex: 1; padding: 10px; text-align: center; cursor: pointer; font-size: 0.88em; font-weight: 500; color: var(--secondary-text-color); border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
        .toolbar { display: flex; gap: 8px; padding: 8px 16px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--divider-color); }
        .toolbar input[type=text] { flex: 1; min-width: 100px; border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px 10px; background: var(--card-background-color); color: var(--primary-text-color); font-size: 0.9em; }
        .toolbar select { border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px; background: var(--card-background-color); color: var(--primary-text-color); font-size: 0.85em; }
        .action-bar { display: flex; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--divider-color); flex-wrap: wrap; align-items: center; }
        .action-bar .info { font-size: 0.82em; color: var(--secondary-text-color); flex: 1; }
        button { padding: 6px 14px; border-radius: 4px; border: none; cursor: pointer; font-size: 0.82em; font-weight: 500; }
        button:disabled { opacity: 0.4; cursor: default; }
        .btn-primary  { background: var(--primary-color); color: white; }
        .btn-success  { background: #4caf50; color: white; }
        .btn-secondary { background: var(--secondary-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color); }
        .btn-copy { background: #1565c0; color: white; }
        .btn-ignore  { background: #4fc3f7; color: white; }
        .btn-unignore { background: #4caf50; color: white; }
        .ignored-row { display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--divider-color); gap: 12px; cursor: pointer; transition: background 0.15s; }
        .ignored-row:hover { background: var(--secondary-background-color); }
        .ignored-row.selected { background: rgba(var(--rgb-primary-color,3,169,244), 0.08); }
        .ignored-row input[type=checkbox] { cursor: pointer; width: 16px; height: 16px; flex-shrink: 0; }
        .ignored-id { font-size: 0.82em; font-family: monospace; color: var(--primary-text-color); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ignored-domain { font-size: 0.72em; padding: 2px 7px; border-radius: 10px; background: rgba(158,158,158,0.15); color: #757575; font-weight: 500; }
        .entity-list { max-height: 500px; overflow-y: auto; }
        .entity-row { display: flex; align-items: flex-start; padding: 10px 16px; border-bottom: 1px solid var(--divider-color); gap: 12px; cursor: pointer; transition: background 0.15s; }
        .entity-row:hover { background: var(--secondary-background-color); }
        .entity-row.selected { background: rgba(var(--rgb-primary-color,3,169,244),0.08); }
        .entity-row.critical { opacity: 0.6; cursor: default; }
        input[type=checkbox] { margin-top: 2px; cursor: pointer; width: 16px; height: 16px; flex-shrink: 0; }
        .entity-info { flex: 1; min-width: 0; }
        .entity-id { font-size: 0.8em; font-family: monospace; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .entity-meta { display: flex; gap: 6px; margin-top: 4px; align-items: center; flex-wrap: wrap; }
        .chip { font-size: 0.72em; padding: 2px 7px; border-radius: 10px; font-weight: 500; }
        .chip-domain { background: var(--secondary-background-color); color: var(--secondary-text-color); border: 1px solid var(--divider-color); }
        .changes-col { text-align: right; font-size: 0.85em; color: var(--secondary-text-color); min-width: 70px; font-variant-numeric: tabular-nums; }
        .changes-col .num { font-weight: 700; font-size: 1em; }
        .changes-col .unit { font-size: 0.75em; }
        .select-all-row { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--divider-color); font-size: 0.82em; color: var(--secondary-text-color); cursor: pointer; user-select: none; }
        .select-all-row:hover { background: var(--secondary-background-color); }
        .quick-select { display: flex; gap: 6px; flex-wrap: wrap; padding: 4px 16px 8px; border-bottom: 1px solid var(--divider-color); }
        .quick-select button { font-size: 0.75em; padding: 3px 9px; }
        .message { margin: 8px 16px; padding: 10px 14px; border-radius: 6px; font-size: 0.88em; }
        .message.error   { background: rgba(219,68,55,0.12); color: #db4437; }
        .message.success { background: rgba(76,175,80,0.12); color: #4caf50; }
        .message.warning { background: rgba(255,152,0,0.12); color: #ff9800; }
        .empty { padding: 32px 16px; text-align: center; color: var(--secondary-text-color); font-size: 0.9em; }
        .yaml-panel { padding: 16px; }
        .yaml-panel h3 { margin: 0 0 8px; font-size: 0.95em; }
        .yaml-panel p { font-size: 0.82em; color: var(--secondary-text-color); margin: 0 0 12px; }
        pre { background: var(--secondary-background-color); border-radius: 6px; padding: 12px; font-size: 0.8em; overflow-x: auto; white-space: pre; font-family: monospace; border: 1px solid var(--divider-color); max-height: 400px; overflow-y: auto; }
        .yaml-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
      </style>

      <ha-card>
        ${this._loading ? '<div class="loading-bar"></div>' : ""}

        <div class="header">
          <div class="title">📊 Recorder Advisor</div>
          <button class="btn-primary" id="btn-reanalyze">🔄 Neu analysieren</button>
        </div>

        <div class="stats">
          <span class="stat-chip stat-total">Gesamt: ${this._entities.length}</span>
          ${strongly > 0 ? `<span class="stat-chip stat-red">⛔ Dringend: ${strongly}</span>` : ""}
          ${recommended > 0 ? `<span class="stat-chip stat-orange">🔴 Empfohlen: ${recommended}</span>` : ""}
        </div>

        <div class="tabs">
          <div class="tab ${this._tab === "list" ? "active" : ""}" id="tab-list">📋 Entitäten</div>
          <div class="tab ${this._tab === "yaml"    ? "active" : ""}" id="tab-yaml">📄 YAML</div>
          <div class="tab ${this._tab === "ignored" ? "active" : ""}" id="tab-ignored">👁 Ignoriert (${this._ignored.length})</div>
        </div>

        ${this._message ? `<div class="message ${this._message.type}">${this._message.text}</div>` : ""}

        ${this._tab === "list"    ? this._renderList(filtered, selectableFiltered, allSelected)
          : this._tab === "yaml"   ? this._renderYaml()
          : this._renderIgnoredTab()}
      </ha-card>
    `;

    this._attachEvents();
  }

  _renderList(filtered, selectableFiltered, allSelected) {
    return `
      <div class="toolbar">
        <input type="text" id="search" placeholder="Entität / Domain suchen…" value="${this._filter}">
        <select id="filter-rec">
          <option value="all" ${this._filterRec === "all" ? "selected" : ""}>Alle Empfehlungen</option>
          <option value="exclude_strongly"    ${this._filterRec === "exclude_strongly"    ? "selected" : ""}>⛔ Dringend ausschließen</option>
          <option value="exclude_recommended" ${this._filterRec === "exclude_recommended" ? "selected" : ""}>🔴 Empfohlen</option>
          <option value="exclude_consider"    ${this._filterRec === "exclude_consider"    ? "selected" : ""}>🟡 Erwägen</option>
          <option value="ok"                  ${this._filterRec === "ok"                  ? "selected" : ""}>✅ OK</option>
          <option value="critical_keep"       ${this._filterRec === "critical_keep"       ? "selected" : ""}>🔒 Kritisch</option>
        </select>
        <select id="sort">
          <option value="changes_per_day" ${this._sortBy === "changes_per_day" ? "selected" : ""}>Sortierung: Änderungen/Tag</option>
          <option value="domain"          ${this._sortBy === "domain"          ? "selected" : ""}>Sortierung: Domain</option>
          <option value="entity_id"       ${this._sortBy === "entity_id"       ? "selected" : ""}>Sortierung: ID</option>
        </select>
      </div>

      <div class="action-bar">
        <span class="info">${this._selected.size} ausgewählt</span>
        <button class="btn-primary" id="btn-gen-yaml" ${this._selected.size === 0 ? "disabled" : ""}>📄 YAML generieren</button>
        <button class="btn-success" id="btn-mark-applied" ${this._selected.size === 0 ? "disabled" : ""}>✅ Als angewendet</button>
        <button class="btn-ignore" id="btn-ignore" ${this._selected.size === 0 ? "disabled" : ""}>👁 Ignorieren</button>
      </div>

      <div class="quick-select">
        <span style="font-size:0.78em;color:var(--secondary-text-color);align-self:center">Schnellauswahl:</span>
        <button class="btn-secondary" id="qs-strongly">⛔ Alle dringend</button>
        <button class="btn-secondary" id="qs-recommended">🔴 Alle empfohlen</button>
      </div>

      <div class="select-all-row" id="select-all">
        <input type="checkbox" ${allSelected ? "checked" : ""}>
        Alle auswählen (${selectableFiltered.length} wählbar)
      </div>

      <div class="entity-list">
        ${filtered.length === 0
          ? `<div class="empty">${this._loading ? "Lade…" : this._entities.length === 0 ? "Noch keine Analyse. Bitte 'Neu analysieren' klicken." : "Keine Ergebnisse."}</div>`
          : filtered.map(e => this._renderRow(e)).join("")
        }
      </div>
    `;
  }

  _renderYaml() {
    if (!this._generatedYaml) {
      return `
        <div class="yaml-panel">
          <p>Wähle Entitäten im Tab "Entitäten" aus und klicke "YAML generieren".<br>
          Der generierte Block kann direkt in deine <code>recorder.yaml</code> eingefügt werden.</p>
          <div class="empty">📄 Noch kein YAML generiert.</div>
        </div>
      `;
    }
    return `
      <div class="yaml-panel">
        <h3>📄 recorder.yaml Ausschlüsse</h3>
        <p>Diesen Block in deine <code>recorder.yaml</code> kopieren (bestehende exclude-Liste ergänzen, nicht ersetzen):</p>
        <pre id="yaml-code">${this._escapeHtml(this._generatedYaml)}</pre>
        <div class="yaml-actions">
          <button class="btn-copy" id="btn-copy">📋 In Zwischenablage</button>
          <button class="btn-success" id="btn-mark-applied2" ${this._selected.size === 0 ? "disabled" : ""}>✅ Als angewendet markieren</button>
          <button class="btn-secondary" id="tab-back">← Zurück zur Liste</button>
        </div>
      </div>
    `;
  }

  _renderIgnoredTab() {
    const filtered = this._filteredIgnored();
    const allSel = filtered.length > 0 && this._selectedIgnored.size >= filtered.length;
    return `
      <div class="toolbar">
        <input type="text" id="search-ignored" placeholder="Entität / Domain suchen…" value="${this._filter}">
      </div>
      <div class="action-bar">
        <span class="info">${this._selectedIgnored.size} von ${filtered.length} ausgewählt</span>
        <button class="btn-unignore" id="btn-unignore" ${this._selectedIgnored.size === 0 ? "disabled" : ""}>↩ Wieder analysieren</button>
      </div>
      <div class="select-all-row" id="select-all-ignored">
        <input type="checkbox" ${allSel ? "checked" : ""}>
        Alle auswählen (${filtered.length})
      </div>
      <div class="entity-list">
        ${filtered.length === 0
          ? `<div class="empty">${this._ignored.length === 0 ? "Keine ignorierten Entitäten." : "Keine Ergebnisse."}</div>`
          : filtered.map(id => {
              const sel = this._selectedIgnored.has(id);
              const domain = id.split(".")[0];
              return `<div class="ignored-row ${sel ? "selected" : ""}" data-ign="${id}">
                <input type="checkbox" data-ign-cb="${id}" ${sel ? "checked" : ""}>
                <span class="ignored-id">${id}</span>
                <span class="ignored-domain">${domain}</span>
              </div>`;
            }).join("")
        }
      </div>
    `;
  }

  _renderRow(e) {
    const selected = this._selected.has(e.entity_id);
    const rec = REC_LABELS[e.recommendation] || { label: e.recommendation, color: "#888" };
    return `
      <div class="entity-row ${selected ? "selected" : ""} ${e.is_critical ? "critical" : ""}" data-entity="${e.entity_id}">
        <input type="checkbox" data-cb="${e.entity_id}" ${selected ? "checked" : ""} ${e.is_critical ? "disabled" : ""}>
        <div class="entity-info">
          <div class="entity-id">${e.entity_id}</div>
          <div class="entity-meta">
            <span class="chip chip-domain">${e.domain}</span>
            <span class="chip" style="background:${rec.color}22;color:${rec.color}">${rec.label}</span>
          </div>
        </div>
        <div class="changes-col">
          <div class="num">${e.changes_per_day}</div>
          <div class="unit">Änd./Tag</div>
        </div>
      </div>
    `;
  }

  _escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  _attachEvents() {
    const root = this.shadowRoot;
    root.getElementById("btn-reanalyze")?.addEventListener("click", () => this._reanalyze());
    root.getElementById("btn-gen-yaml")?.addEventListener("click", () => this._generateYaml());
    root.getElementById("btn-mark-applied")?.addEventListener("click", () => this._markApplied());
    root.getElementById("btn-mark-applied2")?.addEventListener("click", () => this._markApplied());
    root.getElementById("btn-copy")?.addEventListener("click", () => this._copyYaml());
    root.getElementById("tab-list")?.addEventListener("click", () => { this._tab = "list"; this._render(); });
    root.getElementById("tab-yaml")?.addEventListener("click", () => { this._tab = "yaml"; this._render(); });
    root.getElementById("tab-ignored")?.addEventListener("click", () => { this._tab = "ignored"; this._filter = ""; this._selectedIgnored.clear(); this._render(); });
    root.getElementById("tab-back")?.addEventListener("click", () => { this._tab = "list"; this._render(); });
    root.getElementById("btn-ignore")?.addEventListener("click", async () => {
      if (this._selected.size === 0) return;
      this._loading = true; this._render();
      let ok = 0;
      for (const eid of this._selected) {
        try { await this._hass.callService(DOMAIN, "ignore_entity", { entity_id: eid }); ok++; } catch(e) {}
      }
      this._selected.clear();
      this._message = { type: "success", text: `${ok} Entität(en) ignoriert.` };
    });
    root.getElementById("btn-unignore")?.addEventListener("click", () => this._unignoreSelected());
    root.getElementById("select-all-ignored")?.addEventListener("click", () => this._toggleSelectAllIgnored());
    root.getElementById("search-ignored")?.addEventListener("input", e => { this._filter = e.target.value; this._render(); });
    root.querySelectorAll("[data-ign-cb]").forEach(cb => {
      cb.addEventListener("change", e => { e.stopPropagation(); this._toggleSelectIgnored(cb.dataset.ignCb); });
    });
    root.querySelectorAll(".ignored-row").forEach(row => {
      row.addEventListener("click", e => { if (e.target.tagName === "INPUT") return; this._toggleSelectIgnored(row.dataset.ign); });
    });
    root.getElementById("select-all")?.addEventListener("click", () => this._toggleSelectAll());
    root.getElementById("qs-strongly")?.addEventListener("click", () => this._selectByRec("exclude_strongly"));
    root.getElementById("qs-recommended")?.addEventListener("click", () => this._selectByRec("exclude_recommended"));
    root.getElementById("search")?.addEventListener("input", (e) => { this._filter = e.target.value; this._render(); });
    root.getElementById("filter-rec")?.addEventListener("change", (e) => { this._filterRec = e.target.value; this._render(); });
    root.getElementById("sort")?.addEventListener("change", (e) => { this._sortBy = e.target.value; this._render(); });

    root.querySelectorAll("[data-cb]").forEach(cb => {
      cb.addEventListener("change", e => { e.stopPropagation(); this._toggleSelect(cb.dataset.cb); });
    });
    root.querySelectorAll(".entity-row:not(.critical)").forEach(row => {
      row.addEventListener("click", e => { if (e.target.tagName === "INPUT") return; this._toggleSelect(row.dataset.entity); });
    });
  }

  getCardSize() { return 7; }
  static getStubConfig() { return {}; }
}

customElements.define("recorder-advisor-card", RecorderAdvisorCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "recorder-advisor-card",
  name: "Recorder Advisor Card",
  description: "Analysiert den HA Recorder und schlägt Ausschlüsse für recorder.yaml vor.",
  preview: false,
});

console.info(
  `%c RECORDER-ADVISOR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #1565c0; font-weight: 700;",
  "color: #1565c0; background: white; font-weight: 700;"
);
