defmodule Codebattle.Tournament.Stairway do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    if rem(players_count(tournament), 2) == 0 do
      tournament
    else
      bots = Bot.Context.build_list(41)
      add_players(tournament, %{users: bots})
      # bot = Bot.Context.build()
      # add_players(tournament, %{users: [bot]})
    end
  end

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_matches(tournament) do
    new_matches =
      tournament
      |> get_players()
      |> Enum.chunk_every(2)
      |> Enum.with_index(tournament.current_round * players_count(tournament))
      |> Enum.map(fn {[p1, p2], index} ->
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

    update!(tournament, %{matches: new_matches})
  end

  @impl Tournament.Base
  def maybe_finish(tournament) do
    if final_round?(tournament) do
      new_tournament = update!(tournament, %{state: "finished"})

      # Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
      new_tournament
    else
      tournament
    end
  end

  defp final_round?(tournament) do
    tournament.meta.rounds_limit == tournament.current_round
  end
end
