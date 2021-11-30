defmodule Codebattle.Tournament.Team do
  alias Codebattle.Game
  alias Codebattle.Tournament

  use Tournament.Base

  @team_rounds_need_to_win_num 3

  @impl Tournament.Base
  def join(%{state: "upcoming"} = tournament, %{user: user}) do
    add_intended_player_id(tournament, user.id)
  end

  @impl Tournament.Base
  def join(%{state: "waiting_participants"} = tournament, %{user: user, team_id: team_id}) do
    player =
      user
      |> Map.put(:team_id, team_id)
      |> Map.put(:lang, user.lang || tournament.default_language)

    add_player(tournament, player)
  end

  @impl Tournament.Base
  def join(tournament, _user), do: tournament

  @impl Tournament.Base
  def complete_players(%{meta: meta} = tournament) do
    team_players_count =
      meta
      |> Map.get(:teams)
      |> Enum.map(fn t -> {t[:id], players_count(tournament, t[:id])} end)

    {_, max_players_count} = team_players_count |> Enum.max_by(&elem(&1, 1))

    bots =
      team_players_count
      |> Enum.filter(fn {_, count} -> count < max_players_count end)
      |> Enum.reduce([], fn {team_id, count}, acc ->
        (max_players_count - count)
        |> Codebattle.Bot.Builder.build_list(%{team_id: team_id})
        |> Enum.concat(acc)
      end)

    new_players =
      tournament
      |> get_players
      |> Enum.concat(bots)
      |> Enum.sort_by(fn p -> p.team_id end)

    new_data =
      tournament
      |> Map.get(:data)
      |> Map.merge(%{players: new_players})
      |> Map.from_struct()

    update!(tournament, %{data: new_data})
  end

  @impl Tournament.Base
  def build_matches(tournament) do
    matches_for_round =
      tournament
      |> get_players()
      |> Enum.chunk_by(&Map.get(&1, :team_id))
      |> shift_pairs(tournament)
      |> Enum.zip()
      |> Enum.map(fn {p1, p2} ->
        %{state: "pending", players: [p1, p2], round_id: tournament.step}
      end)

    prev_matches =
      tournament
      |> get_matches()
      |> Enum.map(&Map.from_struct/1)

    new_matches = prev_matches ++ matches_for_round

    new_data =
      tournament
      |> Map.get(:data)
      |> Map.merge(%{matches: new_matches})
      |> Map.from_struct()

    update!(tournament, %{data: new_data})
  end

  @impl Tournament.Base
  def maybe_finish(tournament) do
    {score1, score2} = calc_team_score(tournament)

    if max(score1, score2) >= @team_rounds_need_to_win_num do
      new_tournament = update!(tournament, %{state: "finished"})

      # Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
      new_tournament
    else
      tournament
    end
  end

  @impl Tournament.Base
  def create_game(tournament, match) do
    {:ok, game} =
      Game.Context.create_game(%{
        state: "playing",
        level: tournament.difficulty,
        tournament_id: tournament.id,
        timeout_seconds: tournament.match_timeout_seconds,
        players: match.players
      })

    game.id
  end

  defp shift_pairs(teams, tournament) do
    %{step: step} = tournament

    teams
    |> Enum.with_index()
    |> Enum.map(fn {players, index} ->
      Utils.right_rotate(players, index * (step - 1))
    end)
  end
end
