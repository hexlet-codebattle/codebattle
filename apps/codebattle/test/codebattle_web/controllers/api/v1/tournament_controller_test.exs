defmodule CodebattleWeb.Api.V1.TournamentControllerTest do
  use CodebattleWeb.ConnCase, async: true

  describe "#index" do
    test "shows empty tournaments", %{conn: conn} do
      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, guest_user.id)
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
        |> put_session(:user_id, user.id)
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
        |> put_session(:user_id, user.id)
        |> get(Routes.api_v1_tournament_path(conn, :index))

      assert %{
               "season_tournaments" => season_tournaments,
               "user_tournaments" => []
             } = json_response(conn, 200)

      within_default_range_id = within_default_range.id
      assert [%{"id" => ^within_default_range_id}] = season_tournaments
    end
  end
end
