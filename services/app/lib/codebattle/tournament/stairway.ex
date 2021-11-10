defmodule Codebattle.Tournament.Stairway do
  alias Codebattle.Game.Helpers
  alias Codebattle.Game.Play
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
  def build_matches(tournament) do
    current_task_id = Enum.at(tournament.task_pack.task_ids, tournament.step)
    tasks = Codebattle.TaskPack.get_tasks(tournament.task_pack)
    task = Codebattle.Task.get!(current_task_id)

    new_meta = %{
      "current_task_id" => task.id,
      "current_task" => task,
      "tasks" => tasks
    }

    matches_for_round =
      tournament
      |> get_players
      |> Enum.map(fn p ->
        %{state: "waiting", players: [p], round_id: tournament.step}
      end)

    prev_matches =
      tournament
      |> get_matches()
      |> Enum.map(&Map.from_struct/1)

    new_matches = prev_matches ++ matches_for_round

    new_data =
      tournament
      |> Map.get(:data)
      |> Map.merge(%{matches: new_matches})
      |> Map.from_struct()

    update!(tournament, %{data: new_data, meta: new_meta})
  end

  @impl Tournament.Base
  def create_game(tournament, match) do
    task = get_current_task(tournament)

    {:ok, fsm} =
      Play.create_game(%{
        task: task,
        level: task.level,
        tournament: tournament,
        players: match.players
      })

    Helpers.get_game_id(fsm)
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
    length(tournament.task_pack.task_ids) == tournament.step
  end
end
