defmodule Codebattle.Tournament.Individual do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament) do
    bots_count =
      if players_count(tournament) > 1 do
        power = tournament |> players_count() |> :math.log2() |> ceil()
        round(:math.pow(2, power)) - players_count(tournament)
      else
        1
      end

    bots = Bot.Context.build_list(bots_count)

    add_players(tournament, %{users: bots})
  end

  @impl Tournament.Base
  def default_meta(), do: %{}

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament = %{current_round_position: 0}) do
    player_pairs =
      tournament
      |> get_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    last_round_matches =
      tournament
      |> get_round_matches(tournament.current_round_position - 1)
      |> Enum.sort_by(& &1.id)

    winner_ids = Enum.map(last_round_matches, &pick_winner_id(&1))

    player_pairs =
      tournament
      |> get_players(winner_ids)
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament), do: final_round?(tournament)

  defp final_round?(tournament) do
    players_count(tournament) == :math.pow(2, tournament.current_round_position + 1)
  end
end
