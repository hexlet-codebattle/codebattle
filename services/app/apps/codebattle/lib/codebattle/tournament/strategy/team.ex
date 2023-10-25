defmodule Codebattle.Tournament.Team do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

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
  def default_meta(),
    do: %{
      rounds_to_win: 3,
      round_results: %{},
      teams: %{
        Tournament.Helpers.to_id(0) => %{id: 0, title: "Backend", score: 0.0},
        Tournament.Helpers.to_id(1) => %{id: 1, title: "Frontend", score: 0.0}
      }
    }

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    current_round = tournament.current_round

    round_result =
      tournament
      |> get_round_matches(current_round)
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
      update_in(tournament.meta.round_results, &Map.put(&1, to_id(current_round), round_result))

    new_tournament = update_in(new_tournament.meta.teams[to_id(0)].score, &(&1 + team_0_score))
    update_in(new_tournament.meta.teams[to_id(1)].score, &(&1 + team_1_score))
  end

  @impl Tournament.Base
  def build_matches(tournament) do
    new_matches =
      tournament
      |> get_players()
      |> Enum.group_by(&Map.get(&1, :team_id))
      |> Map.values()
      |> shift_pairs(tournament)
      |> Enum.zip()
      |> Enum.with_index(tournament.current_round * players_count(tournament, 0))
      |> Enum.map(fn {{p1, p2}, index} ->
        game_id =
          create_game(tournament, index, [Tournament.Player.new!(p1), Tournament.Player.new!(p2)])

        %Tournament.Match{
          id: index,
          game_id: game_id,
          state: "playing",
          player_ids: [p1.id, p2.id],
          round: tournament.current_round
        }
      end)
      |> Enum.reduce(tournament.matches, fn match, acc ->
        Map.put(acc, to_id(match.id), match)
      end)

    update_struct(tournament, %{matches: new_matches})
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    scores = tournament |> get_teams() |> Enum.map(& &1.score)

    Enum.max(scores) >= Map.get(tournament.meta, :rounds_to_win, 3)
  end

  defp shift_pairs(teams, tournament) do
    teams
    |> Enum.with_index()
    |> Enum.map(fn {players, index} ->
      Utils.right_rotate(players, index * (tournament.current_round - 1))
    end)
  end
end
