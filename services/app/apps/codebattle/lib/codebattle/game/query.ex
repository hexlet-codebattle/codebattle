defmodule Codebattle.Game.Query do
  alias Codebattle.Game
  alias Codebattle.Repo

  import Ecto.Query

  @spec fetch_score_by_game_id(Game.Context.raw_game_id()) :: map() | nil
  def fetch_score_by_game_id(id) do
    game = Game.Context.get_game!(id)

    case game.players do
      [%{id: first_player_id}, %{id: second_player_id}] ->
        game_results =
          from(
            g in Game,
            distinct: true,
            order_by: g.id,
            inner_join: ug1 in assoc(g, :user_games),
            inner_join: ug2 in assoc(g, :user_games),
            where: g.state == "game_over",
            where: ug1.user_id == ^first_player_id,
            where: ug2.user_id == ^second_player_id,
            select: %{
              id: g.id,
              inserted_at: g.inserted_at,
              result_one: ug1.result,
              result_two: ug2.result
            }
          )
          |> Repo.all()
          |> reduce_players_score(first_player_id, second_player_id)

        {first_score, second_score, results} = game_results

        winner_id =
          cond do
            first_score > second_score -> first_player_id
            first_score < second_score -> second_player_id
            true -> nil
          end

        %{
          winner_id: winner_id,
          player_results: %{
            to_string(first_player_id) => first_score,
            to_string(second_player_id) => second_score
          },
          game_results: Enum.reverse(results)
        }

      _ ->
        nil
    end
  end

  @spec get_completed_games(
          %{optional(:user_id) => integer()},
          %{
            page_number: integer(),
            page_size: integer(),
            total: boolean()
          }
        ) :: %{games: [map()], page_info: map()}
  def get_completed_games(filters, params) do
    result =
      completed_games_base_query()
      |> filter_completed_games(filters)
      |> Repo.paginate(%{
        page: params.page_number,
        page_size: params.page_size,
        total: params.total
      })

    %{
      games: result.entries,
      page_info: Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])
    }
  end

  defp completed_games_base_query() do
    from(
      g in Game,
      order_by: [desc: g.id],
      where: g.state == "game_over",
      where: g.mode == "standard",
      where: fragment("jsonb_array_length(?) = 2", g.players)
    )
  end

  defp filter_completed_games(query, %{user_id: user_id}) do
    query
    |> join(:inner, [g], ug in assoc(g, :user_games))
    |> where([g, ug], ug.user_id == ^user_id)
  end

  defp filter_completed_games(query, %{}), do: query

  defp reduce_players_score(games, first_player_id, second_player_id) do
    Enum.reduce(games, {0, 0, []}, fn elem, {first_score, second_score, acc} ->
      case {elem.result_one, elem.result_two} do
        {"won", _} ->
          {first_score + 1, second_score,
           [
             %{
               game_id: elem.id,
               inserted_at: elem.inserted_at,
               winner_id: first_player_id
             }
             | acc
           ]}

        {_, "won"} ->
          {first_score, second_score + 1,
           [
             %{
               game_id: elem.id,
               inserted_at: elem.inserted_at,
               winner_id: second_player_id
             }
             | acc
           ]}

        _ ->
          {first_score, second_score, acc}
      end
    end)
  end
end
