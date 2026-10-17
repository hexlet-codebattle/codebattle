defmodule CodebattleWeb.OgImage do
  @moduledoc """
  Shared frame for the 1200×630 link-preview cards (Open Graph / Twitter / Telegram)
  rendered to PNG by `CodebattleWeb.HtmlImage`, in the black-and-gold style of the
  stock card (static/images/opengraph-main.jpg).
  """

  alias CodebattleWeb.HtmlImage

  @mono_font_css "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@500;700&display=block"

  @level_colors %{
    "elementary" => "#4dabf7",
    "easy" => "#51cf66",
    "medium" => "#ff922b",
    "hard" => "#ff6b6b"
  }

  # The Grand Slam grade colour (--cb-grade-grand_slam) as a metallic gradient.
  @gold "linear-gradient(180deg, #fff6dc 0%, #f3dc9f 22%, #e0bf7a 45%, #b8903c 62%, #e6c985 80%, #fff0c8 100%)"

  # Grade cups inlined as data URIs: Chrome won't apply a cross-origin mask-image.
  @grades ~w(rookie challenger pro elite masters grand_slam)
  @grades_dir Path.expand("../../static/images/grades", __DIR__)
  for grade <- @grades, do: @external_resource(Path.join(@grades_dir, "#{grade}.svg"))

  @grade_cups Map.new(@grades, fn grade ->
                svg = File.read!(Path.join(@grades_dir, "#{grade}.svg"))
                {grade, "data:image/svg+xml;base64," <> Base.encode64(svg)}
              end)

  # The container's Chromium has no emoji font, so chip icons are inline SVG.
  @icons %{
    clock: ~s(<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>),
    trophy: ~s(<path d="M8 21h8M12 17v4M7 4h10M17 4v8a5 5 0 0 1-10 0V4M5 9a2 2 0 1 1 0-4h2M19 9a2 2 0 1 0 0-4h-2"/>)
  }

  # Gold dust, seeded so a card renders the same every time.
  @dust 7
        |> Stream.iterate(&rem(&1 * 16_807, 2_147_483_647))
        |> Stream.drop(1)
        |> Enum.take(280)
        |> Enum.chunk_every(4)
        |> Enum.map_join(fn [x, y, r, o] ->
          radius = Float.round(0.6 + r / 2_147_483_647 * 1.6, 2)
          opacity = Float.round(0.12 + o / 2_147_483_647 * 0.45, 2)
          ~s(<circle cx="#{rem(x, 1200)}" cy="#{rem(y, 630)}" r="#{radius}" opacity="#{opacity}"/>)
        end)

  @doc "HTML-escapes user-provided text (names, titles) before it goes into the card."
  def esc(nil), do: ""
  def esc(value), do: value |> to_string() |> Phoenix.HTML.html_escape() |> Phoenix.HTML.safe_to_string()

  def level_color(level), do: Map.get(@level_colors, level, "#adb5bd")

  def level_label(level) when is_binary(level) and level != "",
    do: Gettext.gettext(CodebattleWeb.Gettext, String.capitalize(level))

  def level_label(_level), do: ""

  @doc "Meta tags for a page whose preview is one of these cards."
  def meta_image(url) do
    %{image: url, "og:image:width": 1200, "og:image:height": 630, "og:image:type": "image/png"}
  end

  @doc """
  A pill in the footer row; `dot` adds a colored indicator, `icon` (`:clock`, `:trophy`)
  a leading glyph.
  """
  def chip(text, opts \\ []) do
    dot =
      case Keyword.get(opts, :dot) do
        nil -> ""
        color -> ~s(<span class="dot" style="background:#{color};box-shadow:0 0 14px #{color}"></span>)
      end

    icon =
      case Keyword.get(opts, :icon) do
        nil -> ""
        name -> ~s(<svg class="icon" viewBox="0 0 24 24">#{Map.fetch!(@icons, name)}</svg>)
      end

    ~s(<span class="chip #{Keyword.get(opts, :class, "")}">#{dot}#{icon}#{text}</span>)
  end

  @doc """
  Avatar with a lettered fallback for players without a picture (bots, guests); the
  letter also shows through when the picture fails to load.
  """
  def avatar(player, class \\ "avatar") do
    letter = player |> Map.get(:name, "?") |> to_string() |> String.first() |> Kernel.||("?")

    img =
      case player do
        %{avatar_url: url} when is_binary(url) and url != "" ->
          ~s|<img src="#{esc(url)}" alt="" onerror="this.remove()">|

        _ ->
          ""
      end

    ~s(<div class="#{class} avatar-fallback">#{esc(String.upcase(letter))}#{img}</div>)
  end

  @doc "The gold cup of a tournament grade, or nothing for open / ungraded ones."
  def grade_cup(grade, class \\ "cup") do
    case Map.fetch(@grade_cups, grade) do
      {:ok, uri} -> ~s|<div class="#{class}" style="-webkit-mask-image:url('#{uri}')"></div>|
      :error -> ""
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
        <div class="glow glow-gold"></div>
        <div class="glow glow-red"></div>
        <div class="rays"></div>
        <svg class="dust" viewBox="0 0 1200 630" fill="#f0d79a">#{@dust}</svg>
        <header>
          #{brand()}
          <span class="site">codebattle.hexlet.io</span>
        </header>
        <main>#{body}</main>
        <footer>#{Enum.join(chips, "")}</footer>
      </body>
    </html>
    """
  end

  # The wordmark goes with our own logo only, not a collab one.
  defp brand do
    logo = ~s(<img class="logo" src="#{HtmlImage.logo_url()}" alt="Codebattle">)

    if Application.get_env(:codebattle, :collab_logo) do
      ~s(<div class="brand">#{logo}</div>)
    else
      ~s(<div class="brand">#{logo}<i class="divider"></i><span class="wordmark display gold">CODEBATTLE</span></div>)
    end
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
      background: #000;
      color: #f4f1ea;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .glow { position: absolute; border-radius: 50%; }
    .glow-gold {
      width: 900px; height: 900px; right: -260px; top: -200px;
      background: radial-gradient(circle, rgba(224, 191, 122, 0.2), transparent 62%);
    }
    .glow-red {
      width: 640px; height: 640px; left: -300px; top: -340px;
      background: radial-gradient(circle, rgba(219, 0, 0, 0.26), transparent 65%);
    }
    .rays {
      position: absolute; left: 600px; top: 315px; width: 1800px; height: 1800px;
      transform: translate(-50%, -50%);
      background: repeating-conic-gradient(rgba(224, 191, 122, 0.05) 0deg 2deg, transparent 2deg 11deg);
      -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 40%);
    }
    .dust { position: absolute; inset: 0; }
    header, main, footer { position: relative; }
    header { display: flex; align-items: center; justify-content: space-between; height: 52px; }
    .brand { display: flex; align-items: center; gap: 18px; }
    .logo { height: 44px; filter: drop-shadow(0 0 14px rgba(219, 0, 0, 0.5)); }
    .divider { width: 1px; height: 36px; background: linear-gradient(180deg, transparent, #e0bf7a, transparent); }
    .wordmark { font-size: 24px; letter-spacing: 7px; }
    .gold { background: #{@gold}; -webkit-background-clip: text; color: transparent; }
    .site, .mono, .chip { font-family: 'Source Code Pro', 'DejaVu Sans Mono', monospace; }
    .site { font-size: 20px; color: rgba(224, 191, 122, 0.6); letter-spacing: 0.04em; }
    main { flex: 1; display: flex; align-items: center; min-height: 0; }
    footer { display: flex; gap: 14px; align-items: center; height: 52px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      height: 52px;
      padding: 0 22px;
      border-radius: 26px;
      border: 1px solid rgba(224, 191, 122, 0.28);
      background: rgba(224, 191, 122, 0.07);
      color: #f4ead2;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .chip.live { border-color: rgba(255, 82, 82, 0.6); background: rgba(255, 82, 82, 0.14); color: #ffa8a8; }
    .chip.cta { border: none; background: #{@gold}; color: #14110a; box-shadow: 0 0 22px rgba(224, 191, 122, 0.45); }
    .icon {
      width: 24px; height: 24px; fill: none; stroke: #e0bf7a;
      stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .display { font-family: 'CB Display', 'Helvetica Neue', Arial, sans-serif; font-weight: 700; }
    .ellipsis { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .avatar {
      position: relative;
      overflow: hidden;
      width: 196px;
      height: 196px;
      border-radius: 32px;
      border: 4px solid rgba(224, 191, 122, 0.22);
      background: #15130f;
    }
    .avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'CB Display', sans-serif;
      font-size: 96px;
      color: rgba(244, 234, 210, 0.85);
      background: linear-gradient(135deg, #2a261d, #121010);
    }
    .cup {
      background: #{@gold};
      -webkit-mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center;
      filter: drop-shadow(0 0 6px rgba(255, 236, 190, 0.8)) drop-shadow(0 0 30px rgba(224, 191, 122, 0.55));
    }
    """
  end
end
