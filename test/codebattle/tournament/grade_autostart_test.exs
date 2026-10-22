defmodule Codebattle.Tournament.GradeAutostartTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Server

  test "reschedules autostart when starts_at changes and ignores an old timer message" do
    tournament = waiting_tournament()
    state = server_state(tournament)
    assert is_reference(state.grade_start_timer_ref)

    later = %{tournament | starts_at: DateTime.add(DateTime.utc_now(:second), 2, :hour)}
    assert :ok = Server.update_tournament(later)
    assert Process.read_timer(state.grade_start_timer_ref) == false

    send(server_pid(tournament), :start_grade_tournament)
    assert Server.get_tournament(tournament.id).state == "waiting_participants"
    assert Process.read_timer(server_state(tournament).grade_start_timer_ref) > 3_500_000
  end

  test "arms autostart when an open tournament becomes a grade tournament" do
    tournament = waiting_tournament("open")
    assert server_state(tournament).grade_start_timer_ref == nil
    assert :ok = Server.update_tournament(%{tournament | grade: "rookie"})
    assert is_reference(server_state(tournament).grade_start_timer_ref)
  end

  test "cancels an empty grade tournament once its edited start time is due" do
    tournament = waiting_tournament()
    assert :ok = Server.update_tournament(%{tournament | starts_at: DateTime.add(DateTime.utc_now(:second), -1, :minute)})
    eventually(fn -> Tournament.Context.get_from_db!(tournament.id).state == "canceled" end)
  end

  test "defers an empty overdue tournament until release restoration completes" do
    tournament =
      insert(:tournament,
        grade: "rookie",
        type: "swiss",
        state: "waiting_participants",
        starts_at: DateTime.add(DateTime.utc_now(:second), -1, :minute)
      )

    {:ok, _pid} = Tournament.GlobalSupervisor.start_tournament(tournament, restoring: true)
    send(server_pid(tournament), :start_grade_tournament)
    assert Server.get_tournament(tournament.id).state == "waiting_participants"
    assert server_state(tournament).grade_start_timer_ref == nil

    assert :ok = Tournament.Context.restore_after_release(tournament)
    eventually(fn -> Tournament.Context.get_from_db!(tournament.id).state == "canceled" end)
  end

  test "waits for saved players to be imported before an overdue tournament starts" do
    tournament = waiting_tournament("open")
    users = [insert(:user), insert(:user)]
    insert(:task)
    insert(:task)
    Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

    tournament =
      tournament.id
      |> Tournament.Context.get_from_db!()
      |> Ecto.Changeset.change(grade: "rookie", starts_at: DateTime.add(DateTime.utc_now(:second), -1, :minute))
      |> Repo.update!()

    {:ok, _pid} = Tournament.GlobalSupervisor.start_tournament(tournament, restoring: true)
    send(server_pid(tournament), :start_grade_tournament)
    assert Server.get_tournament(tournament.id).state == "waiting_participants"
    assert server_state(tournament).restoring_players

    assert :ok = Tournament.Context.restore_after_release(tournament)
    eventually(fn -> Server.get_tournament(tournament.id).state == "active" end)
    restored = Server.get_tournament(tournament.id)
    assert Enum.sort(Enum.map(Tournament.Helpers.get_players(restored), & &1.id)) == Enum.sort(Enum.map(users, & &1.id))
  end

  defp waiting_tournament(grade \\ "rookie") do
    tournament =
      insert(:tournament,
        grade: grade,
        type: "swiss",
        state: "waiting_participants",
        players_limit: 2,
        rounds_limit: 2,
        starts_at: DateTime.add(DateTime.utc_now(:second), 1, :hour)
      )

    {:ok, _pid} = Tournament.GlobalSupervisor.start_tournament(tournament)
    tournament
  end

  defp server_pid(tournament),
    do: GenServer.whereis({:via, Registry, {Codebattle.Registry, "tournament_srv::#{tournament.id}"}})

  defp server_state(tournament), do: :sys.get_state(server_pid(tournament))

  defp eventually(check, attempts \\ 100)
  defp eventually(check, 0), do: assert(check.())

  defp eventually(check, attempts) do
    if !check.() do
      Process.sleep(10)
      eventually(check, attempts - 1)
    end
  end
end
