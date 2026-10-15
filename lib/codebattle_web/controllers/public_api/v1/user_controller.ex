defmodule CodebattleWeb.PublicApi.V1.UserController do
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers

  alias CodebattleWeb.Presence
  alias CodebattleWeb.PublicApi.V1.JSON

  # Same order the lobby uses to pick a user's state across several open tabs.
  @state_weight %{"online" => 0, "lobby" => 1, "task" => 2, "tournament" => 3, "watching" => 4, "playing" => 5}

  plug(:require_scope, "read")

  def online(conn, _params) do
    users =
      "main"
      |> Presence.list()
      |> Enum.flat_map(fn {_id, %{metas: metas}} -> online_user(metas) end)
      |> Enum.uniq_by(& &1.id)
      |> Enum.sort_by(&{-(&1.rating || 0), &1.name})

    conn |> no_store() |> json(%{users: users, server_time: JSON.server_time()})
  end

  defp online_user([%{user: %{is_guest: false, is_bot: false} = user} | _] = metas) do
    major = Enum.max_by(metas, &Map.get(@state_weight, &1[:state], 0))
    [JSON.online_user(user, major[:state] || "online", major[:link])]
  end

  defp online_user(_metas), do: []
end
