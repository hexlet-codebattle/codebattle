defmodule CodebattleWeb.LayoutView do
  use CodebattleWeb, :view

  import CodebattleWeb.Router.Helpers
  import PhoenixGon.View

  @app_version Application.compile_env(:codebattle, :app_version)
  @colors [
    "2AE881",
    "73CCFE",
    "B6A4FF",
    "FF621E",
    "FF9C41",
    "FFE500"
  ]

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

  def user_rank(user) do
    if Application.get_env(:codebattle, :use_event_rank) do
      # TODO: add user rating from event
      0
    else
      user.rank
    end
  end

  def user_rating(user) do
    if Application.get_env(:codebattle, :use_event_rating) do
      # TODO: add user rating from event
      0
    else
      user.rating
    end
  end

  def avatar_url(user) do
    user.avatar_url ||
      "https://ui-avatars.com/api/?name=#{user.name}&background=#{get_background_color(user)}&color=ffffff"
  end

  defp get_background_color(user) do
    Enum.at(@colors, rem(String.length(user.name), length(@colors)))
  end
end
