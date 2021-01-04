defmodule Codebattle.Tournament.Team do
  alias Codebattle.Repo
  alias Codebattle.Tournament

  use Tournament.Type

  @team_rounds_need_to_win_num 3

  @impl Tournament.Type
  def join(tournament, %{user: user, team_id: team_id}) do
    if is_waiting_partisipants?(tournament) do
      user_params =
        user
        |> Map.put(:team_id, team_id)
        |> Map.put(:lang, user.lang || tournament.default_language)

      new_players =
        tournament.data.players
        |> Enum.filter(fn x -> x.id != user.id end)
        |> Enum.concat([user_params])

      tournament
      |> Tournament.changeset(%{
        data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
      })
      |> Repo.update!()
    else
      tournament
    end
  end

  @impl Tournament.Type
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

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
    })
    |> Repo.update!()
  end

  @impl Tournament.Type
  def build_matches(tournament) do
    matches_for_round =
      tournament
      |> get_players()
      |> Enum.chunk_by(&Map.get(&1, :team_id))
      |> Enum.map(&Enum.shuffle/1)
      |> Enum.zip()
      |> Enum.map(fn {p1, p2} ->
        %{state: "waiting", players: [p1, p2], round_id: tournament.step}
      end)

    prev_matches =
      tournament
      |> get_matches()
      |> Enum.map(&Map.from_struct/1)

    new_matches = prev_matches ++ matches_for_round

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
    })
    |> Repo.update!()
  end

  @impl Tournament.Type
  def maybe_finish(tournament) do
    {score1, score2} = calc_team_score(tournament)

    if max(score1, score2) >= @team_rounds_need_to_win_num do
      new_tournament =
        tournament
        |> Tournament.changeset(%{state: "finished"})
        |> Repo.update!()

      # Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
      new_tournament
    else
      tournament
    end
  end
end
