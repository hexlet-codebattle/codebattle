defmodule CodebattleWeb.GameChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Game
  alias Codebattle.Game.EditorEventBatch
  alias Codebattle.Game.Player
  alias CodebattleWeb.GameChannel
  alias CodebattleWeb.UserSocket
  alias Phoenix.Socket.Broadcast
  alias Phoenix.Socket.Reply

  setup do
    FunWithFlags.enable(:editor_summary)

    user1 = insert(:user, rating: 1001)
    user2 = insert(:user, rating: 1002)
    spectator = insert(:admin)
    insert(:task, level: "easy")

    user_token1 = Phoenix.Token.sign(socket(UserSocket), "user_token", user1.id)
    {:ok, socket1} = connect(UserSocket, %{"token" => user_token1})

    user_token2 = Phoenix.Token.sign(socket(UserSocket), "user_token", user2.id)
    {:ok, socket2} = connect(UserSocket, %{"token" => user_token2})

    spectator_token = Phoenix.Token.sign(socket(UserSocket), "user_token", spectator.id)
    {:ok, spectator_socket} = connect(UserSocket, %{"token" => spectator_token})

    {:ok,
     %{
       user1: user1,
       user2: user2,
       spectator: spectator,
       socket1: socket1,
       socket2: socket2,
       spectator_socket: spectator_socket
     }}
  end

  describe "join/3" do
    test "sends game info", %{user1: user1, socket1: socket1} do
      {:ok, game} =
        Game.Context.create_game(%{state: "waiting_opponent", players: [user1], level: "easy"})

      {:ok, %{game: created}, _socket1} =
        subscribe_and_join(socket1, GameChannel, game_topic(game))

      assert created.task.level == "easy"
      assert created.mode == "standard"
      assert created.type == "duo"
      assert created.head_to_head == nil
    end

    test "sends tournament game info for spectator who is not participant", %{
      user1: user1,
      user2: user2,
      spectator_socket: spectator_socket
    } do
      tournament = insert(:tournament, players: %{}, matches: %{}, players_count: 0)

      {:ok, game} =
        Game.Context.create_game(%{
          state: "playing",
          players: [user1, user2],
          level: "easy",
          tournament_id: tournament.id
        })

      {:ok, response, _socket} =
        subscribe_and_join(spectator_socket, GameChannel, game_topic(game))

      assert response.game.id == game.id
      assert response.game.head_to_head == nil
      assert response.current_player == nil
      assert response.in_main_draw == false
      assert response.tournament.tournament_id == tournament.id
    end

    test "sends tournament game info for player missing from tournament roster", %{
      user1: user1,
      user2: user2,
      socket1: socket1
    } do
      tournament = insert(:tournament, players: %{}, matches: %{}, players_count: 0)

      {:ok, game} =
        Game.Context.create_game(%{
          state: "playing",
          players: [user1, user2],
          level: "easy",
          tournament_id: tournament.id
        })

      {:ok, response, _socket} =
        subscribe_and_join(socket1, GameChannel, game_topic(game))

      assert response.game.id == game.id
      assert response.current_player == nil
      assert response.in_main_draw == false
      assert response.active_game_id == nil
      assert response.tournament.tournament_id == tournament.id
    end

    test "pushes head to head after join", %{user1: user1, socket1: socket1} do
      {:ok, game} =
        Game.Context.create_game(%{state: "waiting_opponent", players: [user1], level: "easy"})

      {:ok, _response, _socket1} =
        subscribe_and_join(socket1, GameChannel, game_topic(game))

      assert_receive %Phoenix.Socket.Message{
        topic: topic,
        event: "game:head_to_head",
        payload: %{head_to_head: head_to_head}
      }

      assert topic == game_topic(game)
      assert head_to_head == nil
    end
  end

  describe "handle_in(editor:data)" do
    test "broadcasts editor:data", %{
      user1: user1,
      user2: user2,
      socket1: socket1,
      socket2: socket2
    } do
      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      game_topic = game_topic(game)
      editor_text1 = "test1"
      editor_text2 = "test2"
      editor_lang1 = "js"
      editor_lang2 = "ruby"

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      Mix.Shell.Process.flush()

      push(socket1, "editor:data", %{editor_text: editor_text1, lang_slug: "js"})
      push(socket2, "editor:data", %{editor_text: editor_text2, lang_slug: "js"})

      push(socket1, "editor:data", %{editor_text: editor_text1, lang_slug: editor_lang1})
      push(socket2, "editor:data", %{editor_text: editor_text2, lang_slug: editor_lang2})

      payload1 = %{user_id: user1.id, editor_text: editor_text1, lang_slug: "js"}
      payload2 = %{user_id: user2.id, editor_text: editor_text2, lang_slug: "js"}
      payload3 = %{user_id: user1.id, editor_text: editor_text1, lang_slug: editor_lang1}
      payload4 = %{user_id: user2.id, editor_text: editor_text2, lang_slug: editor_lang2}

      assert_receive %Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload1
      }

      assert_receive %Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload2
      }

      assert_receive %Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload3
      }

      assert_receive %Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload4
      }
    end
  end

  describe "handle_in(editor:summary)" do
    test "persists editor anticheat summaries for live games", %{
      user1: user1,
      user2: user2,
      socket1: socket1,
      socket2: socket2
    } do
      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      game_topic = game_topic(game)

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

      push(socket1, "editor:summary", %{
        summary: %{
          event_count: 37,
          window_start_offset_ms: 0,
          window_end_offset_ms: 10_000,
          lang_slug: "js",
          key_event_count: 25,
          printable_key_count: 18,
          modifier_shortcut_count: 3,
          paste_shortcut_attempt_count: 1,
          paste_blocked_count: 1,
          content_change_count: 12,
          chars_inserted: 84,
          chars_deleted: 9,
          net_text_delta: 75,
          max_single_insert_len: 61,
          max_single_delete_len: 3,
          multi_char_insert_count: 3,
          multi_line_insert_count: 1,
          large_insert_count: 1,
          final_text_length: 75,
          key_delta_sample_count: 24,
          avg_key_delta_ms: 114,
          min_key_delta_ms: 12,
          max_key_delta_ms: 2_440,
          idle_pause_over_2s_count: 1
        },
        lang_slug: "js"
      })

      :timer.sleep(50)

      [batch] = EditorEventBatch.list_by_game(game.id)

      assert batch.user_id == user1.id
      assert batch.game_id == game.id
      assert batch.lang == "js"
      assert batch.event_count == 37
      assert batch.tournament_id == nil
      assert batch.window_start_offset_ms == 0
      assert batch.window_end_offset_ms == 10_000
      assert batch.summary["paste_blocked_count"] == 1
      assert batch.summary["large_insert_count"] == 1
      assert batch.summary["max_single_insert_len"] == 61
      assert batch.summary["avg_key_delta_ms"] == 114
    end

    test "rate limits too many editor summaries in a short window", %{
      user1: user1,
      user2: user2,
      socket1: socket1,
      socket2: socket2
    } do
      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      game_topic = game_topic(game)

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

      Enum.each(1..20, fn idx ->
        push(socket1, "editor:summary", %{
          summary: %{
            event_count: 1,
            window_start_offset_ms: idx * 10,
            window_end_offset_ms: idx * 10 + 10,
            lang_slug: "js",
            key_event_count: 1
          },
          lang_slug: "js"
        })
      end)

      ref =
        push(socket1, "editor:summary", %{
          summary: %{
            event_count: 1,
            window_start_offset_ms: 1_000,
            window_end_offset_ms: 1_010,
            lang_slug: "js",
            key_event_count: 1
          },
          lang_slug: "js"
        })

      assert_reply(ref, :error, %{reason: :editor_summary_rate_limited})
    end

    test "rate limits too many claimed events in a short window", %{
      user1: user1,
      user2: user2,
      socket1: socket1,
      socket2: socket2
    } do
      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      game_topic = game_topic(game)

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

      push(socket1, "editor:summary", %{
        summary: %{
          event_count: 1_500,
          window_start_offset_ms: 0,
          window_end_offset_ms: 10_000,
          lang_slug: "js",
          key_event_count: 800
        },
        lang_slug: "js"
      })

      ref2 =
        push(socket1, "editor:summary", %{
          summary: %{
            event_count: 600,
            window_start_offset_ms: 10_000,
            window_end_offset_ms: 20_000,
            lang_slug: "js",
            key_event_count: 300
          },
          lang_slug: "js"
        })

      assert_reply(ref2, :error, %{reason: :editor_summary_rate_limited})
    end
  end

  test "on give up opponents win when state playing", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    {:ok, game} =
      Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

    game_topic = game_topic(game)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "give_up")

    :timer.sleep(100)
    game = Game.Context.get_game!(game.id)

    assert game.state == "game_over"
    assert Game.Helpers.gave_up?(game, user1.id) == true
    assert Game.Helpers.winner?(game, user2.id) == true

    assert_receive %Broadcast{
      topic: ^game_topic,
      event: "user:give_up",
      payload: payload
    }

    assert payload.players == game.players
  end

  describe "handle_in" do
    test "do not erros if there is no game in registry", %{user1: user1, socket1: socket1} do
      {:ok, game} = Game.Context.create_game(%{players: [user1], level: "easy"})
      :ok = Game.Context.terminate_game(game)
      game_topic = game_topic(game)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      Mix.Shell.Process.flush()

      push(socket1, "editor:data", %{editor_text: "oi", lang_slug: "js"})

      assert_receive %Reply{
        topic: ^game_topic,
        payload: %{reason: :game_is_dead}
      }
    end

    test "show head to head", %{user1: user1, user2: user2, socket1: socket1} do
      players = [Player.build(user1), Player.build(user2)]
      game1 = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user1, creator: false, game: game1, result: "won")
      insert(:user_game, user: user2, creator: true, game: game1, result: "gave_up")

      {:ok, game} = Game.Context.create_game(%{players: [user1, user2], level: "easy"})
      :ok = Game.Context.terminate_game(game)
      game_topic = game_topic(game)
      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      Mix.Shell.Process.flush()

      user1_id = user1.id
      push(socket1, "game:head_to_head", %{})

      assert_receive %Reply{
        topic: ^game_topic,
        payload: %{
          head_to_head: %{
            players: [%{id: ^user1_id, wins: 1}, %{id: _, wins: 0}],
            winner_id: ^user1_id
          }
        }
      }
    end
  end

  defp game_topic(game), do: "game:" <> to_string(game.id)
end
