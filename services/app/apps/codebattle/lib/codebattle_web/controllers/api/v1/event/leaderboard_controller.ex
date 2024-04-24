defmodule CodebattleWeb.Api.V1.Event.LeaderboardController do
  use CodebattleWeb, :controller

  alias Codebattle.Repo
  alias Codebattle.Clan.Scope

  def show(conn, params) do
    # TODO: find page_number from params or by user_id or clan_id
    # page Map.get(page) || find_by_user_clan_id

    page_number = params |> Map.get("page_number", "1") |> String.to_integer() |> min(2000)
    page_size = params |> Map.get("page_size", "10") |> String.to_integer() |> min(20)

    response =
      case Map.get(params, "type", "clan") do
        # rating for all clans without players
        # %{"clan_id" => clan_id} ->
        "clan" ->
          result =
            params
            |> Scope.by_clan()
            |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})

          page_info = Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])

          %{
            items: result.entries,
            page_info: page_info
          }

        # rating for players in all clans
        # %{"user_id" => user_id} ->
        "player" ->
          result =
            params
            |> Scope.by_player()
            |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})

          page_info = Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])

          %{
            items: result.entries,
            page_info: page_info
          }

        # rating for players only inside users clan
        "player_clan" ->
          # %{"user_id" => user_id, "clan_id" => clan_id} ->
          result =
            %{clan_id: params["clan_id"] || 1}
            |> Scope.by_player_clan()
            |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})

          page_info = Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])

          %{
            items: result.entries,
            page_info: page_info
          }

        _ ->
          %{
            items: [],
            page_info: %{page_number: 0, page_size: 0, total_entries: 0, total_pages: 0}
          }
      end

    json(conn, response)
  end
end
