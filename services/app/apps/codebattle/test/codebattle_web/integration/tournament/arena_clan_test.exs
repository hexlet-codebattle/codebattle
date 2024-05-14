defmodule CodebattleWeb.Integration.Tournament.ArenaClanTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Tournament

  test "Arena Clan 1 round sequential task_pack" do
    %{id: t1_id} = insert(:task, level: "easy")
    %{id: t2_id} = insert(:task, level: "medium")
    %{id: t3_id} = insert(:task, level: "hard")

    insert(:task_pack, name: "tp", task_ids: [t1_id, t2_id, t3_id])
    admin = insert(:user, %{name: "a"})

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Swiss",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp",
        "creator" => admin,
        "break_duration_seconds" => 0,
        "score_strategy" => "win_loss",
        "task_provider" => "task_pack_per_round",
        "task_strategy" => "sequential",
        "ranking_type" => "by_clan",
        "type" => "arena",
        "state" => "waiting_participants",
        "use_clan" => "true",
        "rounds_limit" => "1",
        "players_limit" => 200
      })

    tournament_topic = "tournament:#{tournament.id}"
    tournament_admin_topic = "tournament_admin:#{tournament.id}"

    clan1 = %{id: c1_id} = insert(:clan, %{name: "c1", long_name: "cl1"})
    clan2 = %{id: c2_id} = insert(:clan, %{name: "c2", long_name: "cl2"})
    clan3 = %{id: c3_id} = insert(:clan, %{name: "c3", long_name: "cl3"})
    clan4 = %{id: c4_id} = insert(:clan, %{name: "c4", long_name: "cl4"})

    user1 = %{id: u1_id} = insert(:user, name: "1", clan_id: clan1.id, clan: clan1.name)
    user2 = insert(:user, name: "2", clan_id: clan1.id, clan: clan1.name)
    user3 = insert(:user, name: "3", clan_id: clan2.id, clan: clan2.name)
    user4 = insert(:user, name: "4", clan_id: clan2.id, clan: clan2.name)
    user5 = insert(:user, name: "5", clan_id: clan3.id, clan: clan3.name)
    user6 = insert(:user, name: "6", clan_id: clan3.id, clan: clan3.name)
    user7 = insert(:user, name: "7", clan_id: clan4.id, clan: clan4.name)
    user8 = insert(:user, name: "8", clan_id: clan4.id, clan: clan4.name)

    admin_socket = socket(UserSocket, "user_id", %{user_id: admin.id, current_user: admin})
    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})
    socket3 = socket(UserSocket, "user_id", %{user_id: user3.id, current_user: user3})
    socket4 = socket(UserSocket, "user_id", %{user_id: user4.id, current_user: user4})
    socket5 = socket(UserSocket, "user_id", %{user_id: user5.id, current_user: user5})
    socket6 = socket(UserSocket, "user_id", %{user_id: user6.id, current_user: user6})
    socket7 = socket(UserSocket, "user_id", %{user_id: user7.id, current_user: user7})
    socket8 = socket(UserSocket, "user_id", %{user_id: user8.id, current_user: user8})

    {:ok, _response, socket1} = subscribe_and_join(socket1, TournamentChannel, tournament_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, TournamentChannel, tournament_topic)
    {:ok, _response, socket3} = subscribe_and_join(socket3, TournamentChannel, tournament_topic)
    {:ok, _response, socket4} = subscribe_and_join(socket4, TournamentChannel, tournament_topic)
    {:ok, _response, socket5} = subscribe_and_join(socket5, TournamentChannel, tournament_topic)
    {:ok, _response, socket6} = subscribe_and_join(socket6, TournamentChannel, tournament_topic)

    Phoenix.ChannelTest.push(socket1, "tournament:join", %{})
    Phoenix.ChannelTest.push(socket2, "tournament:join", %{})
    Phoenix.ChannelTest.push(socket3, "tournament:join", %{})
    Phoenix.ChannelTest.push(socket4, "tournament:join", %{})
    Phoenix.ChannelTest.push(socket5, "tournament:join", %{})
    Phoenix.ChannelTest.push(socket6, "tournament:join", %{})

    # 7 users joined for 7 user sockets
    1..36
    |> Enum.each(fn _i ->
      assert_receive %Phoenix.Socket.Message{
        event: "tournament:player:joined",
        payload: %{
          player: %Tournament.Player{clan_id: _, id: _, name: _, state: "active"},
          tournament: %{players_count: _}
        }
      }
    end)

    {:ok, user_response, socket7} =
      subscribe_and_join(socket7, TournamentChannel, tournament_topic)

    assert %{
             clans: %{
               ^c1_id => %{id: ^c1_id, name: "c1", long_name: "cl1"},
               ^c2_id => %{id: ^c2_id, name: "c2", long_name: "cl2"},
               ^c3_id => %{id: ^c3_id, name: "c3", long_name: "cl3"}
             },
             matches: [],
             players: [],
             ranking: %{
               page_size: 10,
               entries: [
                 %{id: _, score: 0, players_count: 2, place: 1},
                 %{id: _, score: 0, players_count: 2, place: 2},
                 %{id: _, score: 0, players_count: 2, place: 3}
               ],
               page_number: 1,
               total_entries: 3
             },
             tournament: %{
               access_type: "public",
               type: "arena",
               state: "waiting_participants",
               break_state: "off",
               current_round_position: 0
             }
           } = user_response

    Phoenix.ChannelTest.push(socket7, "tournament:join", %{})

    1..7
    |> Enum.each(fn _i ->
      assert_receive %Phoenix.Socket.Message{
        event: "tournament:player:joined",
        payload: %{
          player: %Tournament.Player{clan_id: _, id: _, name: _, state: "active"},
          tournament: %{players_count: _}
        }
      }
    end)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    {:ok, admin_join_response, admin_socket} =
      subscribe_and_join(admin_socket, TournamentAdminChannel, tournament_admin_topic)

    assert %{
             clans: %{
               ^c1_id => %{id: ^c1_id, name: "c1", long_name: "cl1"},
               ^c2_id => %{id: ^c2_id, name: "c2", long_name: "cl2"},
               ^c3_id => %{id: ^c3_id, name: "c3", long_name: "cl3"},
               ^c4_id => %{id: ^c4_id, name: "c4", long_name: "cl4"}
             },
             matches: [],
             players: [%{}, %{}, %{}, %{}, %{}, %{}, %{}],
             ranking: %{
               page_size: 10,
               entries: [
                 %{id: _, score: 0, players_count: 2, place: 1},
                 %{id: _, score: 0, players_count: 2, place: 2},
                 %{id: _, score: 0, players_count: 2, place: 3},
                 %{id: _, score: 0, players_count: 1, place: 4}
               ],
               page_number: 1,
               total_entries: 4
             },
             tasks_info: %{},
             tournament: %{
               access_type: "public",
               type: "arena",
               state: "waiting_participants",
               break_state: "off",
               current_round_position: 0
             }
           } = admin_join_response

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    Phoenix.ChannelTest.push(admin_socket, "tournament:start", %{})

    :timer.sleep(100)

    1..8
    |> Enum.each(fn _i ->
      assert_receive %Phoenix.Socket.Message{
        event: "tournament:round_created",
        payload: %{
          tournament: %{
            break_state: "off",
            current_round_position: 0,
            last_round_ended_at: nil,
            # todo use time mock
            last_round_started_at: _
          }
        }
      }
    end)

    assert_receive %Phoenix.Socket.Message{
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{id: ^u1_id, state: "active"},
        players: [%{state: "active"}, %{state: "active"}],
        match: %{game_id: game_id, state: "playing"}
      }
    }

    1..6
    |> Enum.each(fn _i ->
      assert_receive %Phoenix.Socket.Message{
        event: "waiting_room:player:match_created",
        payload: %{
          current_player: %{state: "active"},
          players: [%{state: "active"}, %{state: "active"}],
          match: %{state: "playing"}
        }
      }
    end)

    assert_receive %Phoenix.Socket.Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    {:ok, _response, socket8} =
      subscribe_and_join(socket8, TournamentChannel, tournament_topic)

    Phoenix.ChannelTest.push(socket8, "tournament:join", %{})

    1..9
    |> Enum.each(fn _i ->
      assert_receive %Phoenix.Socket.Message{
        event: "tournament:player:joined",
        payload: %{
          player: %Tournament.Player{clan_id: _, id: _, name: _, state: "active"},
          tournament: %{players_count: _}
        }
      }
    end)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    game_topic = "game:#{game_id}"
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: "lol",
      lang_slug: "js"
    })

    assert_receive %Phoenix.Socket.Broadcast{
      event: "user:start_check",
      payload: %{user_id: ^u1_id},
      topic: ^game_topic
    }

    assert_receive %Phoenix.Socket.Broadcast{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Phoenix.Socket.Message{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Phoenix.Socket.Message{
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          id: ^u1_id,
          state: "matchmaking_active",
          task_ids: [^t1_id],
          score: 3,
          place: 0,
          wins_count: 1
        }
      },
      topic: ^game_topic
    }

    Process.unlink(socket1.channel_pid)
    ref_1 = leave(socket1)
    Phoenix.ChannelTest.assert_reply(ref_1, :ok)
    assert_receive {:socket_close, _, {:shutdown, :left}}

    assert_receive %Phoenix.Socket.Message{
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          id: ^u1_id,
          state: "matchmaking_active",
          task_ids: [^t1_id],
          score: 3,
          place: 0,
          wins_count: 1
        }
      },
      topic: ^tournament_topic
    }

    assert_receive %Phoenix.Socket.Message{
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          state: "matchmaking_active",
          task_ids: [^t1_id],
          score: 1,
          place: 0,
          wins_count: 0
        }
      },
      topic: ^tournament_topic
    }

    assert_receive %Phoenix.Socket.Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{state: "active"}, %{state: "active"}],
        match: %{state: "game_over"}
      },
      topic: ^tournament_topic
    }

    assert_receive %Phoenix.Socket.Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{state: "active"}, %{state: "active"}],
        match: %{state: "game_over"}
      },
      topic: ^tournament_topic
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}
  end
end
