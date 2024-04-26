defmodule CodebattleWeb.Api.V1.ActivityControllerTest do
  use CodebattleWeb.ConnCase, async: false

  setup do
    Application.put_env(:codebattle, :allow_guests, false)

    clan1 = insert(:clan, name: "c1", long_name: "cl1")
    clan2 = insert(:clan, name: "c2", long_name: "cl2")
    user1 = insert(:user, name: "u1", clan_id: clan1.id)
    user2 = insert(:user, name: "u2", clan_id: clan1.id)
    user3 = insert(:user, name: "u3", clan_id: clan2.id)
    event = insert(:event)

    on_exit(fn -> Application.put_env(:codebattle, :allow_guests, true) end)
    %{clan1: clan1, clan2: clan2, user1: user1, user2: user2, user3: user3, event: event}
  end

  describe "/api/v1/events/:id/leaderboard" do
    test "show random for guest", %{
      conn: conn,
      event: event
    } do
      conn =
        conn
        |> put_req_header("accept", "application/json")
        |> get("/api/v1/events/#{event.id}/leaderboard", %{
          "type" => "clan"
        })

      html_response(conn, 302)
    end

    test "show clans for signed in", %{
      conn: conn,
      clan1: %{id: clan1_id},
      clan2: %{id: clan2_id},
      user1: %{id: user1_id},
      event: event
    } do
      conn =
        conn
        |> put_session(:user_id, user1_id)
        |> get("/api/v1/events/#{event.id}/leaderboard", %{"type" => "clan"})

      response = json_response(conn, 200)

      assert %{
               "items" => items,
               "page_info" => %{
                 "page_number" => 1,
                 "page_size" => 10,
                 "total_entries" => 2,
                 "total_pages" => 1
               }
             } = response

      assert [
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "players_count" => 2,
                 "score" => 0
               },
               %{
                 "clan_id" => ^clan2_id,
                 "clan_long_name" => "cl2",
                 "clan_name" => "c2",
                 "place" => 0,
                 "players_count" => 1,
                 "score" => 0
               }
             ] = Enum.sort_by(items, & &1["clan_id"])
    end

    test "show player for signed in", %{
      conn: conn,
      clan1: %{id: clan1_id},
      clan2: %{id: clan2_id},
      user1: %{id: user1_id},
      user2: %{id: user2_id},
      user3: %{id: user3_id},
      event: event
    } do
      conn =
        conn
        |> put_session(:user_id, user1_id)
        |> get("/api/v1/events/#{event.id}/leaderboard", %{"type" => "player"})

      response = json_response(conn, 200)

      assert %{
               "items" => items,
               "page_info" => %{
                 "page_number" => 1,
                 "page_size" => 10,
                 "total_entries" => 3,
                 "total_pages" => 1
               }
             } = response

      assert [
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user1_id,
                 "user_name" => "u1"
               },
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user2_id,
                 "user_name" => "u2"
               },
               %{
                 "clan_id" => ^clan2_id,
                 "clan_long_name" => "cl2",
                 "clan_name" => "c2",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user3_id,
                 "user_name" => "u3"
               }
             ] = Enum.sort_by(items, & &1["user_id"])
    end

    test "show player_clan for signed in", %{
      conn: conn,
      clan1: %{id: clan1_id},
      user1: %{id: user1_id},
      user2: %{id: user2_id},
      event: event
    } do
      conn =
        conn
        |> put_session(:user_id, user1_id)
        |> get("/api/v1/events/#{event.id}/leaderboard", %{
          "type" => "player_clan",
          "clan_id" => clan1_id
        })

      response = json_response(conn, 200)

      assert %{
               "items" => items,
               "page_info" => %{
                 "page_number" => 1,
                 "page_size" => 10,
                 "total_entries" => 2,
                 "total_pages" => 1
               }
             } = response

      assert [
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user1_id,
                 "user_name" => "u1"
               },
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user2_id,
                 "user_name" => "u2"
               }
             ] = Enum.sort_by(items, & &1["user_id"])
    end

    test "show random for signed in", %{
      conn: conn,
      user1: %{id: user1_id},
      event: event
    } do
      conn =
        conn
        |> put_session(:user_id, user1_id)
        |> get("/api/v1/events/#{event.id}/leaderboard", %{
          "type" => "random"
        })

      response = json_response(conn, 200)

      assert %{
               "items" => [],
               "page_info" => %{
                 "page_number" => 0,
                 "page_size" => 0,
                 "total_entries" => 0,
                 "total_pages" => 0
               }
             } = response
    end
  end

  describe "/public_api/v1/events/:id/leaderboard" do
    test "show clans for guest", %{
      conn: conn,
      clan1: %{id: clan1_id},
      clan2: %{id: clan2_id},
      event: event
    } do
      conn =
        conn
        |> put_req_header("accept", "application/json")
        |> get("/public_api/v1/events/#{event.id}/leaderboard", %{"type" => "clan"})

      response = json_response(conn, 200)

      assert %{
               "items" => items,
               "page_info" => %{
                 "page_number" => 1,
                 "page_size" => 10,
                 "total_entries" => 2,
                 "total_pages" => 1
               }
             } = response

      assert [
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "players_count" => 2,
                 "score" => 0
               },
               %{
                 "clan_id" => ^clan2_id,
                 "clan_long_name" => "cl2",
                 "clan_name" => "c2",
                 "place" => 0,
                 "players_count" => 1,
                 "score" => 0
               }
             ] = Enum.sort_by(items, & &1["clan_id"])
    end

    test "show player for guest", %{
      conn: conn,
      clan1: %{id: clan1_id},
      clan2: %{id: clan2_id},
      user1: %{id: user1_id},
      user2: %{id: user2_id},
      user3: %{id: user3_id},
      event: event
    } do
      conn =
        conn
        |> put_req_header("accept", "application/json")
        |> get("/public_api/v1/events/#{event.id}/leaderboard", %{"type" => "player"})

      response = json_response(conn, 200)

      assert %{
               "items" => items,
               "page_info" => %{
                 "page_number" => 1,
                 "page_size" => 10,
                 "total_entries" => 3,
                 "total_pages" => 1
               }
             } = response

      assert [
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user1_id,
                 "user_name" => "u1"
               },
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user2_id,
                 "user_name" => "u2"
               },
               %{
                 "clan_id" => ^clan2_id,
                 "clan_long_name" => "cl2",
                 "clan_name" => "c2",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user3_id,
                 "user_name" => "u3"
               }
             ] = Enum.sort_by(items, & &1["user_id"])
    end

    test "show player_clan for guest", %{
      conn: conn,
      clan1: %{id: clan1_id},
      user1: %{id: user1_id},
      user2: %{id: user2_id},
      event: event
    } do
      conn =
        conn
        |> put_req_header("accept", "application/json")
        |> get("/public_api/v1/events/#{event.id}/leaderboard", %{
          "type" => "player_clan",
          "clan_id" => clan1_id
        })

      response = json_response(conn, 200)

      assert %{
               "items" => items,
               "page_info" => %{
                 "page_number" => 1,
                 "page_size" => 10,
                 "total_entries" => 2,
                 "total_pages" => 1
               }
             } = response

      assert [
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user1_id,
                 "user_name" => "u1"
               },
               %{
                 "clan_id" => ^clan1_id,
                 "clan_long_name" => "cl1",
                 "clan_name" => "c1",
                 "place" => 0,
                 "score" => 0,
                 "user_id" => ^user2_id,
                 "user_name" => "u2"
               }
             ] = Enum.sort_by(items, & &1["user_id"])
    end

    test "show random for guest", %{
      conn: conn,
      user1: %{id: user1_id},
      event: event
    } do
      conn =
        conn
        |> put_session(:user_id, user1_id)
        |> get("/public_api/v1/events/#{event.id}/leaderboard", %{
          "type" => "random"
        })

      response = json_response(conn, 200)

      assert %{
               "items" => [],
               "page_info" => %{
                 "page_number" => 0,
                 "page_size" => 0,
                 "total_entries" => 0,
                 "total_pages" => 0
               }
             } = response
    end
  end
end
