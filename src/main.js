import { marked, Renderer } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import mermaid from "mermaid";

import "./style.css";
import "github-markdown-css/github-markdown-light.css";
import "highlight.js/styles/github.css";

// The export window is a separate document built from an HTML string (see
// exportPdf below), so it can't use the <link>/<style> tags above — its CSS
// has to be inlined as text. `?inline` gets the processed CSS as a string
// instead of injecting it into this page (which the plain imports above
// already do).
import githubMarkdownCssText from "github-markdown-css/github-markdown-light.css?inline";
import hljsThemeCssText from "highlight.js/styles/github.css?inline";

const pagedJsUrl = "https://unpkg.com/pagedjs@0.4.3/dist/paged.polyfill.js";

(function () {
  "use strict";

  const editor = document.getElementById("editor");
  const pageContent = document.getElementById("pageContent");
  const dropZone = document.getElementById("dropZone");
  const dropHint = document.getElementById("dropHint");
  const wordCount = document.getElementById("wordCount");
  const pageSizeLabel = document.getElementById("pageSizeLabel");

  const optionsBtn = document.getElementById("optionsBtn");
  const optionsPanel = document.getElementById("optionsPanel");
  const exportBtn = document.getElementById("exportBtn");

  const sampleBtn = document.getElementById("sampleBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const fileInput = document.getElementById("fileInput");

  const docTitleInput = document.getElementById("docTitle");
  const pageSizeSelect = document.getElementById("pageSize");
  const pageMarginSelect = document.getElementById("pageMargin");
  const fontSizeSelect = document.getElementById("fontSize");
  const pageNumbersCheck = document.getElementById("pageNumbers");
  const headerTitleCheck = document.getElementById("headerTitle");
  const renderMermaidCheck = document.getElementById("renderMermaid");
  const expandLinksCheck = document.getElementById("expandLinks");

  const viewToggle = document.getElementById("viewToggle");
  const paneWrite = document.getElementById("paneWrite");
  const panePreview = document.getElementById("panePreview");
  const previewFrames = document.getElementById("previewFrames");
  const previewStatus = document.getElementById("previewStatus");

  const renderer = new Renderer();

  // GitHub-flavored "alert" blockquotes: > [!NOTE] / [!TIP] / [!IMPORTANT] /
  // [!WARNING] / [!CAUTION]. github-markdown-css already ships styles for
  // these (.markdown-alert*); marked just needs to emit the matching markup.
  const ALERT_ICONS = {
    note: '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>',
    tip: '<path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.75.75 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path>',
    important:
      '<path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A.25.25 0 0 1 5 15.396V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h4a.75.75 0 0 1 .75.75v1.19l1.72-1.72a.75.75 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.25-5.25v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0Z"></path>',
    warning:
      '<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>',
    caution:
      '<path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>',
  };
  const ALERT_LABELS = {
    note: "Note",
    tip: "Tip",
    important: "Important",
    warning: "Warning",
    caution: "Caution",
  };
  const ALERT_MARKER_RE = /^\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](<\/p>\s*|\r?\n)/i;

  renderer.blockquote = function (quote) {
    const match = quote.match(ALERT_MARKER_RE);
    if (match) {
      const type = match[1].toLowerCase();
      const body = match[2].trim() === "</p>" ? quote.slice(match[0].length) : "<p>" + quote.slice(match[0].length);
      const icon = `<svg class="octicon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${ALERT_ICONS[type]}</svg>`;
      return `<div class="markdown-alert markdown-alert-${type}">\n<p class="markdown-alert-title">${icon}${ALERT_LABELS[type]}</p>\n${body}</div>\n`;
    }
    return `<blockquote>\n${quote}</blockquote>\n`;
  };

  renderer.code = function (code, infostring) {
    const lang = (infostring || "").trim().split(/\s+/)[0];

    if (lang === "mermaid") {
      // Keep raw source around; mermaid is rendered as a post-process pass.
      const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<div class="mermaid">${escaped}</div>`;
    }

    let highlighted;
    let langClass = "";
    try {
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(code, { language: lang }).value;
        langClass = ` language-${lang}`;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch (e) {
      highlighted = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>`;
  };

  renderer.link = function (href, title, text) {
    const displayHref = (href || "").replace(/^mailto:/, "");
    const plainText = text.replace(/<[^>]*>/g, "").trim();

    // A link that wraps across lines only gets a clickable area on its first
    // line in the PDF. URL-like links are rendered as an inline-block (see
    // .link-url) so they form a single box and a single clickable area.
    const isUrlText = plainText === displayHref || plainText === href;
    const attrs = (cls) =>
      `href="${href}"${cls ? ` class="${cls}"` : ""}${title ? ` title="${title}"` : ""}`;

    let out;
    if (!isUrlText && !text.includes("<") && /\s/.test(text.trim())) {
      // Plain multi-word link text: one anchor per word, so every line it
      // wraps onto keeps its own clickable area in the PDF.
      out = text
        .trim()
        .split(/\s+/)
        .map((word, i, words) => `<a ${attrs()}>${word}${i < words.length - 1 ? " " : ""}</a>`)
        .join("");
    } else {
      out = `<a ${attrs(isUrlText ? "link-url" : "")}>${text}</a>`;
    }

    if (expandLinksCheck.checked && href && !href.startsWith("#")) {
      if (!isUrlText) {
        out += ` (<a href="${href}" class="link-url">${escapeHtml(displayHref)}</a>)`;
      }
    }
    return out;
  };

  marked.setOptions({
    gfm: true,
    breaks: false,
    renderer: renderer,
  });

  // `\pagebreak` on a line of its own forces the following content onto a new
  // page. `start` lets the marker interrupt a paragraph without a blank line
  // before it; fenced and indented code blocks are tokenized before this ever
  // sees their contents, so a literal `\pagebreak` in code is left alone.
  const PAGEBREAK_RE = /^ {0,3}\\pagebreak[ \t]*(?:\r?\n|$)/;
  marked.use({
    extensions: [
      {
        name: "pagebreak",
        level: "block",
        start(src) {
          return src.match(/^ {0,3}\\pagebreak[ \t]*$/m)?.index;
        },
        tokenizer(src) {
          const match = PAGEBREAK_RE.exec(src);
          if (match) return { type: "pagebreak", raw: match[0] };
        },
        renderer() {
          return '<div class="page-break"></div>\n';
        },
      },
    ],
  });

  const purifyConfig = {
    ADD_TAGS: ["input", "svg", "path"],
    ADD_ATTR: [
      "checked", "disabled", "type", "class", "align", "start", "id", "target", "rel",
      "viewBox", "width", "height", "fill", "d", "aria-hidden",
    ],
  };

  let mermaidReady = false;
  function ensureMermaid() {
    if (mermaidReady) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "strict",
      fontFamily: "Inter, sans-serif",
    });
    mermaidReady = true;
  }

  // A PDF can't be clicked open, so <details> are always shown expanded. They
  // become plain <div>s rather than just getting `open`: when Paged.js splits
  // a <details> across pages, the continuation has no <summary>, and the
  // browser would draw a default "Details" label at the top of it.
  function expandDetails(root) {
    // Document order, so outer boxes are rebuilt first; nested <details> are
    // moved (not copied) into them and are still converted later in the loop.
    root.querySelectorAll("details").forEach((details) => {
      const box = document.createElement("div");
      box.className = "details";

      const summaryEl = Array.from(details.children).find((el) => el.tagName === "SUMMARY");
      const summary = document.createElement("div");
      summary.className = "details-summary";
      if (summaryEl) {
        summary.append(...summaryEl.childNodes);
        summaryEl.remove();
      } else {
        summary.textContent = "Details"; // what browsers show without a <summary>
      }
      box.append(summary);

      const rest = Array.from(details.childNodes);
      if (rest.some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim())) {
        const content = document.createElement("div");
        content.className = "details-content";
        content.append(...rest);
        box.append(content);
      }

      details.replaceWith(box);
    });
  }

  let renderToken = 0;

  // Renders the Markdown (and Mermaid diagrams) into the off-screen staging
  // element. Resolves to false if a newer render superseded this one.
  async function renderContent() {
    const myToken = ++renderToken;
    const raw = editor.value;
    const html = marked.parse(raw);
    const clean = DOMPurify.sanitize(html, purifyConfig);
    pageContent.innerHTML = clean;
    pageContent.style.fontSize = fontSizeSelect.value + "px";
    expandDetails(pageContent); // before Mermaid, so diagrams inside can be measured

    if (renderMermaidCheck.checked) {
      const blocks = pageContent.querySelectorAll("div.mermaid");
      if (blocks.length) {
        ensureMermaid();
        try {
          await mermaid.run({ nodes: blocks });
        } catch (e) {
          /* leave source text visible if a diagram fails to parse */
        }
      }
    }

    if (myToken !== renderToken) return false; // a newer render started; drop this one

    updateWordCount(raw);
    return true;
  }

  async function renderPreview() {
    markPreviewStale();
    if (await renderContent()) paginatePreview();
  }

  function updateWordCount(raw) {
    const words = raw.trim().length ? raw.trim().split(/\s+/).length : 0;
    wordCount.textContent = `${words.toLocaleString()} word${words === 1 ? "" : "s"}`;
  }

  let debounceHandle = null;
  function scheduleRender(fn) {
    // Flag the preview as out of date right away, not when the debounce fires,
    // so the indicator appears as soon as the user starts typing.
    markPreviewStale();
    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(fn, 250);
  }

  editor.addEventListener("input", () => scheduleRender(renderPreview));

  const MARGINS_MM = { narrow: 12, normal: 20, wide: 30 };

  function currentSettings() {
    return {
      title: docTitleInput.value.trim() || "Untitled document",
      size: pageSizeSelect.value,
      margin: pageMarginSelect.value,
      fontSize: fontSizeSelect.value,
      pageNumbers: pageNumbersCheck.checked,
      headerTitle: headerTitleCheck.checked,
    };
  }

  let previewPageCount = null;

  function updatePageLabel() {
    const margin = pageMarginSelect.value;
    const marginLabel = margin.charAt(0).toUpperCase() + margin.slice(1);
    let label = `${pageSizeSelect.value} · ${marginLabel} margins`;
    if (previewPageCount === "error") {
      label += " · preview unavailable";
    } else if (previewPageCount !== null) {
      label += ` · ${previewPageCount} page${previewPageCount === 1 ? "" : "s"}`;
    }
    pageSizeLabel.textContent = label;
  }

  // ---- Paginated preview ---------------------------------------------------
  //
  // Each update builds the same Paged.js document the export uses and loads it
  // into a fresh, hidden iframe. Once Paged.js reports it has finished laying
  // out the pages, that frame replaces the visible one (keeping the scroll
  // position), so the preview always matches what the PDF will look like.

  const PREVIEW_GUTTER_PX = 24;
  const PREVIEW_GUTTER_COLOR = "#d6d6d3"; // keep in sync with .preview-frame in style.css
  let activeFrame = null;
  let previewToken = 0;
  let previewDirty = true;

  // Out-of-sync tracking: every change bumps `syncGeneration`; each preview
  // frame remembers the generation it was built for. The preview is in sync
  // only when the frame on screen was built for the latest generation.
  let syncGeneration = 0;

  function markPreviewStale() {
    syncGeneration++;
    previewFrames.classList.add("is-stale");
    previewStatus.setAttribute("aria-hidden", "false");
  }

  function markPreviewSynced() {
    previewFrames.classList.remove("is-stale");
    previewStatus.setAttribute("aria-hidden", "true");
  }

  function isPreviewVisible() {
    return previewFrames.clientWidth > 0 && previewFrames.clientHeight > 0;
  }

  function paginatePreview() {
    markPreviewStale();

    // Paged.js needs real layout. If the preview pane is hidden (the mobile
    // "Write" tab), wait until it is shown; the ResizeObserver below picks
    // that up.
    if (!isPreviewVisible()) {
      previewDirty = true;
      return;
    }
    previewDirty = false;

    const token = ++previewToken;
    previewFrames.querySelectorAll(".preview-frame.is-pending").forEach((f) => f.remove());

    const frame = document.createElement("iframe");
    frame.className = "preview-frame is-pending";
    frame.title = "Page preview";
    frame.dataset.token = String(token);
    frame.dataset.generation = String(syncGeneration);
    previewFrames.appendChild(frame);
    frame.srcdoc = buildDocumentHtml(currentSettings(), pageContent.innerHTML, "preview");
  }

  function fitFrameToWidth(frame) {
    const doc = frame.contentDocument;
    const pages = doc && doc.querySelector(".pagedjs_pages");
    const firstPage = pages && pages.querySelector(".pagedjs_page");
    if (!firstPage) return;
    const available = doc.documentElement.clientWidth - PREVIEW_GUTTER_PX * 2;
    const scale = Math.min(1, available / firstPage.offsetWidth);
    pages.style.zoom = String(Math.max(scale, 0.1));
  }

  window.addEventListener("message", (e) => {
    const data = e.data;
    if (!data || typeof data.type !== "string" || !data.type.startsWith("md2pdf:")) return;

    const frame = Array.from(previewFrames.querySelectorAll(".preview-frame")).find(
      (f) => f.contentWindow === e.source
    );
    if (!frame || Number(frame.dataset.token) !== previewToken) return; // stale

    if (data.type === "md2pdf:paged-error") {
      frame.remove();
      markPreviewSynced(); // nothing more is coming; don't spin forever
      previewPageCount = "error";
      updatePageLabel();
      return;
    }
    if (data.type !== "md2pdf:paged") return;

    const scrollTop = activeFrame ? activeFrame.contentWindow.scrollY : 0;
    fitFrameToWidth(frame);
    frame.contentWindow.scrollTo(0, scrollTop);
    frame.classList.remove("is-pending");
    if (activeFrame && activeFrame !== frame) activeFrame.remove();
    activeFrame = frame;
    if (Number(frame.dataset.generation) === syncGeneration) markPreviewSynced();

    previewPageCount = frame.contentDocument.querySelectorAll(".pagedjs_page").length;
    updatePageLabel();
  });

  new ResizeObserver(() => {
    if (!isPreviewVisible()) return;
    if (previewDirty) paginatePreview();
    else if (activeFrame) fitFrameToWidth(activeFrame);
  }).observe(previewFrames);

  // Page geometry / header & footer settings only affect pagination, so they
  // don't need the Markdown re-parsed.
  [pageSizeSelect, pageMarginSelect, fontSizeSelect, pageNumbersCheck, headerTitleCheck].forEach((el) =>
    el.addEventListener("change", () => {
      updatePageLabel();
      paginatePreview();
    })
  );
  docTitleInput.addEventListener("input", () => {
    if (headerTitleCheck.checked) scheduleRender(paginatePreview);
  });

  optionsBtn.addEventListener("click", () => {
    const isOpen = !optionsPanel.hidden;
    optionsPanel.hidden = isOpen;
    optionsBtn.setAttribute("aria-expanded", String(!isOpen));
  });

  renderMermaidCheck.addEventListener("change", renderPreview);
  expandLinksCheck.addEventListener("change", renderPreview);

  viewToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-btn");
    if (!btn) return;
    const view = btn.dataset.view;

    viewToggle.querySelectorAll(".view-btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });

    paneWrite.classList.toggle("is-active", view === "write");
    panePreview.classList.toggle("is-active", view === "preview");
  });

  const SAMPLE_MD = `# Quarterly Product Review

A short reference document showing the GitHub-flavored Markdown this tool understands.

> [!TIP]
> This is a "tip" callout. GitHub also supports "note", "important", "warning", and "caution".

## Highlights

- Shipped the new onboarding flow ~~last month~~ this month
- Reduced median load time by **38%**
- Closed 12 of 14 open design reviews

## Status

| Workstream | Owner | Status |
| --- | --- | --- |
| Onboarding v2 | Priya | Done |
| Billing migration | Owen | In progress |
| Mobile offline mode | Faye | Blocked |

## Open tasks

- [x] Write migration runbook
- [x] Notify affected customers
- [ ] Schedule the cutover window
- [ ] Post the retro notes

\\pagebreak

## A note on rollout

> We are rolling this out to 10% of accounts before the full release, watching
> error budgets closely for the first 48 hours.

<details>
<summary>Rollback plan</summary>

Collapsible sections are always printed expanded.

1. Flip the \`onboarding_v2\` flag off
2. Confirm traffic is back on the old flow

</details>

## Release flow

\`\`\`mermaid
flowchart LR
  A[Feature branch] --> B[Code review]
  B --> C{Tests pass?}
  C -- yes --> D[Merge to main]
  C -- no --> A
  D --> E[Deploy to 10%]
  E --> F[Deploy to 100%]
\`\`\`

## Example config

\`\`\`js
export function retryWithBackoff(fn, attempts = 3) {
  return fn().catch((err) => {
    if (attempts <= 1) throw err;
    return retryWithBackoff(fn, attempts - 1);
  });
}
\`\`\`

---

Questions go to [#product-review](https://example.com) on Slack.

Find our product @ [https://example.com](https://example.com)
`;

  sampleBtn.addEventListener("click", () => {
    editor.value = SAMPLE_MD;
    renderPreview();
  });

  clearBtn.addEventListener("click", () => {
    editor.value = "";
    renderPreview();
    editor.focus();
  });

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) loadFile(file);
    fileInput.value = "";
  });

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = String(reader.result || "");
      renderPreview();
      if (!docTitleInput.value) {
        docTitleInput.value = file.name.replace(/\.(md|markdown|txt)$/i, "");
      }
    };
    reader.readAsText(file);
  }

  ["dragenter", "dragover"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("is-dragging");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      if (evt === "drop") return; // the dedicated "drop" listener below removes the class
      dropZone.classList.remove("is-dragging");
    })
  );
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("is-dragging");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  function escapeForCssString(str) {
    return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function buildPageCss(settings) {
    const m = MARGINS_MM[settings.margin] ?? MARGINS_MM.normal;
    let css = `
      @page {
        size: ${settings.size};
        margin: ${m}mm;
      }
    `;

    if (settings.pageNumbers) {
      css += `
        @page {
          @bottom-center {
            content: "Page " counter(page) " of " counter(pages);
            font-family: Inter, sans-serif;
            font-size: 9pt;
            color: #6b6e76;
          }
        }
      `;
    }

    if (settings.headerTitle && settings.title) {
      css += `
        @page {
          @top-center {
            content: "${escapeForCssString(settings.title)}";
            font-family: Inter, sans-serif;
            font-size: 9pt;
            color: #6b6e76;
          }
        }
      `;
    }

    return css;
  }

  // Builds the standalone Paged.js document used both for the in-app page
  // preview (mode "preview") and for the export window (mode "export"). Both
  // share the exact same page CSS so the preview matches the PDF.
  function buildDocumentHtml(settings, bodyHtml, mode) {
    const isPreview = mode === "preview";
    const pageCss = buildPageCss(settings);

    if (isPreview && !bodyHtml.trim()) {
      bodyHtml = '<p class="preview-placeholder">Your document will appear here.</p>';
    }

    // The export prints as soon as pagination finishes; the preview instead
    // tells the app it's ready to be shown.
    const afterPaged = isPreview
      ? 'window.parent.postMessage({ type: "md2pdf:paged" }, "*");'
      : "setTimeout(function () { window.print(); }, 150);";
    const pagedErrorHandler = isPreview
      ? ` onerror="window.parent.postMessage({ type: 'md2pdf:paged-error' }, '*')"`
      : "";

    // Preview-only chrome (grey gutter, page shadows). It lives in a
    // media="screen" <style>, which Paged.js leaves out of its processing
    // (it drops screen-only rules from the stylesheets it does process).
    // !important beats the processed `html, body { background: #fff }`,
    // which Paged.js re-inserts later in <head>.
    const screenStyle = isPreview
      ? `<style media="screen">
  html, body { background: ${PREVIEW_GUTTER_COLOR} !important; }
  body { padding: ${PREVIEW_GUTTER_PX}px ${PREVIEW_GUTTER_PX}px 60px !important; }
  .pagedjs_page {
    background: #fff;
    margin: 0 auto ${PREVIEW_GUTTER_PX}px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.18);
  }
</style>`
      : "";

    const modeCss = isPreview
      ? `
  .preview-placeholder {
    color: #9a9d9f;
    font-family: Fraunces, Georgia, serif;
    font-style: italic;
    font-size: 19px;
  }`
      : `
  .export-toolbar {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 999;
    display: flex;
    gap: 8px;
    font-family: Inter, sans-serif;
  }
  .export-toolbar button {
    font-size: 13px;
    padding: 8px 14px;
    border-radius: 4px;
    border: 1px solid #d8d5cd;
    background: #15161a;
    color: #f2f1ed;
    cursor: pointer;
  }
  @media print {
    .export-toolbar { display: none; }
  }`;

    const toolbar = isPreview
      ? ""
      : `<div class="export-toolbar no-print">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>`;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(settings.title)}</title>
<style>
  ${githubMarkdownCssText}
  ${hljsThemeCssText}
  html, body { margin: 0; padding: 0; background: #fff; }
  .markdown-body {
    box-sizing: border-box;
    font-size: ${settings.fontSize}px;
  }
  .markdown-body a.link-url { display: inline-block; max-width: 100%; overflow-wrap: anywhere; vertical-align: bottom; }
  .markdown-body .mermaid { display: flex; justify-content: center; margin: 20px 0; }
  .markdown-body .mermaid svg { max-width: 100%; height: auto; }
  .markdown-body .page-break { break-after: page; height: 0; margin: 0; }
  .markdown-body .details {
    margin: 0 0 16px;
    border: 1px solid #d1d9e0;
    border-radius: 6px;
  }
  .markdown-body .details-summary {
    position: relative;
    padding: 8px 16px 8px 36px;
    font-weight: 600;
    background: #f6f8fa;
    border-bottom: 1px solid #d1d9e0;
    border-radius: 5px 5px 0 0;
    break-after: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .markdown-body .details-summary:last-child { border-bottom: 0; border-radius: 5px; }
  /* Downward chevron: the "expanded" disclosure marker. */
  .markdown-body .details-summary::before {
    content: "";
    position: absolute;
    left: 16px;
    top: calc(8px + 0.75em - 5px);
    width: 6px;
    height: 6px;
    border-right: 1.5px solid #59636e;
    border-bottom: 1.5px solid #59636e;
    transform: rotate(45deg);
  }
  .markdown-body .details-summary > :first-child,
  .markdown-body .details-content > :first-child { margin-top: 0; }
  .markdown-body .details-summary > :last-child,
  .markdown-body .details-content > :last-child { margin-bottom: 0; }
  .markdown-body .details-content { padding: 12px 16px; }
  /* Split across pages by Paged.js: leave the box open at the page break. */
  .markdown-body .details[data-split-to] {
    border-bottom: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .markdown-body .details[data-split-from] {
    border-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
  ${modeCss}
  ${pageCss}
</style>
${screenStyle}
</head>
<body>
  ${toolbar}
  <div class="markdown-body">${bodyHtml}</div>

  <script>
    window.PagedConfig = {
      auto: true,
      after: function () {
        ${afterPaged}
      }
    };
  <\/script>
  <script src="${new URL(pagedJsUrl, window.location.href).href}"${pagedErrorHandler}><\/script>
</body>
</html>`;
  }

  async function exportPdf() {
    // Make sure the latest edits and mermaid diagrams have finished rendering
    // before we copy them into the export document.
    await renderContent();

    const doc = buildDocumentHtml(currentSettings(), pageContent.innerHTML, "export");

    const win = window.open("", "_blank");
    if (!win) {
      alert("Your browser blocked the export window. Please allow pop-ups for this site and try again.");
      return;
    }
    win.document.open();
    win.document.write(doc);
    win.document.close();
  }

  exportBtn.addEventListener("click", () => {
    exportBtn.disabled = true;
    const original = exportBtn.textContent;
    exportBtn.textContent = "Preparing…";
    exportPdf().finally(() => {
      exportBtn.disabled = false;
      exportBtn.textContent = original;
    });
  });

  updatePageLabel();
  editor.value = SAMPLE_MD;
  renderPreview();
})();
