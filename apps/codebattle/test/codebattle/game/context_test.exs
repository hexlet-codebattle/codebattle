defmodule Codebattle.Game.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.Game.EditorEventBatch
  alias Codebattle.Game.GlobalSupervisor
  alias Codebattle.Game.Player
  alias Codebattle.Game.Server
  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament.Context
  alias Codebattle.UserGameReport

  describe "trigger_timeout/1" do
    setup do
      user1 = insert(:user, rating: 1001)
      user2 = insert(:user, rating: 1002)
      task = insert(:task)
      Codebattle.PubSub.subscribe("games")

      {:ok, %{user1: user1, user2: user2, task: task}}
    end

    test "changes state and broadcasts events", %{user1: user1, user2: user2} do
      {:ok, %{id: game_id, players: [%{id: user1_id}, %{id: user2_id}]}} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert_received %Message{
        event: "game:created",
        topic: "games",
        payload: _
      }

      game_topic = "game:#{game_id}"
      Codebattle.PubSub.subscribe(game_topic)

      {:ok, _new_game} = Game.Context.trigger_timeout(game_id)

      assert_received %Message{
        event: "game:finished",
        topic: "games",
        payload: %{
          game_id: ^game_id,
          game_state: "timeout",
          game: %{id: ^game_id, players: [%{id: ^user1_id}, %{id: ^user2_id}], state: "timeout"}
        }
      }

      assert_received %Message{
        event: "game:finished",
        topic: ^game_topic,
        payload: %{game_id: ^game_id, game_state: "timeout"}
      }
    end

    test "returns handoff error when game server is frozen", %{user1: user1, user2: user2} do
      {:ok, %{id: game_id}} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert :ok == Server.freeze(game_id)
      assert {:error, :handoff_in_progress} = Game.Context.trigger_timeout(game_id)
      assert :ok == Server.unfreeze(game_id)
    end

    test "preserves player ratings when reloading timed out game from db", %{user1: user1, user2: user2} do
      {:ok, %{id: game_id}} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert {:ok, _new_game} = Game.Context.trigger_timeout(game_id)
      assert :ok = GlobalSupervisor.terminate_game(game_id)

      reloaded_game = Game.Context.get_game!(game_id)

      assert Enum.map(reloaded_game.players, & &1.rating) == [user1.rating, user2.rating]
    end
  end

  describe "store_editor_summary/4" do
    setup do
      user1 = insert(:user)
      user2 = insert(:user)

      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      {:ok, %{user: user1, game: game}}
    end

    test "persists batch when summary uses camelCase keys (frontend payload)", %{user: user, game: game} do
      summary = %{
        "eventCount" => 5,
        "windowStartOffsetMs" => 100,
        "windowEndOffsetMs" => 900,
        "langSlug" => "elixir",
        "keyEventCount" => 4,
        "printableKeyCount" => 3,
        "charsInserted" => 7
      }

      assert {:ok, %EditorEventBatch{} = batch} =
               Game.Context.store_editor_summary(game.id, user, summary, "elixir")

      assert batch.event_count == 5
      assert batch.window_start_offset_ms == 100
      assert batch.window_end_offset_ms == 900
      assert batch.lang == "elixir"
      assert batch.summary["key_event_count"] == 4
      assert batch.summary["printable_key_count"] == 3
      assert batch.summary["chars_inserted"] == 7
      refute Map.has_key?(batch.summary, "lang_slug")
    end

    test "persists batch when summary uses snake_case keys", %{user: user, game: game} do
      summary = %{
        "event_count" => 2,
        "window_start_offset_ms" => 0,
        "window_end_offset_ms" => 500,
        "lang_slug" => "ruby",
        "key_event_count" => 2
      }

      assert {:ok, %EditorEventBatch{} = batch} =
               Game.Context.store_editor_summary(game.id, user, summary, "ruby")

      assert batch.event_count == 2
      assert batch.summary["key_event_count"] == 2
    end

    test "skips when event_count is zero", %{user: user, game: game} do
      summary = %{"eventCount" => 0, "windowStartOffsetMs" => 0, "windowEndOffsetMs" => 0}

      assert {:ok, :skipped} = Game.Context.store_editor_summary(game.id, user, summary, "elixir")
    end

    test "skips when end offset precedes start offset", %{user: user, game: game} do
      summary = %{"eventCount" => 1, "windowStartOffsetMs" => 500, "windowEndOffsetMs" => 100}

      assert {:ok, :skipped} = Game.Context.store_editor_summary(game.id, user, summary, "elixir")
    end

    test "skips when summary is nil", %{user: user, game: game} do
      assert {:ok, :skipped} = Game.Context.store_editor_summary(game.id, user, nil, "elixir")
    end
  end

  describe "fetch_head_to_head_by_game_id/1" do
    test "works" do
      user1 = insert(:user)
      user2 = insert(:user)
      players = [Player.build(user1), Player.build(user2)]

      game1 = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user1, creator: false, game: game1, result: "won")
      insert(:user_game, user: user2, creator: true, game: game1, result: "gave_up")
      game2 = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user2, creator: true, game: game2, result: "won")
      insert(:user_game, user: user1, creator: false, game: game2, result: "lost")
      game3 = insert(:game, state: "playing", players: players)
      insert(:user_game, user: user1, creator: false, game: game3, result: nil)
      insert(:user_game, user: user2, creator: true, game: game3, result: nil)
      game4 = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user1, creator: false, game: game4, result: "won")
      insert(:user_game, user: user2, creator: true, game: game4, result: "lost")

      assert %{
               players: [%{id: user1.id, wins: 2}, %{id: user2.id, wins: 1}],
               winner_id: user1.id
             } == Game.Context.fetch_head_to_head_by_game_id(game3.id)
    end
  end

  describe "public game helpers" do
    test "builds a hidden builder game against a bot" do
      user = insert(:user)
      task = insert(:task, level: "hard")

      game = Game.Context.create_empty_game(user.id, task)

      assert game.state == "builder"
      assert game.mode == "builder"
      assert game.task == task
      assert game.level == "hard"
      assert game.visibility_type == "hidden"
      assert Enum.any?(game.players, &(&1.id == user.id and not &1.is_bot))
      assert Enum.any?(game.players, & &1.is_bot)
    end

    test "rejects live-only operations for a persisted dead game" do
      user = insert(:user)
      game = insert(:game, state: "game_over", tournament_id: nil)

      assert {:error, :game_is_dead} = Game.Context.update_editor_data(game.id, user, "code", "elixir")

      assert {:error, :game_is_dead} =
               Game.Context.store_editor_summary(game.id, user, %{"eventCount" => 1}, "elixir")

      assert {:error, :game_is_dead} =
               Game.Context.check_result(game.id, %{user: user, editor_text: "code", editor_lang: "elixir"})

      assert {:error, :game_is_dead} = Game.Context.give_up(game.id, user)
      assert {:error, :game_is_dead} = Game.Context.rematch_reject(game.id)
      assert {:error, :game_is_dead} = Game.Context.toggle_ban_player(game.id, %{player_id: user.id})
      assert {:error, :no_tournament} = Game.Context.unlock_game(game.id, "secret")
    end

    test "finds a user's newest active game for integer and string ids" do
      user = insert(:user)
      opponent = insert(:user)
      players = [Player.build(user), Player.build(opponent)]

      old_game = insert(:game, state: "playing", players: players, player_ids: [user.id, opponent.id])
      new_game = insert(:game, state: "playing", players: players, player_ids: [user.id, opponent.id])

      assert Game.Context.get_active_game_id(user.id) == new_game.id
      assert Game.Context.get_active_game_id(Integer.to_string(user.id)) == new_game.id
      assert Game.Context.get_active_game_id(nil) == nil
      assert old_game.id < new_game.id
    end

    test "toggles a live ban and terminates a game by id" do
      user1 = insert(:user)
      user2 = insert(:user)
      {:ok, game} = Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert {:ok, banned} = Game.Context.toggle_ban_player(game.id, %{player_id: user2.id})
      assert Enum.find(banned.players, &(&1.id == user2.id)).is_banned
      assert :ok = Game.Context.terminate_game(game.id)
    end

    test "unlocks a tournament game with a one-time password" do
      creator = insert(:user)
      user1 = insert(:user)
      user2 = insert(:user)
      starts_at = Calendar.strftime(NaiveDateTime.utc_now(), "%Y-%m-%dT%H:%M")

      {:ok, tournament} =
        Context.create(%{
          "creator" => creator,
          "description" => "unlock coverage",
          "name" => "Unlock coverage",
          "players_limit" => 8,
          "starts_at" => starts_at,
          "type" => "swiss",
          "meta_json" => ~s({"game_passwords":["secret"]})
        })

      on_exit(fn -> Codebattle.Tournament.GlobalSupervisor.terminate_tournament(tournament.id) end)

      {:ok, game} =
        Game.Context.create_game(%{
          state: "playing",
          players: [user1, user2],
          level: "easy",
          tournament_id: tournament.id,
          locked: true
        })

      assert {:error, :invalid_password} = Game.Context.unlock_game(game.id, "wrong")
      assert :ok = Game.Context.unlock_game(game.id, "secret")
      refute Context.check_pass_code(tournament.id, "secret")
    end
  end

  describe "editor summary normalization" do
    test "accepts atom keys and numeric strings while discarding invalid optional strings" do
      user1 = insert(:user)
      user2 = insert(:user)

      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      summary = %{
        event_count: "3",
        window_start_offset_ms: "10",
        window_end_offset_ms: "30",
        key_event_count: "bad",
        lang_slug: 123
      }

      assert {:ok, %EditorEventBatch{} = batch} =
               Game.Context.store_editor_summary(game.id, user1, summary)

      assert batch.event_count == 3
      assert batch.window_start_offset_ms == 10
      assert batch.window_end_offset_ms == 30
      assert batch.lang == "unknown"
      assert batch.summary["key_event_count"] == 0
      refute Map.has_key?(batch.summary, "lang_slug")
    end

    test "drops a blank atom-keyed language slug" do
      user1 = insert(:user)
      user2 = insert(:user)
      {:ok, game} = Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert {:ok, batch} =
               Game.Context.store_editor_summary(game.id, user1, %{
                 eventCount: 1,
                 windowStartOffsetMs: 0,
                 windowEndOffsetMs: 1,
                 langSlug: "   "
               })

      assert batch.lang == "unknown"
      refute Map.has_key?(batch.summary, "lang_slug")
    end
  end

  describe "report_on_player/3" do
    test "authorizes participants and returns the existing report on duplicate submission" do
      reporter = insert(:user)
      offender = insert(:user)
      outsider = insert(:user)
      players = [Player.build(reporter), Player.build(offender)]

      game =
        insert(:game,
          state: "game_over",
          players: players,
          player_ids: [reporter.id, offender.id]
        )

      assert {:error, :cannot_report} = Game.Context.report_on_player(game.id, outsider, offender.id)
      assert {:error, :cannot_report} = Game.Context.report_on_player(game.id, reporter, outsider.id)

      assert {:ok, %UserGameReport{} = report} =
               Game.Context.report_on_player(game.id, reporter, offender.id)

      assert report.game_id == game.id
      assert report.reporter_id == reporter.id
      assert report.offender_id == offender.id
      assert {:ok, duplicate} = Game.Context.report_on_player(game.id, reporter, offender.id)
      assert duplicate.id == report.id
    end

    test "returns a report changeset error when the reporter does not exist" do
      offender = insert(:user)
      missing_admin = build(:admin, id: 999_999_991)
      players = [Player.build(missing_admin), Player.build(offender)]

      game =
        insert(:game,
          state: "game_over",
          players: players,
          player_ids: [missing_admin.id, offender.id]
        )

      assert {:error, %Ecto.Changeset{}} =
               Game.Context.report_on_player(game.id, missing_admin, offender.id)
    end
  end
end
