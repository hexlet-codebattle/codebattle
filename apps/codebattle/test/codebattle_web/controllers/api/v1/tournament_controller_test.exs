defmodule CodebattleWeb.Api.V1.TournamentControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Tournament.Context
  alias Codebattle.Tournament.Server

  describe "#index" do
    test "shows empty tournaments", %{conn: conn} do
      user = insert(:user)

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index))

      assert json_response(conn, 200) == %{"season_tournaments" => [], "user_tournaments" => []}
    end

    test "shows some tournaments", %{conn: conn} do
      user = insert(:user)

      upcoming_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
        )

      user_tournament =
        insert(:tournament,
          creator_id: user.id,
          grade: "open",
          starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
        )

      winner_tournament =
        insert(:tournament,
          state: "finished",
          winner_ids: [1, 2, 3, user.id],
          grade: "open",
          starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
        )

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index))

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => user_tournaments
             } = json_response(conn, 200)

      upcoming_tournament_id = upcoming_tournament.id
      user_tournament_id = user_tournament.id
      winner_tournament_id = winner_tournament.id

      assert [%{"id" => ^upcoming_tournament_id}] = season_tournaments
      assert [%{"id" => ^user_tournament_id}, %{"id" => ^winner_tournament_id}] = user_tournaments
    end

    test "filters tournaments by date_from parameter", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()

      # Tournament before the filter date - should not appear
      _old_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, -2, :day)
        )

      # Tournament after the filter date - should appear
      new_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 2, :day)
        )

      from_date = now |> DateTime.add(1, :day) |> DateTime.to_iso8601()

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{"from" => from_date})

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      new_tournament_id = new_tournament.id
      assert [%{"id" => ^new_tournament_id}] = season_tournaments
    end

    test "filters tournaments by date_to parameter", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()

      # Tournament before the filter date - should appear
      old_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 1, :day)
        )

      # Tournament after the filter date - should not appear
      _new_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 3, :day)
        )

      to_date = now |> DateTime.add(2, :day) |> DateTime.to_iso8601()

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{"to" => to_date})

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      old_tournament_id = old_tournament.id
      assert [%{"id" => ^old_tournament_id}] = season_tournaments
    end

    test "filters tournaments by both date_from and date_to parameters", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()

      # Tournament before range - should not appear
      _too_old_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, -1, :day)
        )

      # Tournament in range - should appear
      in_range_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 2, :day)
        )

      # Tournament after range - should not appear
      _too_new_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 5, :day)
        )

      from_date = now |> DateTime.add(1, :day) |> DateTime.to_iso8601()
      to_date = now |> DateTime.add(3, :day) |> DateTime.to_iso8601()

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{
          "from" => from_date,
          "to" => to_date
        })

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      in_range_tournament_id = in_range_tournament.id
      assert [%{"id" => ^in_range_tournament_id}] = season_tournaments
    end

    test "filters user tournaments by date range", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()

      # User tournament before range - should not appear
      _old_user_tournament =
        insert(:tournament,
          creator_id: user.id,
          grade: "open",
          starts_at: DateTime.add(now, -1, :day)
        )

      # User tournament in range - should appear
      in_range_user_tournament =
        insert(:tournament,
          creator_id: user.id,
          grade: "open",
          starts_at: DateTime.add(now, 2, :day)
        )

      # Winner tournament in range - should appear
      in_range_winner_tournament =
        insert(:tournament,
          state: "finished",
          winner_ids: [user.id],
          grade: "open",
          starts_at: DateTime.add(now, 2, :day)
        )

      # User tournament after range - should not appear
      _new_user_tournament =
        insert(:tournament,
          creator_id: user.id,
          grade: "open",
          starts_at: DateTime.add(now, 5, :day)
        )

      from_date = now |> DateTime.add(1, :day) |> DateTime.to_iso8601()
      to_date = now |> DateTime.add(3, :day) |> DateTime.to_iso8601()

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{
          "from" => from_date,
          "to" => to_date
        })

      assert %{
               "season_tournaments" => [],
               "user_tournaments" => user_tournaments
             } = json_response(conn, 200)

      in_range_user_tournament_id = in_range_user_tournament.id
      in_range_winner_tournament_id = in_range_winner_tournament.id

      tournament_ids = Enum.map(user_tournaments, & &1["id"])
      assert in_range_user_tournament_id in tournament_ids
      assert in_range_winner_tournament_id in tournament_ids
      assert length(user_tournaments) == 2
    end

    test "handles invalid date_from parameter gracefully", %{conn: conn} do
      user = insert(:user)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
        )

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{"from" => "invalid-date"})

      # Should fall back to default behavior (current time as from date)
      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      tournament_id = tournament.id
      assert [%{"id" => ^tournament_id}] = season_tournaments
    end

    test "handles invalid date_to parameter gracefully", %{conn: conn} do
      user = insert(:user)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
        )

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{"to" => "invalid-date"})

      # Should fall back to default behavior (30 days from now as to date)
      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      tournament_id = tournament.id
      assert [%{"id" => ^tournament_id}] = season_tournaments
    end

    test "handles edge case where from date equals to date", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()
      target_date = DateTime.add(now, 1, :day)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: target_date
        )

      date_string = DateTime.to_iso8601(target_date)

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{
          "from" => date_string,
          "to" => date_string
        })

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      tournament_id = tournament.id
      assert [%{"id" => ^tournament_id}] = season_tournaments
    end

    test "returns empty result when date range excludes all tournaments", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()

      # Tournament outside the search range
      _tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 10, :day)
        )

      from_date = now |> DateTime.add(1, :day) |> DateTime.to_iso8601()
      to_date = now |> DateTime.add(2, :day) |> DateTime.to_iso8601()

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{
          "from" => from_date,
          "to" => to_date
        })

      assert json_response(conn, 200) == %{"season_tournaments" => [], "user_tournaments" => []}
    end

    test "guest user gets no user tournaments regardless of date filters", %{conn: conn} do
      now = DateTime.utc_now()
      guest_user = insert(:user, is_guest: true)

      upcoming_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 1, :day)
        )

      from_date = now |> DateTime.add(1, :day) |> DateTime.to_iso8601()
      to_date = now |> DateTime.add(2, :day) |> DateTime.to_iso8601()

      conn =
        conn
        |> log_in_user(guest_user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{
          "from" => from_date,
          "to" => to_date
        })

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      upcoming_tournament_id = upcoming_tournament.id
      assert [%{"id" => ^upcoming_tournament_id}] = season_tournaments
    end

    test "respects tournament grade filter for upcoming vs user tournaments", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()

      # Non-open grade tournaments go to season_tournaments
      masters_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 1, :day)
        )

      elementary_tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "elementary",
          starts_at: DateTime.add(now, 1, :day)
        )

      # Open grade tournaments go to user_tournaments (if user is creator or winner)
      user_open_tournament =
        insert(:tournament,
          creator_id: user.id,
          grade: "open",
          starts_at: DateTime.add(now, 1, :day)
        )

      from_date = now |> DateTime.add(1, :day) |> DateTime.to_iso8601()
      to_date = now |> DateTime.add(2, :day) |> DateTime.to_iso8601()

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index), %{
          "from" => from_date,
          "to" => to_date
        })

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => user_tournaments
             } = json_response(conn, 200)

      masters_tournament_id = masters_tournament.id
      elementary_tournament_id = elementary_tournament.id
      user_open_tournament_id = user_open_tournament.id

      upcoming_ids = Enum.map(season_tournaments, & &1["id"])
      user_ids = Enum.map(user_tournaments, & &1["id"])

      assert masters_tournament_id in upcoming_ids
      assert elementary_tournament_id in upcoming_ids
      assert user_open_tournament_id in user_ids
      assert length(season_tournaments) == 2
      assert length(user_tournaments) == 1
    end

    test "uses default date range when no date parameters provided", %{conn: conn} do
      user = insert(:user)
      now = DateTime.utc_now()

      # Tournament within default range (30 days from now)
      within_default_range =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 15, :day)
        )

      # Tournament outside default range (more than 30 days from now)
      _outside_default_range =
        insert(:tournament,
          state: "upcoming",
          grade: "masters",
          starts_at: DateTime.add(now, 35, :day)
        )

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index))

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      within_default_range_id = within_default_range.id
      assert [%{"id" => ^within_default_range_id}] = season_tournaments
    end
  end

  describe "#update" do
    test "allows a moderator to update a tournament", %{conn: conn} do
      creator = insert(:user)
      moderator = insert(:user)

      tournament =
        insert(:tournament,
          creator_id: creator.id,
          moderator_ids: [moderator.id],
          name: "Before update",
          description: "Old description",
          starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
        )

      conn =
        conn
        |> log_in_user(moderator.id)
        |> put(
          Routes.api_v1_tournament_path(conn, :update, tournament.id),
          %{
            "tournament" => %{
              "name" => "After update",
              "description" => "Updated description",
              "starts_at" => "2026-02-25T06:00",
              "user_timezone" => "Etc/UTC"
            }
          }
        )

      assert %{"tournament" => %{"name" => "After update"}} = json_response(conn, 200)
    end

    test "updates moderator ids in db and live tournament state", %{conn: conn} do
      creator = insert(:user)
      moderator = insert(:user)
      new_moderator = insert(:user)

      {:ok, tournament} =
        Context.create(%{
          "starts_at" => "2026-02-24T06:00",
          "name" => "Moderator update",
          "description" => "Moderator update",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => creator,
          "moderator_ids" => [moderator.id],
          "break_duration_seconds" => 0,
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 200
        })

      conn =
        conn
        |> log_in_user(moderator.id)
        |> put(
          Routes.api_v1_tournament_path(conn, :update, tournament.id),
          %{
            "tournament" => %{
              "name" => tournament.name,
              "description" => tournament.description,
              "starts_at" => "2026-02-25T06:00",
              "moderator_ids" => ["#{new_moderator.id}", "#{creator.id}", "#{new_moderator.id}"],
              "user_timezone" => "Etc/UTC"
            }
          }
        )

      assert %{"tournament" => %{"moderator_ids" => [updated_moderator_id]}} = json_response(conn, 200)
      assert updated_moderator_id == new_moderator.id

      updated_tournament = Context.get!(tournament.id)
      live_tournament = Server.get_tournament(tournament.id)

      assert updated_tournament.moderator_ids == [new_moderator.id]
      assert live_tournament.moderator_ids == [new_moderator.id]
    end

    test "admin updates meta from the form meta_json field in db and live tournament state", %{conn: conn} do
      creator = insert(:admin)

      {:ok, tournament} =
        Context.create(%{
          "starts_at" => "2026-02-24T06:00",
          "name" => "Meta update",
          "description" => "Meta update",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => creator,
          "break_duration_seconds" => 0,
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 200
        })

      assert tournament.meta == %{}

      conn =
        conn
        |> log_in_user(creator.id)
        |> put(
          Routes.api_v1_tournament_path(conn, :update, tournament.id),
          %{
            "tournament" => %{
              "name" => tournament.name,
              "description" => tournament.description,
              "starts_at" => "2026-02-25T06:00",
              "user_timezone" => "Etc/UTC",
              "meta_json" => ~s({"rounds_config_type": "per_round", "game_passwords": ["secret"]})
            }
          }
        )

      assert %{
               "tournament" => %{
                 "meta" => %{
                   "rounds_config_type" => "per_round",
                   "game_passwords" => ["secret"]
                 }
               }
             } = json_response(conn, 200)

      updated_tournament = Context.get!(tournament.id)
      live_tournament = Server.get_tournament(tournament.id)

      assert updated_tournament.meta == %{rounds_config_type: "per_round", game_passwords: ["secret"]}
      assert live_tournament.meta == %{rounds_config_type: "per_round", game_passwords: ["secret"]}
    end

    test "keeps meta empty when meta_json is blank or invalid", %{conn: conn} do
      creator = insert(:admin)

      {:ok, tournament} =
        Context.create(%{
          "starts_at" => "2026-02-24T06:00",
          "name" => "Invalid meta",
          "description" => "Invalid meta",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => creator,
          "break_duration_seconds" => 0,
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 200
        })

      conn =
        conn
        |> log_in_user(creator.id)
        |> put(
          Routes.api_v1_tournament_path(conn, :update, tournament.id),
          %{
            "tournament" => %{
              "name" => tournament.name,
              "description" => tournament.description,
              "starts_at" => "2026-02-25T06:00",
              "user_timezone" => "Etc/UTC",
              "meta_json" => "{ not valid json"
            }
          }
        )

      assert %{"tournament" => %{"meta" => meta}} = json_response(conn, 200)
      assert meta == %{}
    end

    test "includes moderator tournaments in user tournaments list", %{conn: conn} do
      moderator = insert(:user)

      moderated_tournament =
        insert(:tournament,
          moderator_ids: [moderator.id],
          grade: "open",
          starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
        )

      conn =
        conn
        |> log_in_user(moderator.id)
        |> get(Routes.api_v1_tournament_path(conn, :index))

      assert %{"user_tournaments" => user_tournaments} = json_response(conn, 200)

      moderated_tournament_id = moderated_tournament.id
      assert Enum.any?(user_tournaments, &(&1["id"] == moderated_tournament_id))
    end
  end

  describe "#created" do
    test "returns only tournaments created by the current user, newest first", %{conn: conn} do
      user = insert(:user)
      other = insert(:user)

      first = insert(:tournament, creator: nil, creator_id: user.id, state: "finished")
      second = insert(:tournament, creator: nil, creator_id: user.id, state: "finished")
      insert(:tournament, creator: nil, creator_id: other.id, state: "finished")

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :created))

      assert %{"tournaments" => tournaments, "page_info" => page_info} = json_response(conn, 200)
      assert Enum.map(tournaments, & &1["id"]) == [second.id, first.id]
      assert page_info["total_entries"] == 2
      assert page_info["total_pages"] == 1
    end

    test "paginates results", %{conn: conn} do
      user = insert(:user)

      for _ <- 1..3 do
        insert(:tournament, creator: nil, creator_id: user.id, state: "finished")
      end

      conn =
        conn
        |> log_in_user(user.id)
        |> get(Routes.api_v1_tournament_path(conn, :created), %{"page" => "1", "page_size" => "2"})

      assert %{"tournaments" => tournaments, "page_info" => page_info} = json_response(conn, 200)
      assert length(tournaments) == 2
      assert page_info["total_entries"] == 3
      assert page_info["total_pages"] == 2
    end
  end

  describe "#show access" do
    test "does not leak a private tournament to a stranger", %{conn: conn} do
      stranger = insert(:user)
      tournament = insert(:token_tournament, creator_id: insert(:user).id, access_token: "secret-token")

      conn
      |> log_in_user(stranger.id)
      |> get(Routes.api_v1_tournament_path(conn, :show, tournament.id))
      |> json_response(404)
    end

    test "shows a private tournament without secrets to a user with the access token", %{conn: conn} do
      user = insert(:user)
      tournament = insert(:token_tournament, creator_id: insert(:user).id, access_token: "secret-token")

      assert %{"tournament" => body} =
               conn
               |> log_in_user(user.id)
               |> get(Routes.api_v1_tournament_path(conn, :show, tournament.id), %{"access_token" => "secret-token"})
               |> json_response(200)

      assert body["id"] == tournament.id
      refute Map.has_key?(body, "access_token")
      refute Map.has_key?(body, "players")
      refute Map.has_key?(body, "matches")
      refute Map.has_key?(body, "meta")
    end

    test "shows the access token to the creator", %{conn: conn} do
      creator = insert(:user)
      tournament = insert(:token_tournament, creator_id: creator.id, access_token: "secret-token")

      assert %{"tournament" => %{"access_token" => "secret-token"}} =
               conn
               |> log_in_user(creator.id)
               |> get(Routes.api_v1_tournament_path(conn, :show, tournament.id))
               |> json_response(200)
    end

    test "index items carry no secrets", %{conn: conn} do
      user = insert(:user)

      insert(:token_tournament,
        creator_id: user.id,
        access_token: "secret-token",
        grade: "open",
        starts_at: DateTime.add(DateTime.utc_now(), 1, :day)
      )

      assert %{"user_tournaments" => [item]} =
               conn
               |> log_in_user(user.id)
               |> get(Routes.api_v1_tournament_path(conn, :index))
               |> json_response(200)

      for key <- ~w(access_token players matches meta cheater_ids) do
        refute Map.has_key?(item, key)
      end
    end
  end

  describe "#create permissions" do
    test "ignores fields a regular user must not set", %{conn: conn} do
      user = insert(:user)
      event = insert(:event, title: "Season event")

      assert %{"tournament" => %{"id" => id}} =
               conn
               |> log_in_user(user.id)
               |> post(Routes.api_v1_tournament_path(conn, :create), %{
                 "tournament" =>
                   tournament_form_params(%{
                     "grade" => "grand_slam",
                     "event_id" => event.id,
                     "use_event_ranking" => true,
                     "state" => "finished",
                     "task_ids" => [1, 2, 3],
                     "cheater_ids" => [user.id],
                     "meta_json" => ~s({"players_redirect_url": "https://evil.example", "task_pack_id": 1})
                   })
               })
               |> json_response(201)

      tournament = Context.get_from_db!(id)

      assert tournament.grade == "open"
      assert tournament.event_id == nil
      assert tournament.use_event_ranking == false
      assert tournament.state == "waiting_participants"
      assert tournament.cheater_ids == []
      assert tournament.meta == %{}
    end

    test "lets an admin set the grade", %{conn: conn} do
      admin = insert(:admin)

      assert %{"tournament" => %{"id" => id}} =
               conn
               |> log_in_user(admin.id)
               |> post(Routes.api_v1_tournament_path(conn, :create), %{
                 "tournament" => tournament_form_params(%{"grade" => "masters"})
               })
               |> json_response(201)

      assert Context.get_from_db!(id).grade == "masters"
    end

    test "rejects a hidden task pack of another user", %{conn: conn} do
      user = insert(:user)
      task = insert(:task, visibility: "hidden")
      pack = insert(:task_pack, name: "grand_slam_s9_2099", visibility: "hidden", task_ids: [task.id])

      assert %{"errors" => %{"task_pack_name" => [_]}} =
               conn
               |> log_in_user(user.id)
               |> post(Routes.api_v1_tournament_path(conn, :create), %{
                 "tournament" => tournament_form_params(%{"task_provider" => "task_pack", "task_pack_name" => pack.name})
               })
               |> json_response(422)
    end

    test "accepts an own hidden task pack and a public one", %{conn: conn} do
      user = insert(:user)
      task = insert(:task)
      own_pack = insert(:task_pack, visibility: "hidden", creator_id: user.id, task_ids: [task.id])
      public_pack = insert(:task_pack, task_ids: [task.id])
      conn = log_in_user(conn, user.id)

      for pack <- [own_pack, public_pack] do
        conn
        |> post(Routes.api_v1_tournament_path(conn, :create), %{
          "tournament" => tournament_form_params(%{"task_provider" => "task_pack", "task_pack_name" => pack.name})
        })
        |> json_response(201)
      end
    end
  end

  describe "#update permissions" do
    test "a regular moderator cannot change the grade or meta", %{conn: conn} do
      creator = insert(:user)

      {:ok, tournament} =
        Context.create(
          tournament_form_params(%{
            "creator" => creator,
            "grade" => "masters",
            "meta" => %{game_passwords: ["secret"]}
          })
        )

      conn
      |> log_in_user(creator.id)
      |> put(Routes.api_v1_tournament_path(conn, :update, tournament.id), %{
        "tournament" =>
          tournament_form_params(%{
            "name" => "Renamed",
            "grade" => "grand_slam",
            "meta_json" => ~s({"players_redirect_url": "https://evil.example"})
          })
      })
      |> json_response(200)

      updated = Context.get_from_db!(tournament.id)

      assert updated.name == "Renamed"
      assert updated.grade == "masters"
      assert updated.meta == %{game_passwords: ["secret"]}
    end

    test "a regular moderator keeps an unchanged hidden task pack", %{conn: conn} do
      creator = insert(:user)
      task = insert(:task, visibility: "hidden")
      pack = insert(:task_pack, visibility: "hidden", task_ids: [task.id])

      {:ok, tournament} =
        Context.create(
          tournament_form_params(%{
            "creator" => creator,
            "task_provider" => "task_pack",
            "task_pack_name" => pack.name
          })
        )

      conn
      |> log_in_user(creator.id)
      |> put(Routes.api_v1_tournament_path(conn, :update, tournament.id), %{
        "tournament" =>
          tournament_form_params(%{"name" => "Renamed", "task_provider" => "task_pack", "task_pack_name" => pack.name})
      })
      |> json_response(200)
    end
  end

  defp tournament_form_params(overrides) do
    Map.merge(
      %{
        "name" => "Form tournament",
        "description" => "Created from the form",
        "starts_at" => "2026-02-24T06:00",
        "user_timezone" => "Etc/UTC",
        "type" => "swiss",
        "level" => "easy",
        "break_duration_seconds" => 0,
        "players_limit" => 16,
        "rounds_limit" => 1
      },
      overrides
    )
  end
end
