defmodule CodebattleWeb.Api.V1.UserControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo
  alias Codebattle.Season
  alias Codebattle.SeasonResult
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User.Achievements

  describe "#index" do
    test "shows rating list", %{conn: conn} do
      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      insert(:user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])
      insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})
      insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

      conn = get(conn, Routes.api_v1_user_path(conn, :index))

      resp_body = json_response(conn, 200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 4,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == nil
      assert Enum.count(resp_body["users"]) == 4
    end

    test "shows rating list with date_from filter", %{conn: conn} do
      date_from = "2020-10-10"
      starts_at = ~N[2020-10-10 10:00:00]

      user1 =
        insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      game = insert(:game, starts_at: starts_at)
      insert(:user_game, user: user1, game: game)
      insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "third", email: "test3@test.test", github_id: 3, rating: 2210})
      insert(:user, %{name: "forth", email: "test4@test.test", github_id: 4, rating: 2210})

      conn = get(conn, Routes.api_v1_user_path(conn, :index), %{"date_from" => date_from})

      resp_body = json_response(conn, 200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 1,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == date_from
      assert Enum.count(resp_body["users"]) == 1
    end

    test "shows rating list with with search by name_ilike", %{conn: conn} do
      user1 = insert(:user, %{name: "aaa", email: "test1@test.test", github_id: 1, rating: 2400})
      insert(:user_game, user: user1, inserted_at: ~N[2000-01-01 23:00:07])
      insert(:user, %{name: "bbb", email: "test2@test.test", github_id: 2, rating: 2310})
      insert(:user, %{name: "ab", email: "test3@test.test", github_id: 3, rating: 2210})

      conn = get(conn, Routes.api_v1_user_path(conn, :index, q: %{name_ilike: "a"}))

      resp_body = json_response(conn, 200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 2,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == nil
      assert Enum.count(resp_body["users"]) == 2
    end

    test "shows rating list sorted by inserted at", %{conn: conn} do
      insert(
        :user,
        %{
          name: "aaa",
          email: "test1@test.test",
          github_id: 1,
          rating: 2400,
          inserted_at: ~N[2000-01-01 23:00:07]
        }
      )

      conn = get(conn, Routes.api_v1_user_path(conn, :index, s: "inserted_at+asc"))

      resp_body = json_response(conn, 200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 50,
               "total_entries" => 1,
               "total_pages" => 1
             }

      assert resp_body["date_from"] == nil

      [first_user | _] = resp_body["users"]

      assert Map.take(first_user, ~w(name email github_id)) == %{
               "name" => "aaa",
               "github_id" => 1
             }
    end
  end

  describe "stats" do
    test "shows user stats", %{conn: conn} do
      user1 = insert(:user, %{name: "1", github_id: 1, rating: 2400})
      user2 = insert(:user, %{name: "2", github_id: 2, rating: 2310})
      game1 = insert(:game, state: "game_over")
      game2 = insert(:game, state: "game_over")
      game3 = insert(:game, state: "game_over")
      %{id: game4_id} = insert(:game, state: "playing", player_ids: [user1.id])
      insert(:user_game, user: user1, creator: false, game: game1, result: "won", lang: "js")
      insert(:user_game, user: user2, creator: false, game: game1, result: "lost", lang: "js")
      insert(:user_game, user: user1, creator: false, game: game2, result: "lost", lang: "ruby")
      insert(:user_game, user: user2, creator: false, game: game2, result: "won", lang: "ruby")
      insert(:user_game, user: user1, creator: false, game: game3, result: "lost", lang: "golang")
      insert(:user_game, user: user2, creator: false, game: game3, result: "won", lang: "golang")
      :ok = Achievements.recalculate_user(user1.id)
      :ok = Achievements.recalculate_user(user2.id)

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :stats, user1.id))
        |> json_response(200)

      assert resp_body["active_game_id"] == game4_id
      assert resp_body["stats"]["games"] == %{"gave_up" => 0, "lost" => 2, "won" => 1}
      assert resp_body["metrics"]["game_stats"] == %{"gave_up" => 0, "lost" => 2, "won" => 1}
      assert resp_body["metrics"]["language_stats"] == %{"golang" => 1, "js" => 1, "ruby" => 1}

      assert Enum.sort(resp_body["stats"]["all"]) ==
               Enum.sort([
                 %{"count" => 1, "lang" => "ruby", "result" => "lost"},
                 %{"count" => 1, "lang" => "golang", "result" => "lost"},
                 %{"count" => 1, "lang" => "js", "result" => "won"}
               ])

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :stats, user2.id))
        |> json_response(200)

      assert resp_body["active_game_id"] == nil
      assert resp_body["stats"]["games"] == %{"gave_up" => 0, "lost" => 1, "won" => 2}
      assert resp_body["metrics"]["game_stats"] == %{"gave_up" => 0, "lost" => 1, "won" => 2}
      assert resp_body["metrics"]["language_stats"] == %{"golang" => 1, "js" => 1, "ruby" => 1}

      assert Enum.sort(resp_body["stats"]["all"]) ==
               Enum.sort([
                 %{"count" => 1, "lang" => "ruby", "result" => "won"},
                 %{"count" => 1, "lang" => "golang", "result" => "won"},
                 %{"count" => 1, "lang" => "js", "result" => "lost"}
               ])
    end

    test "shows season results in user stats", %{conn: conn} do
      user = insert(:user, %{name: "season_user", github_id: 12_345})

      season =
        Repo.insert!(%Season{
          name: "Season 1",
          year: 2026,
          starts_at: ~D[2026-01-01],
          ends_at: ~D[2026-03-31]
        })

      Repo.insert!(%SeasonResult{
        season_id: season.id,
        user_id: user.id,
        user_name: user.name,
        user_lang: "elixir",
        place: 4,
        total_points: 128,
        total_score: 2300,
        tournaments_count: 7,
        total_games_count: 28,
        total_wins_count: 19,
        total_time: 4100
      })

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :stats, user.id))
        |> json_response(200)

      assert [season_result] = resp_body["season_results"]
      assert season_result["season_id"] == season.id
      assert season_result["season_name"] == "Season 1"
      assert season_result["season_year"] == 2026
      assert season_result["place"] == 4
      assert season_result["total_points"] == 128
    end
  end

  describe "rivals" do
    test "shows top rivals excluding bots", %{conn: conn} do
      user = insert(:user, %{name: "hero", github_id: 9001})
      rival1 = insert(:user, %{name: "rival_1", github_id: 9002, clan: "Clan A"})
      rival2 = insert(:user, %{name: "rival_2", github_id: 9003, clan: "Clan B"})
      rival3 = insert(:user, %{name: "rival_3", github_id: 9004, clan: "Clan C"})
      bot = insert(:user, %{name: "bot_rival", is_bot: true, github_id: 9100})

      game1 = insert(:game, state: "game_over")
      insert(:user_game, user: user, game: game1, result: "won")
      insert(:user_game, user: rival1, game: game1, result: "lost")

      game2 = insert(:game, state: "game_over")
      insert(:user_game, user: user, game: game2, result: "lost")
      insert(:user_game, user: rival1, game: game2, result: "won")

      game3 = insert(:game, state: "game_over")
      insert(:user_game, user: user, game: game3, result: "timeout")
      insert(:user_game, user: rival1, game: game3, result: "won")

      game4 = insert(:game, state: "game_over")
      insert(:user_game, user: user, game: game4, result: "won")
      insert(:user_game, user: rival2, game: game4, result: "lost")

      game5 = insert(:game, state: "game_over")
      insert(:user_game, user: user, game: game5, result: "won")
      insert(:user_game, user: rival2, game: game5, result: "lost")

      game6 = insert(:game, state: "game_over")
      insert(:user_game, user: user, game: game6, result: "lost")
      insert(:user_game, user: rival3, game: game6, result: "won")

      game7 = insert(:game, state: "game_over")
      insert(:user_game, user: user, game: game7, result: "won")
      insert(:user_game, user: bot, game: game7, result: "lost")

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :rivals, user.id))
        |> json_response(200)

      assert [first, second, third] = resp_body["top_rivals"]
      assert first["name"] == "rival_1"
      assert first["games_count"] == 3
      assert first["wins_count"] == 1
      assert first["losses_count"] == 1
      assert first["timeouts_count"] == 1

      assert second["name"] == "rival_2"
      assert second["games_count"] == 2
      assert second["wins_count"] == 2
      assert second["losses_count"] == 0
      assert second["timeouts_count"] == 0

      assert third["name"] == "rival_3"
      assert third["games_count"] == 1
      assert third["wins_count"] == 0
      assert third["losses_count"] == 1
      assert third["timeouts_count"] == 0

      refute Enum.any?(resp_body["top_rivals"], &(&1["name"] == "bot_rival"))
    end
  end

  describe "achievements" do
    test "shows lightweight achievements and metrics payload", %{conn: conn} do
      user = insert(:user, %{name: "1", github_id: 1, rating: 2400})
      bot = insert(:user, %{is_bot: true, name: "bot"})
      game = insert(:game, state: "game_over")
      %{id: active_game_id} = insert(:game, state: "playing", player_ids: [user.id])

      insert(:user_game, user: user, creator: false, game: game, result: "won", lang: "js")
      insert(:user_game, user: bot, creator: false, game: game, result: "lost", lang: "js")

      :ok = Achievements.recalculate_user(user.id)

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :achievements, user.id))
        |> json_response(200)

      assert %{
               "active_game_id" => ^active_game_id,
               "metrics" => %{
                 "game_stats" => %{"gave_up" => 0, "lost" => 0, "won" => 1}
               },
               "achievements" => achievements,
               "user" => _user
             } = resp_body

      refute Map.has_key?(resp_body, "stats")
      assert is_list(achievements)
    end
  end

  describe "tournaments" do
    test "shows paginated user tournament history with stats", %{conn: conn} do
      user = insert(:user, %{name: "u1", github_id: 111})
      other_user = insert(:user, %{name: "u2", github_id: 222})

      tournament1 =
        insert(:tournament, %{
          name: "Masters Cup",
          grade: "masters",
          type: "swiss",
          state: "finished",
          started_at: ~U[2026-01-01 10:00:00Z],
          finished_at: ~U[2026-01-01 11:00:00Z]
        })

      tournament2 =
        insert(:tournament, %{
          name: "Rookie Clash",
          grade: "rookie",
          type: "swiss",
          state: "finished",
          started_at: ~U[2026-01-02 10:00:00Z],
          finished_at: ~U[2026-01-02 11:00:00Z]
        })

      _other_user_tournament =
        insert(:tournament, %{
          name: "Other User Cup",
          grade: "pro",
          type: "swiss",
          state: "finished",
          started_at: ~U[2026-01-03 10:00:00Z],
          finished_at: ~U[2026-01-03 11:00:00Z]
        })

      Repo.insert!(%TournamentUserResult{
        tournament_id: tournament1.id,
        user_id: user.id,
        user_name: user.name,
        user_lang: "js",
        clan_name: "Clan A",
        place: 2,
        points: 64,
        score: 1440,
        games_count: 9,
        wins_count: 6,
        total_time: 3600,
        avg_result_percent: Decimal.new("78.3"),
        is_cheater: false
      })

      Repo.insert!(%TournamentUserResult{
        tournament_id: tournament2.id,
        user_id: user.id,
        user_name: user.name,
        user_lang: "elixir",
        clan_name: "Clan A",
        place: 1,
        points: 8,
        score: 820,
        games_count: 5,
        wins_count: 4,
        total_time: 1800,
        avg_result_percent: Decimal.new("88.0"),
        is_cheater: false
      })

      Repo.insert!(%TournamentUserResult{
        tournament_id: tournament2.id,
        user_id: other_user.id,
        user_name: other_user.name,
        user_lang: "python",
        clan_name: "Clan B",
        place: 3,
        points: 2,
        score: 500,
        games_count: 5,
        wins_count: 1,
        total_time: 2100,
        avg_result_percent: Decimal.new("55.0"),
        is_cheater: false
      })

      resp_body =
        conn
        |> get(Routes.api_v1_user_path(conn, :tournaments, user.id), %{"page_size" => "1", "page" => "1"})
        |> json_response(200)

      assert resp_body["page_info"] == %{
               "page_number" => 1,
               "page_size" => 1,
               "total_entries" => 2,
               "total_pages" => 2
             }

      assert [tournament] = resp_body["tournaments"]
      assert tournament["tournament_name"] == "Rookie Clash"
      assert tournament["tournament_grade"] == "rookie"
      assert tournament["place"] == 1
      assert tournament["points"] == 8
      assert tournament["score"] == 820
      assert tournament["games_count"] == 5
      assert tournament["wins_count"] == 4
      assert tournament["user_lang"] == "elixir"
      assert tournament["clan_name"] == "Clan A"
    end
  end

  describe "#current" do
    test "shows current_user when logged in", %{conn: conn} do
      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get(Routes.api_v1_user_path(conn, :current))

      resp_body = json_response(conn, 200)

      assert resp_body == %{"id" => user.id}
    end

    test "shows current_user when not logged in", %{conn: conn} do
      conn = get(conn, Routes.api_v1_user_path(conn, :current))

      resp_body = json_response(conn, 200)

      assert resp_body == %{"id" => 0}
    end
  end
end
