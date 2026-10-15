defmodule Codebattle.Game.Query do
  @moduledoc false
  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGame

  @spec fetch_head_to_head_by_game_id(Game.Context.raw_game_id()) :: map() | nil
  def fetch_head_to_head_by_game_id(id) do
    game = Game.Context.get_game!(id)

    case game.players do
      [%{id: first_player_id}, %{id: second_player_id}] ->
        build_head_to_head(first_player_id, second_player_id)

      _ ->
        nil
    end
  end

  @spec fetch_head_to_head_page_data(User.raw_id(), User.raw_id()) :: map()
  def fetch_head_to_head_page_data(user_id, opponent_id) do
    first_player = User.get!(user_id)
    second_player = User.get!(opponent_id)

    summary = build_head_to_head_summary(first_player.id, second_player.id)
    games = build_head_to_head_games(first_player.id, second_player.id)

    %{
      winner_id: summary.winner_id,
      total_games: summary.total_games,
      completed_games: summary.completed_games,
      draws: summary.draws,
      players: [
        build_head_to_head_player(first_player, summary.first_player_wins),
        build_head_to_head_player(second_player, summary.second_player_wins)
      ],
      games: games
    }
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

  defp completed_games_base_query do
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

  defp build_head_to_head(first_player_id, second_player_id) do
    %{first_player_wins: first_player_wins, second_player_wins: second_player_wins} =
      build_head_to_head_summary(first_player_id, second_player_id)

    winner_id =
      cond do
        first_player_wins > second_player_wins -> first_player_id
        first_player_wins < second_player_wins -> second_player_id
        true -> nil
      end

    %{
      winner_id: winner_id,
      players: [
        %{id: first_player_id, wins: first_player_wins},
        %{id: second_player_id, wins: second_player_wins}
      ]
    }
  end

  defp build_head_to_head_summary(first_player_id, second_player_id) do
    summary =
      Repo.one(
        from([g, ug1, ug2] in base_head_to_head_query(first_player_id, second_player_id),
          select: %{
            total_games: count(g.id),
            completed_games:
              fragment(
                "COALESCE(SUM(CASE WHEN ? = 'game_over' THEN 1 ELSE 0 END), 0)",
                g.state
              ),
            draws:
              fragment(
                """
                COALESCE(
                  SUM(
                    CASE
                      WHEN ? = 'game_over' AND ? <> 'won' AND ? <> 'won' THEN 1
                      ELSE 0
                    END
                  ),
                  0
                )
                """,
                g.state,
                ug1.result,
                ug2.result
              ),
            first_player_wins:
              fragment(
                "COALESCE(SUM(CASE WHEN ? = 'won' THEN 1 ELSE 0 END), 0)",
                ug1.result
              ),
            second_player_wins:
              fragment(
                "COALESCE(SUM(CASE WHEN ? = 'won' THEN 1 ELSE 0 END), 0)",
                ug2.result
              )
          }
        )
      ) || %{total_games: 0, completed_games: 0, draws: 0, first_player_wins: 0, second_player_wins: 0}

    winner_id =
      cond do
        summary.first_player_wins > summary.second_player_wins -> first_player_id
        summary.first_player_wins < summary.second_player_wins -> second_player_id
        true -> nil
      end

    Map.put(summary, :winner_id, winner_id)
  end

  defp build_head_to_head_games(first_player_id, second_player_id) do
    Repo.all(
      from([g, ug1, ug2] in base_head_to_head_query(first_player_id, second_player_id),
        order_by: [desc: g.inserted_at, desc: g.id],
        select: %{
          id: g.id,
          inserted_at: g.inserted_at,
          finishes_at: g.finishes_at,
          state: g.state,
          level: g.level,
          mode: g.mode,
          task_type: g.task_type,
          duration_sec: g.duration_sec,
          timeout_seconds: g.timeout_seconds,
          first_player_result: ug1.result,
          second_player_result: ug2.result
        }
      )
    )
  end

  defp base_head_to_head_query(first_player_id, second_player_id) do
    from(g in Game,
      join: ug1 in UserGame,
      on: ug1.game_id == g.id and ug1.user_id == ^first_player_id,
      join: ug2 in UserGame,
      on: ug2.game_id == g.id and ug2.user_id == ^second_player_id,
      where: fragment("jsonb_array_length(?) = 2", g.players)
    )
  end

  defp build_head_to_head_player(user, wins) do
    %{
      id: user.id,
      name: user.name,
      avatar_url: user.avatar_url,
      lang: user.lang,
      points: user.points,
      rating: user.rating,
      rank: user.rank,
      wins: wins
    }
  end
end
