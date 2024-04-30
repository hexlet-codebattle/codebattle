defmodule Codebattle.Tournament.Versus do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament) do
    if rem(players_count(tournament), 2) == 0 do
      tournament
    else
      bot = Tournament.Player.new!(Bot.Context.build())

      Codebattle.PubSub.broadcast("tournament:player:joined", %{
        tournament: tournament,
        player: bot
      })

      add_players(tournament, %{users: [bot]})
    end
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def calculate_round_results(tournament), do: tournament

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    player_pairs =
      tournament
      |> get_players()
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, _params), do: tournament

  @impl Tournament.Base
  def finish_round_after_match?(tournament) do
    !Enum.any?(get_matches(tournament), &(&1.state == "playing"))
  end
end
