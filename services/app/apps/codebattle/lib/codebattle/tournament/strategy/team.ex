defmodule Codebattle.Tournament.Team do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament) do
    team_players_count =
      tournament
      |> get_teams()
      |> Enum.map(fn t -> {t[:id], players_count(tournament, t[:id])} end)

    {_, max_players_count} = Enum.max_by(team_players_count, &elem(&1, 1))

    bots =
      team_players_count
      |> Enum.filter(fn {_, count} -> count < max_players_count end)
      |> Enum.reduce([], fn {team_id, count}, acc ->
        (max_players_count - count)
        |> Bot.Context.build_list(%{team_id: team_id})
        |> Enum.concat(acc)
      end)

    Enum.reduce(
      bots,
      tournament,
      fn bot, tournament -> add_player(tournament, bot) end
    )
  end

  @impl Tournament.Base
  def reset_meta(meta) do
    new_teams = Enum.map(meta.teams, fn {id, team} -> {id, Map.merge(team, score: 0.0)} end)
    Map.merge(meta, %{round_results: %{}, teams: new_teams})
  end

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    current_round_position = tournament.current_round_position

    round_result =
      tournament
      |> get_round_matches(current_round_position)
      |> Enum.map(fn
        %{state: "game_over", player_ids: player_ids, winner_id: winner_id}
        when not is_nil(winner_id) ->
          team_id = Enum.find_index(player_ids, &(&1 == winner_id))
          List.insert_at([0], team_id, 1)

        _ ->
          [0, 0]
      end)
      |> Enum.reduce([0, 0], fn [x1, x2], [a1, a2] -> [x1 + a1, x2 + a2] end)
      |> case do
        [a, b] when a > b -> [1, 0]
        [a, b] when a < b -> [0, 1]
        _ -> [0.5, 0.5]
      end

    [team_0_score, team_1_score] = round_result

    new_tournament =
      update_in(
        tournament.meta.round_results,
        &Map.put(&1, to_id(current_round_position), round_result)
      )

    new_tournament = update_in(new_tournament.meta.teams[to_id(0)].score, &(&1 + team_0_score))
    update_in(new_tournament.meta.teams[to_id(1)].score, &(&1 + team_1_score))
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    player_pairs =
      tournament
      |> get_players()
      |> Enum.group_by(&Map.get(&1, :team_id))
      |> Map.values()
      |> shift_pairs(tournament.current_round_position)
      |> Enum.zip()
      |> Enum.map(fn {p1, p2} -> [p1, p2] end)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    scores = tournament |> get_teams() |> Enum.map(& &1.score)

    Enum.max(scores) >= Map.get(tournament.meta, :rounds_to_win, 3)
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, _params), do: tournament

  @impl Tournament.Base
  def set_ranking(t), do: t

  @impl Tournament.Base
  def finish_round_after_match?(tournament) do
    !Enum.any?(get_matches(tournament), &(&1.state == "playing"))
  end

  defp shift_pairs(teams, current_round) do
    teams
    |> Enum.with_index()
    |> Enum.map(fn {players, index} ->
      Utils.left_rotate(players, index * current_round)
    end)
  end
end
