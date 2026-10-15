defmodule CodebattleWeb.PublicApi.DocsHTML do
  @moduledoc """
  Renders the public API Markdown into a standalone page. The content is server-rendered, so
  crawlers and LLM fetchers that don't run JS still read everything; JS only adds the sidebar,
  search, highlighting and copy buttons.
  """

  @mdex_opts [
    extension: [table: true, autolink: true, strikethrough: true, header_id_prefix: ""],
    render: [unsafe: true]
  ]

  @spec page(String.t()) :: String.t()
  def page(markdown) do
    body =
      markdown
      |> MDEx.to_html!(@mdex_opts)
      |> decorate_endpoints()
      |> String.replace("<table>", ~s(<div class="table-wrap"><table>))
      |> String.replace("</table>", "</table></div>")

    layout(body)
  end

  # `### GET /me/games` → method badge + monospace path, styled as an endpoint header.
  defp decorate_endpoints(html) do
    Regex.replace(
      ~r{<h3 id="[^"]*">(GET|POST|PATCH|PUT|DELETE) ([^<]+)<a [^>]*></a></h3>},
      html,
      fn _, method, path ->
        id = String.downcase(method) <> "-" <> (path |> String.replace(~r/[^A-Za-z0-9_]+/, "-") |> String.trim("-"))

        ~s(<h3 class="endpoint" id="#{id}"><span class="method m-#{String.downcase(method)}">#{method}</span>) <>
          ~s(<code class="path">#{path}</code><a href="##{id}" class="anchor" aria-label="Link to #{method} #{path}"></a></h3>)
      end
    )
  end

  defp layout(body) do
    """
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Codebattle API</title>
      <meta name="description" content="Codebattle Public API v1: guide, endpoints, objects, errors and limits. Also available as Markdown at /api-docs.md.">
      <link rel="alternate" type="text/markdown" href="/api-docs.md" title="Markdown version for LLMs">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
      <style>#{css()}</style>
    </head>
    <body>
      <header class="topbar">
        <a class="brand" href="/" aria-label="Codebattle home">
          <span class="brand-mark">&lt;/&gt;</span>
          <span class="brand-name">codebattle</span>
          <span class="brand-sep">/</span>
          <span class="brand-sub">api v1</span>
        </a>
        <button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button>
        <nav class="actions" aria-label="Formats">
          <button class="btn btn-accent" type="button" id="copy-md">
            <span class="btn-label">Copy for LLM</span>
          </button>
          <a class="btn" href="/api-docs.md">.md</a>
          <a class="btn" href="/public_api/v1/openapi.json">OpenAPI</a>
          <a class="btn hide-sm" href="/llms.txt">llms.txt</a>
          <a class="btn hide-sm" href="/public_api/docs">Swagger</a>
        </nav>
      </header>
      <div class="shell">
        <aside class="sidebar" id="sidebar">
          <input class="search" id="search" type="search" placeholder="Filter…  /" aria-label="Filter sections" autocomplete="off">
          <nav id="toc" aria-label="Contents"></nav>
        </aside>
        <main class="content" id="content">
          <div class="llm-hint">
            <span class="dot"></span>
            <span>Feeding this to an LLM? Use <a href="/api-docs.md">/api-docs.md</a>: the same docs as plain Markdown.</span>
          </div>
          #{body}
          <footer class="foot">Generated from the OpenAPI spec · <a href="https://github.com/hexlet-codebattle/codebattle">hexlet-codebattle/codebattle</a></footer>
        </main>
      </div>
      <script>#{js()}</script>
    </body>
    </html>
    """
  end

  defp css do
    ~S"""
    :root {
      --bg: #f7f7f8; --panel: #ffffff; --panel-2: #f0f0f2; --border: #e3e3e8;
      --text: #1d1d22; --muted: #62626e; --faint: #8b8b96;
      --accent: #e5484d; --accent-soft: rgba(229,72,77,.10);
      --code-bg: #16161a; --code-text: #e6e6ea;
      --k: #ff8a8f; --s: #9fe0a8; --n: #f5c26b; --c: #7d7d8a; --f: #8ab4ff;
      --get: #1f9d55; --post: #2f6fea; --patch: #b7791f; --delete: #d93f45;
      --shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05);
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #111113; --panel: #18181b; --panel-2: #1f1f23; --border: #2a2a30;
        --text: #ececf1; --muted: #a0a0ab; --faint: #6f6f7a;
        --accent: #ff5c61; --accent-soft: rgba(255,92,97,.12);
        --code-bg: #0b0b0d; --shadow: none;
        --get: #3ccf7f; --post: #5c95ff; --patch: #f0b24a; --delete: #ff6b70;
      }
    }
    :root[data-theme="dark"] {
      --bg: #111113; --panel: #18181b; --panel-2: #1f1f23; --border: #2a2a30;
      --text: #ececf1; --muted: #a0a0ab; --faint: #6f6f7a;
      --accent: #ff5c61; --accent-soft: rgba(255,92,97,.12);
      --code-bg: #0b0b0d; --shadow: none;
      --get: #3ccf7f; --post: #5c95ff; --patch: #f0b24a; --delete: #ff6b70;
    }
    * { box-sizing: border-box; }
    html { scroll-padding-top: 76px; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 15.5px/1.65 Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    code, pre, .mono { font-family: "JetBrains Mono", ui-monospace, monospace; }

    .topbar { position: sticky; top: 0; z-index: 20; height: 60px; display: flex; align-items: center; gap: 12px;
      padding: 0 20px; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border); }
    .brand { display: flex; align-items: baseline; gap: 8px; color: var(--text); font-family: "JetBrains Mono", monospace; font-weight: 700; white-space: nowrap; }
    .brand:hover { text-decoration: none; }
    .brand-mark { color: var(--accent); }
    .brand-sep, .brand-sub { color: var(--faint); font-weight: 500; }
    .actions { margin-left: auto; display: flex; gap: 8px; }
    .btn { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--panel); color: var(--text); font: 500 13px "JetBrains Mono", monospace; cursor: pointer; white-space: nowrap; }
    .btn:hover { border-color: var(--faint); text-decoration: none; }
    .btn-accent { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn-accent:hover { filter: brightness(1.08); border-color: var(--accent); }
    .menu-toggle { display: none; margin-left: auto; background: none; border: 1px solid var(--border); color: var(--text); border-radius: 8px; height: 32px; width: 36px; cursor: pointer; }

    .shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); max-width: 1320px; margin: 0 auto; }
    .sidebar { position: sticky; top: 60px; height: calc(100vh - 60px); overflow-y: auto; padding: 20px 14px 40px 20px; border-right: 1px solid var(--border); }
    .search { width: 100%; height: 34px; padding: 0 10px; margin-bottom: 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel); color: var(--text); font: 13px "JetBrains Mono", monospace; }
    .search:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
    #toc a { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px; color: var(--muted); font-size: 13.5px; line-height: 1.35; }
    #toc a:hover { background: var(--panel-2); color: var(--text); text-decoration: none; }
    #toc a.active { background: var(--accent-soft); color: var(--text); }
    #toc .toc-h2 { margin-top: 10px; color: var(--text); font-weight: 600; }
    #toc .toc-h3 { padding-left: 16px; font-family: "JetBrains Mono", monospace; font-size: 12.5px; }
    #toc .toc-h3 .method { font-size: 9.5px; min-width: 42px; padding: 1px 0; }

    .content { min-width: 0; padding: 28px 48px 80px; max-width: 900px; }
    .llm-hint { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 8px; border: 1px dashed var(--border);
      border-radius: 10px; color: var(--muted); font-size: 13.5px; background: var(--panel); }
    .llm-hint .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--get); box-shadow: 0 0 0 4px color-mix(in srgb, var(--get) 20%, transparent); flex: none; }

    .content h1 { font-size: 40px; line-height: 1.1; letter-spacing: -.02em; margin: 28px 0 12px; }
    .content h1 + p { font-size: 18px; color: var(--muted); }
    .content h2 { font-size: 26px; letter-spacing: -.01em; margin: 56px 0 14px; padding-top: 20px; border-top: 1px solid var(--border); }
    .content h3 { font-size: 18px; margin: 32px 0 10px; }
    .content .anchor { margin-left: 10px; color: var(--faint); opacity: 0; font-weight: 400; text-decoration: none; transition: opacity .15s; }
    .content .anchor::before { content: "#"; }
    .content h2:hover .anchor, .content h3:hover .anchor, .content .anchor:focus { opacity: 1; }
    .content h3.endpoint .anchor { margin-left: auto; }
    .content p, .content li { color: var(--text); }
    .content ul, .content ol { padding-left: 22px; }
    .content :not(pre) > code { overflow-wrap: anywhere; padding: .12em .4em; border-radius: 5px; background: var(--panel-2); border: 1px solid var(--border); font-size: .86em; }
    .content strong { font-weight: 600; }

    .content h3.endpoint { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 44px; padding: 14px 16px;
      background: var(--panel); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); }
    .content h3.endpoint .path { font-size: 16px; font-weight: 500; background: none; border: 0; padding: 0; word-break: break-all; }
    .method { display: inline-flex; justify-content: center; min-width: 58px; padding: 3px 8px; border-radius: 6px; color: #fff;
      font: 700 12px "JetBrains Mono", monospace; letter-spacing: .04em; }
    .m-get { background: var(--get); } .m-post { background: var(--post); } .m-patch, .m-put { background: var(--patch); } .m-delete { background: var(--delete); }

    pre { position: relative; margin: 14px 0; padding: 16px 18px; overflow-x: auto; border-radius: 12px; background: var(--code-bg);
      color: var(--code-text); font-size: 13px; line-height: 1.6; border: 1px solid #23232a; }
    pre code { background: none; border: 0; padding: 0; color: inherit; }
    pre .copy { position: absolute; top: 8px; right: 8px; opacity: 0; transition: opacity .15s; height: 26px; padding: 0 9px; border-radius: 6px;
      border: 1px solid #33333b; background: #1d1d22; color: #c9c9d1; font: 500 11.5px "JetBrains Mono", monospace; cursor: pointer; }
    pre:hover .copy, pre .copy:focus { opacity: 1; }
    .tk-k { color: var(--k); } .tk-s { color: var(--s); } .tk-n { color: var(--n); } .tk-c { color: var(--c); font-style: italic; } .tk-f { color: var(--f); }

    .table-wrap { margin: 14px 0; border: 1px solid var(--border); border-radius: 10px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    thead th { background: var(--panel-2); text-align: left; font-weight: 600; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
    th, td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover td { background: color-mix(in srgb, var(--panel-2) 60%, transparent); }
    td:first-child { white-space: nowrap; }

    .foot { margin-top: 64px; padding-top: 18px; border-top: 1px solid var(--border); color: var(--faint); font-size: 13px; }
    .hidden-by-filter { display: none !important; }

    @media (max-width: 900px) {
      .shell { grid-template-columns: minmax(0, 1fr); }
      .sidebar { position: fixed; top: 60px; left: 0; width: min(320px, 86vw); z-index: 15; background: var(--bg); transform: translateX(-100%); transition: transform .2s; }
      body.nav-open .sidebar { transform: none; box-shadow: 0 0 40px rgba(0,0,0,.3); }
      .menu-toggle { display: inline-block; }
      .actions { margin-left: 0; }
      .content { padding: 20px 16px 60px; }
      .content h1 { font-size: 30px; }
      .hide-sm { display: none; }
    }
    @media (max-width: 520px) {
      .brand-sep, .brand-sub { display: none; }
      .actions a.btn:not(.btn-accent) { display: none; }
    }
    """
  end

  defp js do
    ~S"""
    (function () {
      var content = document.getElementById('content');
      var toc = document.getElementById('toc');

      // Sidebar from the rendered headings
      var heads = content.querySelectorAll('h2, h3');
      heads.forEach(function (h) {
        if (!h.id) return;
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.className = 'toc-' + h.tagName.toLowerCase();
        var method = h.querySelector('.method');
        if (method) {
          a.appendChild(method.cloneNode(true));
          a.appendChild(document.createTextNode(h.querySelector('.path').textContent));
        } else {
          a.textContent = h.textContent;
        }
        a.dataset.target = h.id;
        toc.appendChild(a);
      });

      // Highlight the section in view
      var links = toc.querySelectorAll('a');
      var byId = {};
      links.forEach(function (l) { byId[l.dataset.target] = l; });
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) { l.classList.remove('active'); });
          var link = byId[e.target.id];
          if (link) {
            link.classList.add('active');
            var box = toc.parentElement;
            if (link.offsetTop < box.scrollTop || link.offsetTop > box.scrollTop + box.clientHeight - 40) {
              box.scrollTop = link.offsetTop - box.clientHeight / 3;
            }
          }
        });
      }, { rootMargin: '-70px 0px -70% 0px' });
      heads.forEach(function (h) { if (h.id) observer.observe(h); });

      // Filter
      var search = document.getElementById('search');
      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        links.forEach(function (l) {
          l.classList.toggle('hidden-by-filter', q !== '' && l.textContent.toLowerCase().indexOf(q) === -1);
        });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
        if (e.key === 'Escape') { search.value = ''; search.dispatchEvent(new Event('input')); search.blur(); }
      });

      // Mobile nav
      var toggle = document.querySelector('.menu-toggle');
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open);
      });
      toc.addEventListener('click', function () { document.body.classList.remove('nav-open'); });

      // Syntax highlighting (json, bash, http) — tiny on purpose
      function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function json(src) {
        return esc(src).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g, function (m, str, colon, kw) {
          if (str) return colon ? '<span class="tk-k">' + str + '</span>' + colon : '<span class="tk-s">' + str + '</span>';
          if (kw) return '<span class="tk-n">' + m + '</span>';
          return '<span class="tk-n">' + m + '</span>';
        });
      }
      function bash(src) {
        return esc(src).replace(/(#[^\n]*)|('(?:[^'])*'|"(?:\\.|[^"\\])*")|(\$[A-Z_]+)|(^|\s)(-{1,2}[A-Za-z-]+)|^(\s*)(curl|export)\b/gm,
          function (m, comment, str, v, sp, flag, sp2, cmd) {
            if (comment) return '<span class="tk-c">' + comment + '</span>';
            if (str) return '<span class="tk-s">' + str + '</span>';
            if (v) return '<span class="tk-n">' + v + '</span>';
            if (flag) return sp + '<span class="tk-k">' + flag + '</span>';
            if (cmd) return sp2 + '<span class="tk-f">' + cmd + '</span>';
            return m;
          });
      }
      content.querySelectorAll('pre').forEach(function (pre) {
        var code = pre.querySelector('code');
        if (!code) return;
        var lang = (pre.getAttribute('lang') || (code.className.match(/language-(\w+)/) || [])[1] || '').toLowerCase();
        var text = code.textContent;
        if (lang === 'json') code.innerHTML = json(text);
        else if (lang === 'bash' || lang === 'sh') code.innerHTML = bash(text);
        else if (lang === 'http') code.innerHTML = esc(text).replace(/^([\w-]+):/gm, '<span class="tk-k">$1</span>:');

        var btn = document.createElement('button');
        btn.className = 'copy';
        btn.type = 'button';
        btn.textContent = 'copy';
        btn.addEventListener('click', function () {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = 'copied';
            setTimeout(function () { btn.textContent = 'copy'; }, 1200);
          });
        });
        pre.appendChild(btn);
      });

      // Copy the whole Markdown for pasting into an LLM. Prefetched so the click handler can
      // write to the clipboard right away (Safari rejects writes after an await).
      var copyMd = document.getElementById('copy-md');
      var label = copyMd.querySelector('.btn-label');
      var markdown = null;
      fetch('/api-docs.md').then(function (r) { return r.text(); }).then(function (md) { markdown = md; });
      copyMd.addEventListener('click', function () {
        if (!markdown || !navigator.clipboard) { window.location.href = '/api-docs.md'; return; }
        navigator.clipboard.writeText(markdown).then(function () {
          label.textContent = 'Copied ✓';
          setTimeout(function () { label.textContent = 'Copy for LLM'; }, 1600);
        }, function () { window.location.href = '/api-docs.md'; });
      });
    })();
    """
  end
end
