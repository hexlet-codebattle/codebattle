defmodule CodebattleWeb.OgImage do
  @moduledoc """
  Shared frame for the 1200×630 link-preview cards (Open Graph / Twitter / Telegram)
  rendered to PNG by `CodebattleWeb.HtmlImage`.
  """

  alias CodebattleWeb.HtmlImage

  @mono_font_css "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@500;700&display=block"

  @level_colors %{
    "elementary" => "#4dabf7",
    "easy" => "#51cf66",
    "medium" => "#ff922b",
    "hard" => "#ff6b6b"
  }

  @doc "HTML-escapes user-provided text (names, titles) before it goes into the card."
  def esc(nil), do: ""
  def esc(value), do: value |> to_string() |> Phoenix.HTML.html_escape() |> Phoenix.HTML.safe_to_string()

  def level_color(level), do: Map.get(@level_colors, level, "#adb5bd")

  def level_label(level) when is_binary(level) and level != "",
    do: Gettext.gettext(CodebattleWeb.Gettext, String.capitalize(level))

  def level_label(_level), do: ""

  @doc "A pill in the footer row; `dot` adds a colored (optionally pulsing) indicator."
  def chip(text, opts \\ []) do
    dot =
      case Keyword.get(opts, :dot) do
        nil -> ""
        color -> ~s(<span class="dot" style="background:#{color};box-shadow:0 0 14px #{color}"></span>)
      end

    ~s(<span class="chip #{Keyword.get(opts, :class, "")}">#{dot}#{text}</span>)
  end

  @doc "Avatar with a lettered fallback for players without a picture (bots, guests)."
  def avatar(player, class \\ "avatar") do
    case player do
      %{avatar_url: url} when is_binary(url) and url != "" ->
        ~s(<img class="#{class}" src="#{esc(url)}" alt="">)

      _ ->
        letter = player |> Map.get(:name, "?") |> to_string() |> String.first() |> Kernel.||("?")
        ~s(<div class="#{class} avatar-fallback">#{esc(String.upcase(letter))}</div>)
    end
  end

  @doc "Wraps `body` (the card's middle) and `chips` (footer pills) into the full page."
  def page(body, chips, extra_css \\ "") do
    """
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="#{@mono_font_css}" rel="stylesheet">
        <style>#{css()}#{extra_css}</style>
      </head>
      <body>
        <div class="glow glow-red"></div>
        <div class="glow glow-blue"></div>
        <div class="grid"></div>
        <header>
          <img class="logo" src="#{HtmlImage.logo_url()}" alt="Codebattle">
          <span class="site">codebattle.hexlet.io</span>
        </header>
        <main>#{body}</main>
        <footer>#{Enum.join(chips, "")}</footer>
      </body>
    </html>
    """
  end

  defp css do
    """
    @font-face {
      font-family: 'CB Display';
      src: url('#{HtmlImage.asset_url("fonts/CBDisplayBold.ttf")}') format('truetype');
      font-weight: 700;
      font-display: block;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 1200px;
      height: 630px;
      overflow: hidden;
    }
    body {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 44px 64px 48px;
      background: #0b0d12;
      color: #f1f3f5;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .glow { position: absolute; border-radius: 50%; filter: blur(110px); }
    .glow-red { width: 620px; height: 620px; left: -220px; top: -260px; background: rgba(219, 0, 0, 0.42); }
    .glow-blue { width: 560px; height: 560px; right: -200px; bottom: -280px; background: rgba(77, 171, 247, 0.28); }
    .grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
      background-size: 48px 48px;
      -webkit-mask-image: radial-gradient(ellipse at center, #000 30%, transparent 78%);
    }
    header, main, footer { position: relative; }
    header { display: flex; align-items: center; justify-content: space-between; height: 52px; }
    .logo { height: 46px; }
    .site, .mono, .chip { font-family: 'Source Code Pro', 'DejaVu Sans Mono', monospace; }
    .site { font-size: 22px; color: rgba(241, 243, 245, 0.55); letter-spacing: 0.04em; }
    main { flex: 1; display: flex; align-items: center; min-height: 0; }
    footer { display: flex; gap: 14px; align-items: center; height: 52px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      height: 52px;
      padding: 0 22px;
      border-radius: 26px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.06);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .chip.live { border-color: rgba(255, 82, 82, 0.6); background: rgba(255, 82, 82, 0.14); color: #ffa8a8; }
    .chip.cta { border: none; background: #db0000; color: #fff; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .display { font-family: 'CB Display', 'Helvetica Neue', Arial, sans-serif; font-weight: 700; }
    .ellipsis { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .avatar {
      width: 196px;
      height: 196px;
      border-radius: 32px;
      object-fit: cover;
      border: 4px solid rgba(255, 255, 255, 0.16);
      background: #1a1d24;
    }
    .avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'CB Display', sans-serif;
      font-size: 96px;
      color: rgba(255, 255, 255, 0.85);
      background: linear-gradient(135deg, #2b303b, #15181e);
    }
    """
  end
end
