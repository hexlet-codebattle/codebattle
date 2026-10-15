defmodule Codebattle.Tournament.Swiss do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Pairing

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament) do
    # just for the UI test
    # users =
    #   Codebattle.User
    #   |> Codebattle.Repo.all()
    #   |> Enum.filter(&(&1.is_bot == false))
    #   |> Enum.filter(&(&1.name && &1.name != ""))
    #   |> Enum.take(327)
    # add_players(tournament, %{users: users})

    tournament
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def finish_round_after_match?(tournament) do
    # The round closes as soon as its last game is done, whatever the field size.
    # The playing index answers this without copying any match out of ETS.
    not current_round_playing_matches?(tournament)
  end

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    tournament
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    played = tournament.played_pair_ids
    players = tournament |> get_players() |> Enum.filter(&pairable?/1) |> Pairing.sort(tournament)
    {tournament, bot} = get_or_build_tournament_bot(tournament)
    {bye_players, players} = Pairing.pick_bye(players, bot, played)
    {pairs, played} = pair_players(players, [], played)
    played = Pairing.record_byes(played, bye_players, bot)

    {
      update_struct(tournament, %{played_pair_ids: played}),
      pairs ++ Enum.map(bye_players, &[&1, bot])
    }
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.rounds_limit - 1 == tournament.current_round_position
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    Codebattle.PubSub.broadcast("tournament:game:wait", %{
      game_id: game_params.game_id,
      type: get_wait_type(tournament)
    })

    tournament
  end

  defp get_wait_type(tournament) do
    if finish_tournament?(tournament) do
      "tournament"
    else
      "round"
    end
  end

  defp pairable?(player), do: !player.is_bot and player.state != "banned"

  # Greedy Swiss: each player, top of the standings first, takes the nearest opponent they
  # haven't faced yet, or the nearest one at all when everyone left is a rematch. The
  # field is even here (the bye is taken out beforehand).
  defp pair_players([], pairs, played), do: {Enum.reverse(pairs), played}

  defp pair_players([player | rest], pairs, played) do
    index = Enum.find_index(rest, &(not Pairing.played?(played, player, &1))) || 0
    {before, [opponent | after_opponent]} = Enum.split(rest, index)

    pair_players(
      before ++ after_opponent,
      [[player, opponent] | pairs],
      Pairing.record(played, player, opponent)
    )
  end
end
