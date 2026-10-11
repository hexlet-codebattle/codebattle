defmodule Codebattle.Tournament.Perf.LargeTournamentPerfTest do
  @moduledoc """
  Timing probe for one large Swiss or Ladder round. Excluded by default; run with

      make dev-exec CMD='mix test apps/codebattle/test/codebattle/tournament/perf --only perf'

  `PERF_N` sets the number of players (default 2000). Every player is backed by a dummy
  subscriber on the tournament's common and player topics, so broadcast fan-out costs what
  it costs with real channels, minus JSON encoding. The runner is the test fake checker.
  """
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Server

  @moduletag :perf
  @moduletag timeout: :infinity

  for type <- ["swiss", "ladder"] do
    test "#{type}: join, round start and a full round of finishes" do
      run(unquote(type), String.to_integer(System.get_env("PERF_N", "2000")))
    end
  end

  defp run(type, n) do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 300)
    insert(:task_pack, name: "perf-#{type}", task_ids: Enum.map(tasks, & &1.id))
    creator = insert(:user)
    users = insert_users(n)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Perf #{type}",
        "description" => "perf",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "perf-#{type}",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => type,
        "state" => "waiting_participants",
        "round_timeout_seconds" => 600,
        "break_duration_seconds" => 0,
        "rounds_limit" => "3",
        "players_limit" => n
      })

    id = tournament.id
    on_exit(fn -> Codebattle.Tournament.GlobalSupervisor.terminate_tournament(id) end)
    subscribers = Enum.map(users, &spawn_subscriber(id, &1.id))
    probe = start_probe(id)

    {join_ms, _} = timed(fn -> Server.handle_event(id, :join, %{users: users}) end)
    {start_ms, _} = timed(fn -> Server.handle_event(id, :start, %{user: creator}) end)

    tournament = TournamentContext.get(id)
    playing = get_matches(tournament, "playing")
    assert length(playing) == div(n + 1, 2)

    Codebattle.PubSub.subscribe("tournament:#{id}:common")
    started_at = System.monotonic_time(:millisecond)

    {finish_ms, _} =
      timed(fn ->
        playing
        |> Task.async_stream(&finish_match/1, max_concurrency: 50, timeout: :infinity)
        |> Stream.run()
      end)

    assert_receive %Message{event: "tournament:round_created", payload: %{tournament: %{current_round_position: 1}}},
                   120_000

    next_round_ms = System.monotonic_time(:millisecond) - started_at
    %{max_queue: max_queue, max_memory: max_memory} = stop_probe(probe)
    Enum.each(subscribers, &Process.exit(&1, :kill))

    IO.puts("""

    [perf] #{type} N=#{n}
      join (batch)              #{join_ms} ms
      start (round 0 created)   #{start_ms} ms
      finish requests sent      #{finish_ms} ms
      first finish -> round 1   #{next_round_ms} ms
      server max queue          #{max_queue}
      server max memory         #{div(max_memory, 1024 * 1024)} MB
    """)
  end

  defp insert_users(n) do
    now = NaiveDateTime.utc_now(:second)

    rows =
      Enum.map(1..n, fn i ->
        %{
          name: "perf_#{System.unique_integer([:positive])}_#{i}",
          email: "perf#{System.unique_integer([:positive])}@test.io",
          rating: 1200,
          lang: "js",
          is_bot: false,
          inserted_at: now,
          updated_at: now
        }
      end)

    rows
    |> Enum.chunk_every(1000)
    |> Enum.flat_map(fn chunk ->
      {_count, users} = Codebattle.Repo.insert_all(Codebattle.User, chunk, returning: true)
      users
    end)
  end

  defp finish_match(%{game_id: game_id, player_ids: [winner_id | _]}) do
    check_game(game_id, winner_id, 100, 30)
  end

  defp timed(fun) do
    started_at = System.monotonic_time(:millisecond)
    result = fun.()
    {System.monotonic_time(:millisecond) - started_at, result}
  end

  defp spawn_subscriber(tournament_id, user_id) do
    spawn(fn ->
      Codebattle.PubSub.subscribe("tournament:#{tournament_id}:common")
      Codebattle.PubSub.subscribe("tournament:#{tournament_id}:player:#{user_id}")
      drain()
    end)
  end

  defp drain do
    receive do
      _message -> drain()
    end
  end

  defp start_probe(tournament_id) do
    parent = self()

    spawn(fn ->
      [{pid, _}] = Registry.lookup(Codebattle.Registry, "tournament_srv::#{tournament_id}")
      probe_loop(parent, pid, %{max_queue: 0, max_memory: 0})
    end)
  end

  defp probe_loop(parent, pid, acc) do
    receive do
      {:stop, ^parent} -> send(parent, {:probe, acc})
    after
      10 ->
        acc =
          case Process.info(pid, [:message_queue_len, :memory]) do
            [message_queue_len: queue, memory: memory] ->
              %{max_queue: max(acc.max_queue, queue), max_memory: max(acc.max_memory, memory)}

            nil ->
              acc
          end

        probe_loop(parent, pid, acc)
    end
  end

  defp stop_probe(probe) do
    send(probe, {:stop, self()})

    receive do
      {:probe, acc} -> acc
    after
      5_000 -> %{max_queue: -1, max_memory: 0}
    end
  end
end
