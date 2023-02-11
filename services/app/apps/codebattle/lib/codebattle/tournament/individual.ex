defmodule Codebattle.Tournament.Individual do
  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.Bot

  use Tournament.Base

  @max_players_count 32
  @impl Tournament.Base
  def join(tournament = %{state: "upcoming"}, %{user: user}) do
    add_intended_player_id(tournament, user.id)
  end

  @impl Tournament.Base
  def join(tournament = %{state: "waiting_participants"}, %{user: user}) do
    player = Map.put(user, :lang, user.lang || tournament.default_language)
    add_player(tournament, player)
  end

  @impl Tournament.Base
  def join(tournament, _user), do: tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    players_limit =
      if tournament.players_count do
        tournament.players_count
      else
        @max_players_count
      end

    players = tournament |> get_players |> Enum.take(players_limit)

    bots_count =
      if tournament.players_count do
        tournament.players_count - Enum.count(players)
      else
        if Enum.count(players) > 1 do
          power = players |> Enum.count() |> :math.log2() |> ceil()
          round(:math.pow(2, power)) - Enum.count(players)
        else
          1
        end
      end

    new_players = Enum.concat(players, Bot.Context.build_list(bots_count))

    new_data =
      tournament
      |> Map.get(:data)
      |> Map.merge(%{players: new_players})
      |> Map.from_struct()

    update!(tournament, %{data: new_data, players_count: Enum.count(new_players)})
  end

  @impl Tournament.Base
  def build_matches(tournament = %{step: 0}) do
    players = tournament |> get_players |> Enum.shuffle()

    matches = pair_players_to_matches(players, tournament.step)

    new_data =
      tournament
      |> Map.get(:data)
      |> Map.merge(%{matches: matches})
      |> Map.from_struct()

    update!(tournament, %{data: new_data})
  end

  @impl Tournament.Base
  def build_matches(tournament) do
    if final_step?(tournament) do
      tournament
    else
      matches = tournament |> get_matches |> Enum.map(&Map.from_struct/1)

      winners =
        matches
        |> Enum.filter(fn match -> match.round_id == tournament.step - 1 end)
        |> Enum.map(fn match -> pick_winner(match) end)

      new_matches = matches ++ pair_players_to_matches(winners, tournament.step)

      new_data =
        tournament
        |> Map.get(:data)
        |> Map.merge(%{matches: new_matches})
        |> Map.from_struct()

      update!(tournament, %{data: new_data})
    end
  end

  @impl Tournament.Base
  def maybe_finish(tournament) do
    if final_step?(tournament) do
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

  defp pair_players_to_matches(players, step) do
    players
    |> Enum.reduce({step, [%{}]}, &pair_players_to_matches_reducer/2)
    |> Enum.reverse()
  end

  defp pair_players_to_matches_reducer(player, {step, acc}) do
    player = Map.merge(player, %{result: "waiting"})

    new_acc =
      case List.first(acc) do
        map when map == %{} ->
          [_h | t] = acc
          [%{state: "pending", round_id: step, players: [player]} | t]

        match ->
          case(Enum.count(match.players)) do
            1 ->
              [_h | t] = acc
              [Map.merge(match, %{players: match.players ++ [player]}) | t]

            _ ->
              [%{state: "pending", round_id: step, players: [player]} | acc]
          end
      end

    {step, new_acc}
  end

  defp final_step?(tournament) do
    tournament.players_count == :math.pow(2, tournament.step)
  end
end
