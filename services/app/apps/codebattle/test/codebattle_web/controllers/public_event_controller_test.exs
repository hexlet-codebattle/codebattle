defmodule CodebattleWeb.PublicEventControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.UserEvent

  describe ".show" do
    setup do
      FunWithFlags.enable(:allow_event_page)
      :ok
    end

    test "renders event page when user is authenticated", %{conn: conn} do
      user = insert(:user)
      event = insert(:event, slug: "q", ticker_text: "Test Event")
      insert(:user_event, user_id: user.id, event_id: event.id)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get(Routes.public_event_path(conn, :show, event.slug))

      assert html_response(conn, 200) =~ event.ticker_text
    end

    test "redirects to login when user is not authenticated", %{conn: conn} do
      event = insert(:event, slug: "q")

      conn = get(conn, Routes.public_event_path(conn, :show, event.slug))

      assert redirected_to(conn) =~ Routes.session_path(conn, :new)
    end
  end

  describe ".stage" do
    setup do
      FunWithFlags.enable(:allow_event_page)
      user = insert(:user)

      event =
        insert(:event,
          slug: "q",
          ticker_text: "Test Event",
          stages: [
            %{
              name: "Qualification",
              slug: "q",
              status: :active,
              type: :tournament,
              playing_type: :single,
              tournament_meta: %{
                type: :swiss,
                rounds_limit: 7,
                access_type: "token",
                score_strategy: "win_loss",
                state: :waiting_participants,
                task_pack_name: "7_elementary",
                tournament_timeout_seconds: 75 * 60,
                players_limit: 128,
                ranking_type: "void",
                task_provider: "task_pack",
                task_strategy: "sequential"
              }
            }
          ]
        )

      {:ok, user: user, event: event}
    end

    test "redirects to tournament when starting a stage", %{
      conn: conn,
      user: user,
      event: event
    } do
      insert(:user_event,
        user_id: user.id,
        event_id: event.id,
        stages: [%{slug: "q", status: :pending}]
      )

      insert(:task_pack, name: "7_elementary")

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.public_event_path(conn, :stage, event.slug, %{stage_slug: "q"}))

      assert [db_tournament] = Repo.all(Tournament)
      tournament_id = db_tournament.id

      assert tournament = Tournament.Context.get!(tournament_id)
      assert tournament.state == "active"
      assert tournament.type == "swiss"
      assert tournament.access_type == "token"
      assert players = Tournament.Helpers.get_players(tournament)
      assert tournament.tournament_timeout_seconds == 75 * 60
      assert tournament.players_limit == 128
      assert tournament.ranking_type == "void"
      assert tournament.task_provider == "task_pack"
      assert tournament.task_strategy == "sequential"
      assert tournament.task_pack_name == "7_elementary"

      assert [_bot, player] = Enum.sort_by(players, & &1.id)
      assert player.id == user.id

      assert redirected_to(conn) == Routes.tournament_path(conn, :show, tournament_id)

      assert [user_event] = Repo.all(UserEvent)

      assert [stage = %{slug: "q", status: :started, tournament_id: ^tournament_id}] =
               user_event.stages

      assert stage.started_at
    end

    test "shows error when starting a stage fails", %{
      conn: conn,
      user: user,
      event: event
    } do
      insert(:user_event, user_id: user.id, event_id: event.id)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.public_event_path(conn, :stage, event.slug, %{stage_slug: "q"}))

      assert redirected_to(conn) == Routes.public_event_path(conn, :show, event.slug)
    end

    test "shows error when user has already passed the stage", %{
      conn: conn,
      user: user,
      event: event
    } do
      insert(:user_event,
        user_id: user.id,
        event_id: event.id,
        stages: [%{"slug" => "q", "status" => :passed}]
      )

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.public_event_path(conn, :stage, event.slug, %{stage_slug: "q"}))

      assert redirected_to(conn) == Routes.public_event_path(conn, :show, event.slug)
    end
  end
end
