defmodule CodebattleWeb.Api.V1.Event.LeaderboardController do
  use CodebattleWeb, :controller

  alias Codebattle.Repo
  alias Codebattle.Clan.Scope
  alias Codebattle.Event.EventClanResult
  alias Codebattle.Event.EventResult
  @page_size 10

  def show(conn, params) do
    page_number =
      case Map.get(params, "page_number") do
        nil -> nil
        "" -> nil
        page -> page |> cast_int() |> min(2000)
      end

    page_size = params |> Map.get("page_size") |> cast_int(@page_size) |> min(20)
    event_id = params |> Map.get("id") |> cast_int(1)
    clan_id = cast_int(params["clan_id"], 1)
    user_id = cast_int(params["user_id"], 1)

    response =
      case Map.get(params, "type", "clan") do
        # rating for all clans without players
        # %{"clan_id" => clan_id} ->
        "clan" ->
          get_by_clan(event_id, clan_id, page_size, page_number)

        # rating for players in all clans
        # %{"user_id" => user_id} ->
        "player" ->
          get_by_player(event_id, user_id, page_size, page_number)

        # rating for players only inside users clan
        "player_clan" ->
          # %{"user_id" => user_id, "clan_id" => clan_id} ->
          get_by_clan_palyer(event_id, clan_id, user_id, page_size, page_number)

        _ ->
          %{
            items: [],
            page_info: %{page_number: 0, page_size: 0, total_entries: 0, total_pages: 0}
          }
      end

    json(conn, response)
  end

  defp get_by_clan(event_id, clan_id, page_size, page_number) do
    result =
      event_id
      |> EventClanResult.get_by_clan_id(clan_id, page_size, page_number)
      |> case do
        result = %{entries: [_ | _]} ->
          result

        _ ->
          default_page_number = cast_int(page_number, 1)

          Scope.by_clan()
          |> Repo.paginate(%{page: default_page_number, page_size: page_size, total: true})
      end

    page_info = Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])

    %{
      clan_id: clan_id,
      items: result.entries,
      page_info: page_info
    }
  end

  defp get_by_player(event_id, user_id, page_size, page_number) do
    result =
      event_id
      |> EventResult.get_by_user_id(user_id, page_size, page_number)
      |> case do
        result = %{entries: [_ | _]} ->
          result

        _ ->
          default_page_number = cast_int(page_number, 1)

          Scope.by_player()
          |> Repo.paginate(%{page: default_page_number, page_size: page_size, total: true})
      end

    page_info = Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])

    %{
      user_id: user_id,
      items: result.entries,
      page_info: page_info
    }
  end

  defp get_by_clan_palyer(event_id, clan_id, user_id, page_size, page_number) do
    result =
      event_id
      |> EventResult.get_by_user_id_and_clan_id(user_id, clan_id, page_size, page_number)
      |> case do
        result = %{entries: [_ | _]} ->
          result

        _ ->
          default_page_number = cast_int(page_number, 1)

          clan_id
          |> Scope.by_player_clan()
          |> Repo.paginate(%{page: default_page_number, page_size: page_size, total: true})
      end

    page_info = Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])

    %{
      clan_id: clan_id,
      user_id: user_id,
      items: result.entries,
      page_info: page_info
    }
  end

  defp cast_int(value, default \\ nil)
  defp cast_int(nil, default), do: default
  defp cast_int("", default), do: default
  defp cast_int(int, _default) when is_integer(int), do: int

  defp cast_int(str, default) when is_binary(str) do
    String.to_integer(str)
  rescue
    _e -> default || 1
  end

  defp cast_int(_, default), do: default
end
