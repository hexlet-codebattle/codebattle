defmodule CodebattleWeb.LayoutView do
  use CodebattleWeb, :view

  import Inertia.HTML

  @doc "The page's meta tags over the site defaults, see `CodebattleWeb.MetaTags`."
  def page_meta_tags(conn, assigns), do: CodebattleWeb.MetaTags.build(conn, assigns[:meta_tags])

  defdelegate render_tags_all(tags), to: CodebattleWeb.MetaTags

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

  def admin_navigation do
    [
      {nil, [{"Overview", "/admin", "OV"}]},
      {"Community",
       [
         {"Users", "/admin/users", "US"},
         {"Clans", "/admin/clans", "CL"},
         {"Invites", "/admin/invites", "IN"},
         {"Feedback", "/admin/feedback", "FB"}
       ]},
      {"Competition",
       [
         {"Events", "/admin/events", "EV"},
         {"Tournaments", "/admin/tournaments", "TR"},
         {"Seasons", "/admin/seasons", "SE"},
         {"Online games", "/admin/games", "OG"},
         {"Duplicate tournament", "/admin/tournament_duplicator", "DT"}
       ]},
      {"Operations",
       [
         {"Code checks", "/admin/code-checks", "CC"},
         {"Connections", "/admin/connections", "CN"},
         {"Feature flags", "/feature-flags", "FF"},
         {"Background jobs", "/admin/oban", "BJ"},
         {"System metrics", "/admin/dashboard", "SM"}
       ]}
    ]
  end

  def admin_nav_current(current_path, path) do
    current_path = String.trim_trailing(current_path, "/")

    cond do
      current_path == path -> "page"
      path != "/admin" and String.starts_with?(current_path, path <> "/") -> "location"
      true -> nil
    end
  end
end
