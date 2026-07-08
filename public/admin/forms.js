/* Shared admin form library: turns a field schema into friendly inputs.
   No raw JSON anywhere — file uploads, pick-from-list and add/remove rows.
   Exposes window.AdminForms.{ buildInto, collect }. */
(function () {
  "use strict";

  // Escape values interpolated into innerHTML so user content (document titles,
  // pasted file URLs, etc.) can never inject markup into the admin.
  function esc(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function make(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de l'envoi du fichier.");
    }
    return res.json();
  }

  // --- individual field builders. Each returns an element with `__collect()`. ---

  function labelFor(field) {
    const req = field.required ? ' <span class="req">*</span>' : "";
    const help = field.help ? `<div class="help">${field.help}</div>` : "";
    return { req, help };
  }

  function buildScalar(field, value) {
    const { req, help } = labelFor(field);
    const wrap = make(`<div class="field" data-key="${field.key}"><label>${field.label}${req}</label></div>`);
    let control;
    if (field.type === "textarea") {
      control = document.createElement("textarea");
    } else {
      control = document.createElement("input");
      control.type = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
    }
    control.value = value == null ? "" : String(value);
    wrap.appendChild(control);
    if (field.help) wrap.appendChild(make(`<div class="help">${field.help}</div>`));
    wrap.__collect = () => control.value;
    return wrap;
  }

  function buildBoolean(field, value) {
    const wrap = make(
      `<div class="field field--check" data-key="${field.key}">
         <input type="checkbox" id="c_${field.key}_${Math.random().toString(36).slice(2, 7)}" />
         <label></label>
       </div>`
    );
    const cb = wrap.querySelector("input");
    cb.checked = value === true;
    wrap.querySelector("label").textContent = field.label;
    wrap.querySelector("label").setAttribute("for", cb.id);
    wrap.__collect = () => cb.checked;
    return wrap;
  }

  function buildFile(field, value) {
    const { req } = labelFor(field);
    const isImage = (field.accept || "").includes("image");
    const wrap = make(
      `<div class="field filefield" data-key="${field.key}">
         <label>${field.label}${req}</label>
         <div class="filefield__row">
           <button type="button" class="btn btn--ghost btn--small filefield__pick">📎 Choisir un fichier…</button>
           <span class="filefield__status muted"></span>
         </div>
         <input class="filefield__url" type="text" placeholder="Coller une URL ou utiliser l'envoi de fichier" />
         <div class="filefield__preview"></div>
         <input type="hidden" />
       </div>`
    );
    const hidden = wrap.querySelector("input[type=hidden]");
    const urlInput = wrap.querySelector(".filefield__url");
    const status = wrap.querySelector(".filefield__status");
    const preview = wrap.querySelector(".filefield__preview");
    const pick = wrap.querySelector(".filefield__pick");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    if (field.accept) fileInput.accept = field.accept;
    fileInput.style.display = "none";
    wrap.appendChild(fileInput);

    function renderPreview(url, syncInput = true) {
      const cleanUrl = (url || "").trim();
      hidden.value = cleanUrl;
      if (syncInput) urlInput.value = cleanUrl;
      if (!cleanUrl) {
        preview.innerHTML = "";
        status.textContent = "Aucun fichier";
        return;
      }
      if (isImage) {
        preview.innerHTML = `<img src="${esc(cleanUrl)}" alt="" class="filefield__img" />`;
      } else {
        const nm = cleanUrl.split("/").pop();
        preview.innerHTML = `<a href="${esc(cleanUrl)}" target="_blank" rel="noreferrer">📄 ${esc(nm)}</a>`;
      }
      status.innerHTML = `<button type="button" class="linkbtn filefield__clear">Retirer</button>`;
      const clr = status.querySelector(".filefield__clear");
      if (clr) clr.addEventListener("click", () => renderPreview(""));
    }

    pick.addEventListener("click", () => fileInput.click());
    urlInput.addEventListener("input", () => renderPreview(urlInput.value, false));
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      status.textContent = "Envoi en cours…";
      try {
        const r = await uploadFile(f);
        renderPreview(r.url);
      } catch (e) {
        status.textContent = e.message;
      }
      fileInput.value = "";
    });

    renderPreview(value ? String(value) : "");
    wrap.__collect = () => hidden.value.trim();
    return wrap;
  }

  function buildFiles(field, value) {
    const { req } = labelFor(field);
    const isImage = (field.accept || "").includes("image");
    const wrap = make(
      `<div class="field filesfield" data-key="${field.key}">
         <label>${field.label}${req}</label>
         <div class="files"></div>
         <button type="button" class="btn btn--ghost btn--small files__add">+ Ajouter un fichier</button>
         ${field.help ? `<div class="help">${field.help}</div>` : ""}
       </div>`
    );
    const list = wrap.querySelector(".files");

    function addRow(v) {
      const row = make(
        `<div class="files__row">
           <input type="text" class="files__url" placeholder="URL du fichier" />
           <button type="button" class="btn btn--ghost btn--small files__pick">📎</button>
           <button type="button" class="linkbtn files__del" title="Supprimer">✕</button>
           <div class="files__preview"></div>
         </div>`
      );
      const url = row.querySelector(".files__url");
      const pick = row.querySelector(".files__pick");
      const preview = row.querySelector(".files__preview");
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      if (field.accept) fileInput.accept = field.accept;
      fileInput.style.display = "none";
      row.appendChild(fileInput);

      function renderPreview(nextUrl) {
        const cleanUrl = (nextUrl || "").trim();
        if (!cleanUrl) {
          preview.innerHTML = "";
          return;
        }
        if (isImage) {
          preview.innerHTML = `<img src="${esc(cleanUrl)}" alt="" class="filefield__img" />`;
        } else {
          const nm = cleanUrl.split("/").pop();
          preview.innerHTML = `<a href="${esc(cleanUrl)}" target="_blank" rel="noreferrer">${esc(nm)}</a>`;
        }
      }

      url.value = v == null ? "" : String(v);
      renderPreview(url.value);
      url.addEventListener("input", () => renderPreview(url.value));
      pick.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        pick.textContent = "…";
        try {
          const r = await uploadFile(f);
          url.value = r.url;
          renderPreview(r.url);
        } catch (e) {
          preview.textContent = e.message;
        }
        pick.textContent = "📎";
        fileInput.value = "";
      });
      row.querySelector(".files__del").addEventListener("click", () => row.remove());
      list.appendChild(row);
    }

    (Array.isArray(value) ? value : []).forEach(addRow);
    wrap.querySelector(".files__add").addEventListener("click", () => addRow(""));
    wrap.__collect = () =>
      Array.from(list.querySelectorAll(".files__url")).map((i) => i.value.trim()).filter(Boolean);
    return wrap;
  }

  function buildLines(field, value) {
    const { req } = labelFor(field);
    const wrap = make(
      `<div class="field" data-key="${field.key}">
         <label>${field.label}${req}</label>
         <div class="lines"></div>
         <button type="button" class="btn btn--ghost btn--small lines__add">+ Ajouter</button>
         ${field.help ? `<div class="help">${field.help}</div>` : ""}
       </div>`
    );
    const list = wrap.querySelector(".lines");
    function addRow(v) {
      const row = make(
        `<div class="lines__row"><input type="text" value="" /><button type="button" class="linkbtn lines__del" title="Supprimer">✕</button></div>`
      );
      row.querySelector("input").value = v == null ? "" : String(v);
      row.querySelector(".lines__del").addEventListener("click", () => row.remove());
      list.appendChild(row);
    }
    (Array.isArray(value) ? value : []).forEach(addRow);
    wrap.querySelector(".lines__add").addEventListener("click", () => addRow(""));
    wrap.__collect = () =>
      Array.from(list.querySelectorAll("input")).map((i) => i.value.trim()).filter(Boolean);
    return wrap;
  }

  function buildParagraphs(field, value) {
    const { req } = labelFor(field);
    const wrap = make(`<div class="field" data-key="${field.key}"><label>${field.label}${req}</label></div>`);
    const ta = document.createElement("textarea");
    ta.className = "paragraphs";
    ta.value = Array.isArray(value) ? value.join("\n\n") : value == null ? "" : String(value);
    wrap.appendChild(ta);
    if (field.help) wrap.appendChild(make(`<div class="help">${field.help}</div>`));
    wrap.__collect = () =>
      ta.value.split(/\r?\n\s*\r?\n+/).map((p) => p.trim()).filter(Boolean);
    return wrap;
  }

  function buildReference(field, value) {
    const { req } = labelFor(field);
    const options = field.refOptions || [];
    const selected = new Set((Array.isArray(value) ? value : []).map(String));
    const wrap = make(
      `<div class="field" data-key="${field.key}">
         <label>${field.label}${req}</label>
         <div class="ref">
           <input type="search" class="ref__filter" placeholder="Rechercher…" />
           <div class="ref__list"></div>
         </div>
         ${field.help ? `<div class="help">${field.help}</div>` : ""}
       </div>`
    );
    const listEl = wrap.querySelector(".ref__list");
    if (!options.length) {
      listEl.innerHTML = `<p class="muted" style="padding:8px">Aucun élément disponible.</p>`;
    }
    options.forEach((opt) => {
      const row = make(
        `<label class="ref__item"><input type="checkbox" value="${esc(opt.id)}" /> <span>${esc(opt.label)}</span></label>`
      );
      const cb = row.querySelector("input");
      if (selected.has(String(opt.id))) cb.checked = true;
      row.dataset.text = (opt.label + " " + opt.id).toLowerCase();
      listEl.appendChild(row);
    });
    const filter = wrap.querySelector(".ref__filter");
    filter.addEventListener("input", () => {
      const q = filter.value.toLowerCase().trim();
      listEl.querySelectorAll(".ref__item").forEach((it) => {
        it.style.display = !q || it.dataset.text.includes(q) ? "" : "none";
      });
    });
    wrap.__collect = () =>
      Array.from(listEl.querySelectorAll("input:checked")).map((i) => i.value);
    return wrap;
  }

  function buildRepeater(field, value) {
    const { req } = labelFor(field);
    const wrap = make(
      `<div class="field" data-key="${field.key}">
         <label>${field.label}${req}</label>
         <div class="rep"></div>
         <button type="button" class="btn btn--ghost btn--small rep__add">+ Ajouter</button>
       </div>`
    );
    const list = wrap.querySelector(".rep");
    const subfields = field.subfields || [];
    function addRow(obj) {
      const row = make(`<div class="rep__row"><div class="rep__fields"></div><button type="button" class="linkbtn rep__del" title="Supprimer">✕ Supprimer</button></div>`);
      const fieldsBox = row.querySelector(".rep__fields");
      const collectors = [];
      subfields.forEach((sf) => {
        const fEl = buildField(sf, obj ? obj[sf.key] : undefined);
        fieldsBox.appendChild(fEl);
        collectors.push({ key: sf.key, el: fEl });
      });
      row.querySelector(".rep__del").addEventListener("click", () => row.remove());
      row.__collectRow = () => {
        const o = {};
        collectors.forEach((c) => {
          const v = c.el.__collect();
          if (v !== "" && v != null && !(Array.isArray(v) && v.length === 0)) o[c.key] = v;
        });
        return o;
      };
      list.appendChild(row);
    }
    (Array.isArray(value) ? value : []).forEach(addRow);
    wrap.querySelector(".rep__add").addEventListener("click", () => addRow(null));
    wrap.__collect = () =>
      Array.from(list.querySelectorAll(":scope > .rep__row"))
        .map((r) => r.__collectRow())
        .filter((o) => Object.keys(o).length > 0);
    return wrap;
  }

  function buildField(field, value) {
    switch (field.type) {
      case "boolean": return buildBoolean(field, value);
      case "file": return buildFile(field, value);
      case "files": return buildFiles(field, value);
      case "lines": return buildLines(field, value);
      case "paragraphs": return buildParagraphs(field, value);
      case "reference": return buildReference(field, value);
      case "repeater": return buildRepeater(field, value);
      default: return buildScalar(field, value);
    }
  }

  // Populate a container with fields; returns a collect() bound to them.
  function buildInto(container, fields, values) {
    container.innerHTML = "";
    const built = fields.map((field) => {
      const el = buildField(field, values ? values[field.key] : undefined);
      container.appendChild(el);
      return { field, el };
    });
    return () => {
      const out = {};
      built.forEach(({ field, el }) => {
        out[field.key] = el.__collect();
      });
      return out;
    };
  }

  window.AdminForms = { buildInto };
})();
