defmodule CodebattleWeb.LayoutView do
  use CodebattleWeb, :view

  import Inertia.HTML

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
