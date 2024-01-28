defmodule Codebattle.Tournament.Show do
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    bot = Bot.Context.build()
    add_player(tournament, bot)
  end

  @impl Tournament.Base
  def default_meta, do: %{}

  @impl Tournament.Base
  def game_type, do: "solo"

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    player_pairs =
      tournament
      |> get_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament), do: final_round?(tournament)

  defp final_round?(
         tournament = %{
           task_provider: "task_pack",
           meta: %{task_ids: task_ids},
           current_round_position: position
         }
       ) do
    Enum.count(task_ids) == position + 1
  end

  defp final_round?(_tournament) do
    false
  end
end
