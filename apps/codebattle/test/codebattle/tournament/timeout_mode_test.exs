defmodule Codebattle.Tournament.TimeoutModeTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Tournament

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  @base_params %{
    "starts_at" => "2026-01-01T12:00",
    "description" => "timeout test",
    "user_timezone" => "Etc/UTC",
    "level" => "easy",
    "task_provider" => "task_pack",
    "task_strategy" => "sequential",
    "ranking_type" => "by_user",
    "type" => "swiss",
    "state" => "waiting_participants",
    "break_duration_seconds" => 0,
    "rounds_limit" => "1",
    "players_limit" => 2
  }

  describe "per_task mode" do
    test "uses task's time_to_solve_sec as game timeout" do
      task = insert(:task, level: "easy", time_to_solve_sec: 123)
      insert(:task_pack, name: "tp-per-task", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "per_task test",
            "creator" => creator,
            "task_pack_name" => "tp-per-task",
            "timeout_mode" => "per_task",
            "round_timeout_seconds" => nil
          })
        )

      start_tournament(tournament, users, creator)

      game = get_first_game(tournament)
      assert game.timeout_seconds == 123
    end

    test "falls back to 300 seconds when task timeout is nil" do
      task = insert(:task, level: "easy", time_to_solve_sec: nil)
      insert(:task_pack, name: "tp-per-task-nil", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "per_task nil fallback",
            "creator" => creator,
            "task_pack_name" => "tp-per-task-nil",
            "timeout_mode" => "per_task",
            "round_timeout_seconds" => nil
          })
        )

      start_tournament(tournament, users, creator)

      game = get_first_game(tournament)
      assert game.timeout_seconds == 300
    end

    test "clears round_timeout_seconds and tournament_timeout_seconds" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_task",
          "round_timeout_seconds" => "240",
          "tournament_timeout_seconds" => "3600"
        })

      assert Ecto.Changeset.get_field(changeset, :round_timeout_seconds) == nil
      assert Ecto.Changeset.get_field(changeset, :tournament_timeout_seconds) == nil
    end
  end

  describe "per_round_fixed mode" do
    test "uses round_timeout_seconds as game timeout, ignoring task time" do
      task = insert(:task, level: "easy", time_to_solve_sec: 123)
      insert(:task_pack, name: "tp-per-round-fixed", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "per_round_fixed test",
            "creator" => creator,
            "task_pack_name" => "tp-per-round-fixed",
            "timeout_mode" => "per_round_fixed",
            "round_timeout_seconds" => "240"
          })
        )

      start_tournament(tournament, users, creator)

      game = get_first_game(tournament)
      assert game.timeout_seconds == 240
    end

    test "requires round_timeout_seconds" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_round_fixed",
          "round_timeout_seconds" => nil
        })

      assert %{round_timeout_seconds: _} = errors_on(changeset)
    end

    test "clears tournament_timeout_seconds" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_round_fixed",
          "round_timeout_seconds" => "240",
          "tournament_timeout_seconds" => "3600"
        })

      assert Ecto.Changeset.get_field(changeset, :tournament_timeout_seconds) == nil
      assert Ecto.Changeset.get_field(changeset, :round_timeout_seconds) == 240
    end
  end

  describe "per_round_with_rematch mode" do
    test "uses round_timeout_seconds as game timeout" do
      task = insert(:task, level: "easy", time_to_solve_sec: 55)
      insert(:task_pack, name: "tp-per-round-rematch", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "per_round_with_rematch test",
            "creator" => creator,
            "task_pack_name" => "tp-per-round-rematch",
            "timeout_mode" => "per_round_with_rematch",
            "round_timeout_seconds" => "600"
          })
        )

      start_tournament(tournament, users, creator)

      game = get_first_game(tournament)
      assert game.timeout_seconds == 600
    end

    test "requires round_timeout_seconds" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_round_with_rematch",
          "round_timeout_seconds" => nil
        })

      assert %{round_timeout_seconds: _} = errors_on(changeset)
    end

    test "clears tournament_timeout_seconds" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_round_with_rematch",
          "round_timeout_seconds" => "600",
          "tournament_timeout_seconds" => "3600"
        })

      assert Ecto.Changeset.get_field(changeset, :tournament_timeout_seconds) == nil
      assert Ecto.Changeset.get_field(changeset, :round_timeout_seconds) == 600
    end
  end

  describe "per_tournament mode" do
    test "uses remaining tournament time as game timeout" do
      task = insert(:task, level: "easy", time_to_solve_sec: 55)
      insert(:task_pack, name: "tp-per-tournament", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "per_tournament test",
            "creator" => creator,
            "task_pack_name" => "tp-per-tournament",
            "timeout_mode" => "per_tournament",
            "tournament_timeout_seconds" => "3600"
          })
        )

      start_tournament(tournament, users, creator)

      game = get_first_game(tournament)
      # Game timeout should be close to 3600 (minus a few seconds for startup)
      assert game.timeout_seconds >= 3590
      assert game.timeout_seconds <= 3600
    end

    test "requires tournament_timeout_seconds" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_tournament",
          "tournament_timeout_seconds" => nil
        })

      assert %{tournament_timeout_seconds: _} = errors_on(changeset)
    end

    test "clears round_timeout_seconds" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_tournament",
          "tournament_timeout_seconds" => "3600",
          "round_timeout_seconds" => "240"
        })

      assert Ecto.Changeset.get_field(changeset, :round_timeout_seconds) == nil
      assert Ecto.Changeset.get_field(changeset, :tournament_timeout_seconds) == 3600
    end
  end

  describe "changeset validation" do
    test "accepts all valid timeout modes" do
      for mode <- ["per_task", "per_round_fixed", "per_round_with_rematch", "per_tournament"] do
        extra =
          case mode do
            "per_task" -> %{}
            "per_tournament" -> %{"tournament_timeout_seconds" => "3600"}
            _ -> %{"round_timeout_seconds" => "240"}
          end

        changeset =
          Tournament.Context.validate(
            Map.merge(
              %{
                "name" => "test",
                "description" => "test tournament",
                "starts_at" => "2026-01-01T12:00",
                "user_timezone" => "Etc/UTC",
                "timeout_mode" => mode
              },
              extra
            )
          )

        refute Map.has_key?(errors_on(changeset), :timeout_mode),
               "mode #{mode} should be valid"
      end
    end

    test "rejects invalid timeout mode" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "invalid_mode"
        })

      assert %{timeout_mode: _} = errors_on(changeset)
    end

    test "rejects old per_round value" do
      changeset =
        Tournament.Context.validate(%{
          "name" => "test",
          "description" => "test tournament",
          "starts_at" => "2026-01-01T12:00",
          "user_timezone" => "Etc/UTC",
          "timeout_mode" => "per_round",
          "round_timeout_seconds" => "240"
        })

      assert %{timeout_mode: _} = errors_on(changeset)
    end
  end

  describe "current_round_timeout_seconds helper" do
    test "returns set value when current_round_timeout_seconds is already set" do
      tournament = build_ets_tournament(%{current_round_timeout_seconds: 77})
      assert current_round_timeout_seconds(tournament) == 77
    end

    test "calculates remaining time for per_tournament mode" do
      tournament =
        build_ets_tournament(%{
          tournament_timeout_seconds: 100,
          started_at: DateTime.add(DateTime.utc_now(), -60, :second)
        })

      result = current_round_timeout_seconds(tournament)
      # Should be around 40 seconds remaining (100 - 60)
      assert result >= 35 and result <= 45
    end

    test "returns minimum 10 for per_tournament mode near expiry" do
      tournament =
        build_ets_tournament(%{
          tournament_timeout_seconds: 100,
          started_at: DateTime.add(DateTime.utc_now(), -200, :second)
        })

      assert current_round_timeout_seconds(tournament) == 10
    end

    test "returns round_timeout_seconds for per_round_fixed mode" do
      tournament =
        build_ets_tournament(%{
          timeout_mode: "per_round_fixed",
          round_timeout_seconds: 300
        })

      assert current_round_timeout_seconds(tournament) == 300
    end

    test "returns round_timeout_seconds for per_round_with_rematch mode" do
      tournament =
        build_ets_tournament(%{
          timeout_mode: "per_round_with_rematch",
          round_timeout_seconds: 500
        })

      assert current_round_timeout_seconds(tournament) == 500
    end

    test "returns task time for per_task mode" do
      task = insert(:task, time_to_solve_sec: 45)
      tournament = build_ets_tournament(%{task_ids: [task.id], current_round_position: 0})
      Tournament.Tasks.put_task(tournament, task)

      assert current_round_timeout_seconds(tournament) == 45
    end

    test "returns 300 fallback for per_task mode with no tasks" do
      tournament = build_ets_tournament(%{task_ids: []})
      assert current_round_timeout_seconds(tournament) == 300
    end
  end

  describe "live tournament state after start" do
    test "per_task: current_round_timeout_seconds matches task time" do
      task = insert(:task, level: "easy", time_to_solve_sec: 200)
      insert(:task_pack, name: "tp-live-per-task", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "live per_task",
            "creator" => creator,
            "task_pack_name" => "tp-live-per-task",
            "timeout_mode" => "per_task"
          })
        )

      start_tournament(tournament, users, creator)

      live = Tournament.Server.get_tournament(tournament.id)
      assert live.current_round_timeout_seconds == 200
      assert live.timeout_mode == "per_task"
    end

    test "per_round_fixed: current_round_timeout_seconds matches round_timeout_seconds" do
      task = insert(:task, level: "easy", time_to_solve_sec: 200)
      insert(:task_pack, name: "tp-live-per-round-fixed", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "live per_round_fixed",
            "creator" => creator,
            "task_pack_name" => "tp-live-per-round-fixed",
            "timeout_mode" => "per_round_fixed",
            "round_timeout_seconds" => "500"
          })
        )

      start_tournament(tournament, users, creator)

      live = Tournament.Server.get_tournament(tournament.id)
      assert live.current_round_timeout_seconds == 500
      assert live.timeout_mode == "per_round_fixed"

      game = get_first_game(tournament)
      assert game.timeout_seconds == 500
    end

    test "per_round_with_rematch: current_round_timeout_seconds matches round_timeout_seconds" do
      task = insert(:task, level: "easy", time_to_solve_sec: 200)
      insert(:task_pack, name: "tp-live-per-round-rematch", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "live per_round_with_rematch",
            "creator" => creator,
            "task_pack_name" => "tp-live-per-round-rematch",
            "timeout_mode" => "per_round_with_rematch",
            "round_timeout_seconds" => "900"
          })
        )

      start_tournament(tournament, users, creator)

      live = Tournament.Server.get_tournament(tournament.id)
      assert live.current_round_timeout_seconds == 900
      assert live.timeout_mode == "per_round_with_rematch"

      game = get_first_game(tournament)
      assert game.timeout_seconds == 900
    end

    test "per_tournament: current_round_timeout_seconds is close to tournament_timeout_seconds" do
      task = insert(:task, level: "easy", time_to_solve_sec: 200)
      insert(:task_pack, name: "tp-live-per-tournament", task_ids: [task.id])
      {creator, users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "live per_tournament",
            "creator" => creator,
            "task_pack_name" => "tp-live-per-tournament",
            "timeout_mode" => "per_tournament",
            "tournament_timeout_seconds" => "7200"
          })
        )

      start_tournament(tournament, users, creator)

      live = Tournament.Server.get_tournament(tournament.id)
      # Should be close to 7200 minus a few seconds for startup
      assert live.current_round_timeout_seconds >= 7190
      assert live.current_round_timeout_seconds <= 7200
      assert live.timeout_mode == "per_tournament"
      assert live.tournament_timeout_seconds == 7200

      game = get_first_game(tournament)
      assert game.timeout_seconds >= 7190
      assert game.timeout_seconds <= 7200
    end

    test "per_tournament: tournament_timeout_seconds is persisted in DB" do
      task = insert(:task, level: "easy", time_to_solve_sec: 200)
      insert(:task_pack, name: "tp-persist-tournament", task_ids: [task.id])
      {creator, _users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "persist per_tournament",
            "creator" => creator,
            "task_pack_name" => "tp-persist-tournament",
            "timeout_mode" => "per_tournament",
            "tournament_timeout_seconds" => "3600"
          })
        )

      db_tournament = Tournament.Context.get_from_db!(tournament.id)
      assert db_tournament.tournament_timeout_seconds == 3600
      assert db_tournament.timeout_mode == "per_tournament"
      assert db_tournament.round_timeout_seconds == nil
    end

    test "per_round_fixed: round_timeout_seconds is persisted, tournament_timeout_seconds is nil" do
      task = insert(:task, level: "easy", time_to_solve_sec: 200)
      insert(:task_pack, name: "tp-persist-round-fixed", task_ids: [task.id])
      {creator, _users} = create_users()

      {:ok, tournament} =
        Tournament.Context.create(
          Map.merge(@base_params, %{
            "name" => "persist per_round_fixed",
            "creator" => creator,
            "task_pack_name" => "tp-persist-round-fixed",
            "timeout_mode" => "per_round_fixed",
            "round_timeout_seconds" => "300"
          })
        )

      db_tournament = Tournament.Context.get_from_db!(tournament.id)
      assert db_tournament.round_timeout_seconds == 300
      assert db_tournament.timeout_mode == "per_round_fixed"
      assert db_tournament.tournament_timeout_seconds == nil
    end
  end

  # Helpers

  defp create_users do
    creator = insert(:user)
    users = [insert(:user), insert(:user)]
    {creator, users}
  end

  defp start_tournament(tournament, users, creator) do
    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: creator})
  end

  defp get_first_game(tournament) do
    tournament = Tournament.Context.get(tournament.id)
    [match] = get_matches(tournament)
    GameContext.get_game!(match.game_id)
  end

  defp build_tournament(attrs) do
    struct!(
      Tournament,
      Map.merge(
        %{
          id: System.unique_integer([:positive]),
          type: "swiss",
          ranking_type: "by_user",
          state: "waiting_participants",
          access_type: "public",
          break_state: "off",
          current_round_position: 0,
          timeout_mode: "per_task",
          players: %{},
          matches: %{},
          meta: %{},
          task_provider: "level",
          task_strategy: "random",
          task_ids: []
        },
        attrs
      )
    )
  end

  defp build_ets_tournament(attrs) do
    tournament_id = System.unique_integer([:positive, :monotonic])

    build_tournament(
      Map.merge(
        %{
          id: tournament_id,
          players_table: Tournament.Players.create_table(tournament_id),
          matches_table: Tournament.Matches.create_table(tournament_id),
          ranking_table: Tournament.Ranking.create_table(tournament_id),
          tasks_table: Tournament.Tasks.create_table(tournament_id),
          clans_table: Tournament.Clans.create_table(tournament_id)
        },
        attrs
      )
    )
  end
end
