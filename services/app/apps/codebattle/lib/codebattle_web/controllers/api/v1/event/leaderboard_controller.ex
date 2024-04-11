defmodule CodebattleWeb.Api.V1.Event.LeaderboardController do
  use CodebattleWeb, :controller

  def show(conn, params) do
    # TODO: find page_number from params or by user_id or clan_id
    # page Map.get(page) || find_by_user_clan_id
    items =
      case Map.get(params, "type", "clan") do
        # rating for all  clans without players
        # %{"clan_id" => clan_id} ->
        "clan" ->
          [
            %{
              place: 1,
              score: 10,
              players_count: 100,
              clan_id: 1,
              clan_name: "Clan1"
            },
            %{
              place: 2,
              score: 9,
              players_count: 102,
              clan_id: 2,
              clan_name: "Clan2"
            },
            %{
              place: 3,
              score: 8,
              players_count: 104,
              clan_id: 3,
              clan_name: "Clan3"
            }
          ]

        # rating for players in all clans
        # %{"user_id" => user_id} ->
        "player" ->
          [
            %{
              place: 1,
              score: 10,
              clan_id: 1,
              clan_name: "Clan1",
              user_name: "User1"
            },
            %{
              place: 2,
              score: 9,
              clan_id: 2,
              clan_name: "Clan2",
              user_name: "User2"
            },
            %{
              place: 3,
              score: 8,
              clan_id: 3,
              clan_name: "Clan3",
              user_name: "User3"
            }
          ]

        # rating for players only inside users clan
        "player_clan" ->
          # %{"user_id" => user_id, "clan_id" => clan_id} ->
          [
            %{
              place: 1,
              score: 10,
              clan_id: 1,
              clan_name: "Clan1",
              user_name: "User1"
            },
            %{
              place: 2,
              score: 9,
              clan_id: 1,
              clan_name: "Clan1",
              user_name: "User2"
            },
            %{
              place: 3,
              score: 8,
              clan_id: 1,
              clan_name: "Clan1",
              user_name: "User3"
            }
          ]

        _ ->
          []
      end

    # filters =
    #   case Map.get(params, "user_id") do
    #     nil -> %{}
    #     user_id -> %{user_id: user_id}
    #   end

    # filters =
    #   case Map.get(params, "clan_id") do
    #     nil -> %{}
    #     clan_id -> %{clan_id: clan_id}
    #   end

    # page_number = params |> Map.get("page", "1") |> String.to_integer() |> min(100)
    # page_size = params |> Map.get("page_size", "20") |> String.to_integer() |> min(100)

    # %{games: games, page_info: page_info} =
    #   Game.Query.get_completed_games(
    #     filters,
    #     %{page_number: page_number, page_size: page_size, total: true}
    #   )

    json(conn, %{
      items: items,
      page_info: %{
        "page_number" => 1,
        "page_size" => 20,
        "total_entries" => 2,
        "total_pages" => 1
      }
    })
  end
end
