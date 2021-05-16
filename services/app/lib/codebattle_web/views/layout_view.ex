defmodule CodebattleWeb.LayoutView do
  use CodebattleWeb, :view
  import PhoenixGon.View
  import CodebattleWeb.Router.Helpers

  def get_next_path(conn) do
    next = conn.params["next"]

    case next do
      "" -> conn.request_path
      nil -> conn.request_path
      _ -> next
    end
  end

  def get_user_avatar_url(user) do
    cond do
      user.github_id ->
        "https://avatars0.githubusercontent.com/u/#{user.github_id}"

      user.discord_id ->
        "https://cdn.discordapp.com/avatars/#{user.discord_id}/#{user.discord_avatar}.png"

      true ->
        "https://avatars0.githubusercontent.com/u/35539033"
    end
  end
end
