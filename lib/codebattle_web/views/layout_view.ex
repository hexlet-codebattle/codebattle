defmodule CodebattleWeb.LayoutView do
  use CodebattleWeb, :view

  import Inertia.HTML

  @google_fonts_href "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600;800&family=Montserrat:wght@400;700&family=Inter:wght@400..700&display=swap"

  @doc """
  Non-render-blocking Google Fonts loading for the document head.

  Previously the two font families were pulled in via `@import` inside the CSS
  bundle, which forces the browser to download and parse the stylesheet before it
  can even request the fonts (a render-blocking request chain). Preconnecting and
  loading the combined stylesheet asynchronously (`media="print"` + `onload`)
  removes fonts from the critical path; `<noscript>` keeps them working without JS.
  """
  def google_fonts_head do
    Phoenix.HTML.raw("""
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="#{@google_fonts_href}" media="print" onload="this.media='all'" />
    <noscript><link rel="stylesheet" href="#{@google_fonts_href}" /></noscript>
    """)
  end

  @doc "The page's meta tags over the site defaults, see `CodebattleWeb.MetaTags`."
  def page_meta_tags(conn, assigns), do: CodebattleWeb.MetaTags.build(conn, assigns[:meta_tags])

  def app_short_version do
    case Application.get_env(:codebattle, :app_version, "") do
      "" -> "undefined"
      version -> String.slice(version, 0, 7)
    end
  end

  def collab_logo(%{collab_logo: logo}) when not is_nil(logo), do: logo

  def collab_logo(_user) do
    Application.get_env(:codebattle, :collab_logo)
  end

  def collab_logo_minor(_user) do
    Application.get_env(:codebattle, :collab_logo_minor)
  end
end
