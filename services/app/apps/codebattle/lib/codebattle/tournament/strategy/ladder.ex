defmodule Codebattle.Tournament.Ladder do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(t), do: t

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament = %{current_round_position: 0}) do
    tournament
    |> get_players
    |> Enum.filter(&(!&1.is_bot))
    |> Enum.shuffle()
    |> build_player_pairs(tournament)
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    last_round_matches =
      tournament
      |> get_round_matches(tournament.current_round_position - 1)
      |> Enum.sort_by(& &1.id)

    winner_ids = Enum.map(last_round_matches, &pick_winner_id(&1))

    tournament |> get_players(winner_ids) |> build_player_pairs(tournament)
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
  end

  defp build_player_pairs(players, tournament) do
    if rem(Enum.count(players), 2) == 1 do
      bot = build_bot()
      Tournament.Players.put_player(tournament, bot)
      players = Enum.concat(players, [bot])

      {tournament, Enum.chunk_every(players, 2)}
    else
      {tournament, Enum.chunk_every(players, 2)}
    end
  end

  defp build_bot() do
    Tournament.Player.new!(Bot.Context.build())
  end
end
