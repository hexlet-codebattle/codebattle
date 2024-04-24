defmodule CodebattleWeb.LayoutView do
  use CodebattleWeb, :view
  import PhoenixGon.View
  import CodebattleWeb.Router.Helpers

  @app_version Application.compile_env(:codebattle, :app_version)

  def get_next_path(conn) do
    next = conn.params["next"]

    case next do
      "" -> conn.request_path
      nil -> conn.request_path
      _ -> next
    end
  end

  def app_short_version do
    case @app_version do
      "" -> "undefined"
      version -> String.slice(version, 0, 7)
    end
  end

  def github_commit_link do
    case @app_version do
      "" -> "/"
      version -> "https://github.com/hexlet-codebattle/codebattle/commit/#{version}"
    end
  end

  def deployed_at do
    Application.get_env(:codebattle, :deployed_at)
  end

  def collab_logo(%{collab_logo: logo}) when not is_nil(logo), do: logo

  def collab_logo(_user) do
    Application.get_env(:codebattle, :collab_logo)
  end

  def collab_logo_minor(_user) do
    Application.get_env(:codebattle, :collab_logo_minor)
  end
end
