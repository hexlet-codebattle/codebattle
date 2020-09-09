defmodule Codebattle.Tournament.Individual do
  alias Codebattle.Repo
  alias Codebattle.Tournament

  use Tournament.Type

  @impl Tournament.Type
  def join(tournament, %{user: user}) do
    if is_waiting_partisipants?(tournament) do
      new_players =
        tournament.data.players
        |> Enum.concat([user])
        |> Enum.uniq_by(fn x -> x.id end)

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
  def complete_players(tournament) do
    bots_count = tournament.players_count - players_count(tournament)

    new_players =
      tournament
      |> get_players
      |> Enum.concat(Codebattle.Bot.Builder.build_list(bots_count))

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
    })
    |> Repo.update!()
  end

  @impl Tournament.Type
  def build_matches(%{step: 4} = tournament), do: tournament

  @impl Tournament.Type
  def build_matches(%{step: 0} = tournament) do
    players = tournament |> get_players |> Enum.shuffle()

    matches = pair_players_to_matches(players)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: matches})
    })
    |> Repo.update!()
  end

  @impl Tournament.Type
  def build_matches(tournament) do
    matches_range =
      case(tournament.step) do
        1 -> 0..7
        2 -> 8..11
        3 -> 12..13
      end

    matches = tournament |> get_matches |> Enum.map(&Map.from_struct/1)

    winners = Enum.map(matches_range, fn index -> pick_winner(Enum.at(matches, index)) end)
    new_matches = matches ++ pair_players_to_matches(winners)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
    })
    |> Repo.update!()
  end

  @impl Tournament.Type
  def maybe_finish(%{step: 4} = tournament) do
    new_tournament =
      tournament
      |> Tournament.changeset(%{state: "finished"})
      |> Repo.update!()

    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
    new_tournament
  end

  @impl Tournament.Type
  def maybe_finish(tournament), do: tournament

  defp pair_players_to_matches(players) do
    Enum.reduce(players, [%{}], fn player, acc ->
      player = Map.merge(player, %{game_result: "waiting"})

      case List.first(acc) do
        map when map == %{} ->
          [_h | t] = acc
          [%{state: "waiting", players: [player]} | t]

        match ->
          case(Enum.count(match.players)) do
            1 ->
              [_h | t] = acc
              [DeepMerge.deep_merge(match, %{players: match.players ++ [player]}) | t]

            _ ->
              [%{state: "waiting", players: [player]} | acc]
          end
      end
    end)
    |> Enum.reverse()
  end
end
