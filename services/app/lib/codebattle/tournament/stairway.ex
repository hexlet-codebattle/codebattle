defmodule Codebattle.Tournament.Stairway do
  alias Codebattle.Tournament

  use Tournament.Base

  @impl Tournament.Base
  def join(%{state: "upcoming"} = tournament, %{user: user}) do
    add_intended_player_id(tournament, user.id)
  end

  @impl Tournament.Base
  def join(%{state: "waiting_participants"} = tournament, %{user: user}) do
    player = Map.put(user, :lang, user.lang || tournament.default_language)
    add_player(tournament, player)
  end

  @impl Tournament.Base
  def join(tournament, _user), do: tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    players_count = tournament |> get_players |> Enum.count()
    update!(tournament, %{players_count: players_count})
  end

  @impl Tournament.Base
  def build_matches(%{step: 0} = tournament) do
    players = tournament |> get_players |> Enum.shuffle()

    matches = []

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

      new_matches = matches ++ []

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

  defp final_step?(tournament) do
    tournament.task_pack
  end
end
