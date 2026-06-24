defmodule CodebattleWeb.SupportTournamentView do
  @moduledoc false

  @styles ~S"""
  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(70, 160, 119, 0.18), transparent 32rem),
      radial-gradient(circle at bottom right, rgba(71, 117, 145, 0.2), transparent 34rem),
      #11131a;
    color: #eef2f7;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  }

  .shell { max-width: 1180px; margin: 0 auto; padding: 32px 16px 48px; }

  .hero, .panel {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(28, 30, 40, 0.92);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
    gap: 28px;
    align-items: end;
    padding: 32px;
  }

  .eyebrow {
    color: #86d0af;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .title { margin: 8px 0 10px; color: #fff; font-size: clamp(2rem, 4vw, 3.25rem); font-weight: 800; line-height: 1.02; }
  .subtitle { max-width: 620px; margin: 0; color: #b9c0cc; font-size: 1rem; line-height: 1.6; }

  .search { padding: 18px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(14, 16, 23, 0.72); }
  .label { display: block; margin-bottom: 8px; color: #d8dde6; font-size: 0.86rem; font-weight: 700; }
  .search-row { display: flex; gap: 10px; }

  .input {
    min-width: 0; flex: 1; height: 44px;
    border: 1px solid #3f4658; border-radius: 8px;
    background: #151821; color: #fff; padding: 0 14px; outline: none;
  }
  .input:focus { border-color: #86d0af; box-shadow: 0 0 0 3px rgba(134, 208, 175, 0.16); }

  .button {
    display: inline-flex; align-items: center; justify-content: center;
    height: 44px; min-width: 96px; border: 0; border-radius: 8px;
    background: #46a077; color: #fff; font-weight: 800; cursor: pointer;
  }
  .button:hover, .button:focus { background: #398862; color: #fff; }

  .panel { margin-top: 22px; padding: 24px; }

  .markdown { color: #d9dee7; font-size: 1rem; line-height: 1.62; }
  .markdown > :last-child { margin-bottom: 0; }
  .markdown h1, .markdown h2, .markdown h3 { margin: 1.5rem 0 0.8rem; color: #fff; font-weight: 800; line-height: 1.2; }
  .markdown h3 { padding-top: 0.8rem; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 1.25rem; }
  .markdown a { color: #86d0af; font-weight: 800; text-decoration: none; }
  .markdown a:hover { color: #fff; text-decoration: underline; }
  .markdown code { border-radius: 6px; background: rgba(255, 255, 255, 0.08); color: #fff; padding: 0.1rem 0.35rem; }
  .markdown ul, .markdown ol { padding-left: 1.4rem; }

  .alert {
    margin-top: 22px; border: 1px solid rgba(220, 53, 69, 0.45); border-radius: 8px;
    background: rgba(220, 53, 69, 0.12); color: #ffd6dc; padding: 14px 16px; font-weight: 700;
  }

  .section { margin-top: 28px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
  .section-title { margin: 0; color: #fff; font-size: 1.28rem; font-weight: 800; }
  .count { min-width: 34px; border-radius: 999px; background: rgba(134, 208, 175, 0.14); color: #a9e3c8; padding: 4px 10px; text-align: center; font-weight: 800; }

  .user-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .stat { min-width: 0; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; background: #151821; padding: 14px; }
  .stat-label { margin-bottom: 6px; color: #8f98a8; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
  .stat-value { overflow-wrap: anywhere; color: #fff; font-size: 1rem; font-weight: 700; }
  .auth-link { margin-top: 12px; }
  .auth-link .token { margin-top: 8px; }

  .table-wrap { overflow-x: auto; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; }
  table { width: 100%; margin: 0; border-collapse: collapse; color: #eef2f7; }
  th, td { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 13px 14px; text-align: left; vertical-align: middle; }
  th { background: #151821; color: #9aa4b5; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; white-space: nowrap; }
  tbody tr:last-child td { border-bottom: 0; }

  .muted { color: #9aa4b5; }

  .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 0.78rem; font-weight: 800; }
  .pill-success { background: rgba(70, 160, 119, 0.16); color: #99e1bf; }
  .pill-muted { background: rgba(154, 164, 181, 0.14); color: #c5ccd8; }

  .token { display: flex; align-items: center; gap: 8px; min-width: 280px; }
  .token code { min-width: 0; overflow-wrap: anywhere; border-radius: 6px; background: rgba(255, 255, 255, 0.07); color: #fff; padding: 6px 8px; font-size: 0.86rem; }
  .copy { flex: 0 0 auto; height: 34px; padding: 0 10px; border: 1px solid #4c5369; border-radius: 8px; background: transparent; color: #cbd3df; cursor: pointer; font-weight: 700; }
  .copy:hover, .copy:focus { border-color: #86d0af; color: #fff; }

  @media (max-width: 900px) {
    .hero { grid-template-columns: 1fr; padding: 24px; }
    .user-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 560px) {
    .shell { padding: 16px 10px 32px; }
    .hero, .panel { padding: 18px; }
    .search-row { flex-direction: column; }
    .button, .input { width: 100%; }
    .user-grid { grid-template-columns: 1fr; }
  }
  """

  @doc "Renders the full standalone HTML document for the support tournament page."
  def page(assigns) do
    """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex, nofollow" />
      <title>Tournament Support</title>
      <style>#{@styles}</style>
    </head>
    <body>
      <main class="shell">
        <section class="hero">
          <div>
            <div class="eyebrow">Tournament operations</div>
            <h1 class="title">Tournament Support</h1>
            <p class="subtitle">Look up a user to inspect tournament participation and access tokens.</p>
          </div>
          <form action="/support-tournament" method="post" class="search">
            <input type="hidden" name="_csrf_token" value="#{esc(assigns.csrf_token)}" />
            <input type="hidden" name="auth_token" value="#{esc(assigns.auth_token)}" />
            <label class="label" for="user_id">User ID</label>
            <div class="search-row">
              <input type="number" name="user_id" id="user_id" class="input" placeholder="100001"
                required min="1" value="#{esc(assigns.user_id)}" autofocus />
              <button type="submit" class="button">Find</button>
            </div>
          </form>
        </section>
        #{markdown_section(assigns.text)}
        #{error_section(assigns.error)}
        #{result_sections(assigns.result)}
      </main>
    </body>
    </html>
    """
  end

  def render_markdown(nil), do: ""
  def render_markdown(""), do: ""
  def render_markdown(text), do: Earmark.as_html!(text, compact_output: true)

  defp markdown_section(text) when text in [nil, ""], do: ""

  defp markdown_section(text) do
    ~s(<section class="panel markdown">#{render_markdown(text)}</section>)
  end

  defp error_section(nil), do: ""
  defp error_section(error), do: ~s(<div class="alert">#{esc(error)}</div>)

  defp result_sections(nil), do: ""

  defp result_sections(result) do
    user_section(result.user) <>
      tournaments_section(result.tournaments) <>
      group_tournaments_section(result.group_tournaments)
  end

  defp user_section(user) do
    """
    <section class="panel section">
      <div class="section-header"><h2 class="section-title">User</h2></div>
      <div class="user-grid">
        #{stat("id", user.id)}
        #{stat("name", user.name)}
        #{stat("clan", user.clan)}
        #{stat("clan_id", user.clan_id)}
      </div>
      #{auth_link_field(user.auth_token)}
    </section>
    """
  end

  defp auth_link_field(token) when token in [nil, ""], do: ""

  defp auth_link_field(token) do
    """
    <div class="stat auth-link">
      <div class="stat-label">auth link</div>
      #{copy_field(auth_link(token))}
    </div>
    """
  end

  defp auth_link(token) do
    CodebattleWeb.Router.Helpers.auth_url(CodebattleWeb.Endpoint, :token, t: String.trim(token))
  end

  defp stat(label, value) do
    ~s(<div class="stat"><div class="stat-label">#{esc(label)}</div><div class="stat-value">#{present(value)}</div></div>)
  end

  defp tournaments_section(tournaments) do
    section("Tournaments", length(tournaments), tournaments, "No tournaments configured.", fn ->
      rows =
        Enum.map_join(tournaments, "", fn t ->
          "<tr><td>#{esc(t.id)}</td><td>#{esc(t.name)}</td><td>#{present_pill(t.present)}</td></tr>"
        end)

      ~s(<table><thead><tr><th>id</th><th>name</th><th>present in players</th></tr></thead><tbody>#{rows}</tbody></table>)
    end)
  end

  defp group_tournaments_section(group_tournaments) do
    section("Group Tournaments", length(group_tournaments), group_tournaments, "No group tournaments configured.", fn ->
      rows =
        Enum.map_join(group_tournaments, "", fn gt ->
          "<tr><td>#{esc(gt.id)}</td><td>#{esc(gt.name)}</td><td>#{present(gt.user_id)}</td><td>#{token_cell(gt.token)}</td></tr>"
        end)

      ~s(<table><thead><tr><th>id</th><th>name</th><th>user_id</th><th>token</th></tr></thead><tbody>#{rows}</tbody></table>)
    end)
  end

  defp section(title, count, items, empty_text, table_fun) do
    body =
      if items == [] do
        ~s(<p class="muted">#{esc(empty_text)}</p>)
      else
        ~s(<div class="table-wrap">#{table_fun.()}</div>)
      end

    """
    <section class="panel section">
      <div class="section-header">
        <h2 class="section-title">#{esc(title)}</h2>
        <span class="count">#{count}</span>
      </div>
      #{body}
    </section>
    """
  end

  defp present_pill(true), do: ~s(<span class="pill pill-success">yes</span>)
  defp present_pill(_present), do: ~s(<span class="pill pill-muted">no</span>)

  defp token_cell(nil), do: ~s(<span class="pill pill-muted">not found</span>)
  defp token_cell(token), do: copy_field(token)

  defp copy_field(value) do
    safe = esc(value)

    """
    <div class="token">
      <code>#{safe}</code>
      <button type="button" class="copy" data-token="#{safe}"
        onclick="if (navigator.clipboard) { navigator.clipboard.writeText(this.dataset.token); this.textContent='Copied'; setTimeout(() => { this.textContent='Copy'; }, 1200); }">Copy</button>
    </div>
    """
  end

  defp present(value) when value in [nil, ""], do: "—"
  defp present(value), do: esc(value)

  defp esc(value), do: value |> to_string() |> Plug.HTML.html_escape()
end
