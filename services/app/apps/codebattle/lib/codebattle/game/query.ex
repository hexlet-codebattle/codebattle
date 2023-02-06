defmodule Codebattle.Game.Query do
  alias Codebattle.Game
  alias Codebattle.Repo

  import Ecto.Query

  @spec fetch_score_by_game_id(non_neg_integer) :: map() | nil
  def fetch_score_by_game_id(id) do
    game = Game.Context.get_game!(id)

    case game.players do
      [%{id: opponent_one_id}, %{id: opponent_two_id}] ->
        game_results =
          from(
            g in Game,
            distinct: true,
            order_by: g.id,
            inner_join: ug1 in assoc(g, :user_games),
            inner_join: ug2 in assoc(g, :user_games),
            where: g.state == "game_over",
            where: ug1.user_id == ^opponent_one_id,
            where: ug2.user_id == ^opponent_two_id,
            select: %{
              id: g.id,
              inserted_at: g.inserted_at,
              result_one: ug1.result,
              result_two: ug2.result
            }
          )
          |> Repo.all()
          |> Enum.reduce({0, 0, []}, fn elem, {score_one, score_two, acc} ->
            case {elem.result_one, elem.result_two} do
              {"won", _} ->
                {score_one + 1, score_two,
                 [
                   %{
                     game_id: elem.id,
                     inserted_at: elem.inserted_at,
                     winner_id: opponent_one_id
                   }
                   | acc
                 ]}

              {_, "won"} ->
                {score_one, score_two + 1,
                 [
                   %{
                     game_id: elem.id,
                     inserted_at: elem.inserted_at,
                     winner_id: opponent_two_id
                   }
                   | acc
                 ]}

              _ ->
                {score_one, score_two, acc}
            end
          end)

        {score_one, score_two, results} = game_results

        winner_id =
          cond do
            score_one > score_two -> opponent_one_id
            score_one < score_two -> opponent_two_id
            true -> nil
          end

        %{
          winner_id: winner_id,
          player_results: %{
            to_string(opponent_one_id) => score_one,
            to_string(opponent_two_id) => score_two
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
            page_size: integer()
          }
        ) :: %{games: [map()], page_info: map()}
  def get_completed_games(filters, params) do
    result =
      completed_games_base_query()
      |> filter_completed_games(filters)
      |> Repo.paginate(%{page: params.page_number, page_size: params.page_size})

    %{
      games: result.entries,
      page_info: Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])
    }
  end

  defp completed_games_base_query() do
    from(
      g in Game,
      distinct: true,
      order_by: [desc_nulls_last: g.finishes_at],
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
end
