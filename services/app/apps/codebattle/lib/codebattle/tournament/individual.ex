defmodule Codebattle.Tournament.Individual do
  use Codebattle.Tournament.Base

  alias Codebattle.Bot
  alias Codebattle.Tournament

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
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_matches(tournament = %{current_round: 0}) do
    new_matches =
      tournament
      |> get_players
      |> Enum.shuffle()
      |> pair_players_to_matches(tournament, 0)
      |> Enum.reduce(%{}, fn match, acc ->
        Map.put(acc, to_id(match.id), match)
      end)

    update!(tournament, %{matches: new_matches})
  end

  @impl Tournament.Base
  def build_matches(tournament) do
    if final_round?(tournament) do
      tournament
    else
      last_round_matches =
        tournament
        |> get_round_matches(tournament.current_round - 1)
        |> Enum.sort_by(& &1.id)

      winner_ids = Enum.map(last_round_matches, &pick_winner_id(&1))

      winners = get_players(tournament, winner_ids)
      last_ref = List.last(last_round_matches).id

      new_matches =
        pair_players_to_matches(winners, tournament, last_ref + 1)
        |> Enum.reduce(tournament.matches, fn match, acc ->
          Map.put(acc, to_id(match.id), match)
        end)

      update!(tournament, %{matches: new_matches})
    end
  end

  @impl Tournament.Base
  def maybe_finish(tournament) do
    if final_round?(tournament) do
      update!(tournament, %{state: "finished"})
    else
      tournament
    end
  end

  defp pair_players_to_matches(players, tournament, init_ref) do
    players
    |> Enum.chunk_every(2)
    |> Enum.with_index(init_ref)
    # todo: use async stream
    |> Enum.map(fn
      {players = [%{is_bot: true}, %{is_bot: true}], index} ->
        %Tournament.Match{
          id: index,
          state: "canceled",
          round: tournament.current_round,
          player_ids: Enum.map(players, & &1.id)
        }

      {players, index} ->
        game_id = create_game(tournament, index, Enum.map(players, &Tournament.Player.new!(&1)))

        %Tournament.Match{
          id: index,
          game_id: game_id,
          state: "playing",
          round: tournament.current_round,
          player_ids: Enum.map(players, & &1.id)
        }
    end)
  end

  defp final_round?(tournament) do
    Enum.count(tournament.players) == :math.pow(2, tournament.current_round)
  end
end
