defmodule CodebattleWeb.OnboardingControllerTest do
  use CodebattleWeb.ConnCase

  import Inertia.Testing

  alias Codebattle.Onboarding
  alias Codebattle.Onboarding.Session
  alias CodebattleWeb.GameChannel
  alias CodebattleWeb.UserSocket

  require Phoenix.ChannelTest

  test "landing through practice preserves the chosen language and records real checks", %{conn: conn} do
    first = insert(:task, level: "elementary", tags: ["training"])
    second = insert(:task, level: "elementary", tags: ["training"])
    conn = get(conn, "/")
    guest_id = get_session(conn, :guest_id)
    conn = conn |> recycle() |> get("/")
    assert Repo.aggregate(Session, :count) == 1

    conn = conn |> recycle() |> get("/onboarding")
    assert inertia_component(conn) == "Onboarding"
    assert inertia_props(conn)["practice_task"].name == first.name
    refute Map.has_key?(inertia_props(conn)["practice_task"], :asserts)

    conn = conn |> recycle() |> post("/games/training", %{lang: "python"})
    assert get_session(conn, :practice_lang) == "python"
    row = Repo.get_by!(Session, guest_id: guest_id)
    assert redirected_to(conn) == "/games/#{row.first_game_id}"
    game = Game.Context.get_game!(row.first_game_id)
    guest = Enum.find(game.players, & &1.is_guest)
    assert guest.id == guest_id
    assert guest.editor_lang == "python"
    assert game.task.id == first.id
    assert game.mode == "training"
    assert Enum.any?(game.players, & &1.is_bot)

    # Exercise the configured runner through the channel, not a browser-supplied "solved" event.
    token = Phoenix.Token.sign(@endpoint, "user_token", {:guest, guest_id})
    {:ok, socket} = Phoenix.ChannelTest.connect(UserSocket, %{"token" => token})
    {:ok, _reply, socket} = Phoenix.ChannelTest.subscribe_and_join(socket, GameChannel, "game:#{game.id}")

    Phoenix.ChannelTest.push(socket, "check_result", %{
      "editor_text" => "def solution(a, b):\n    return a + b",
      "lang_slug" => "python"
    })

    assert_receive %Phoenix.Socket.Broadcast{event: "user:check_complete", payload: %{check_result: %{status: "ok"}}},
                   30_000

    assert Repo.get_by!(Session, guest_id: guest_id).solved_at

    conn = conn |> recycle() |> get("/onboarding")
    assert inertia_props(conn)["practice_task"].name == second.name
    assert inertia_props(conn)["practice_lang"] == "python"
    conn = conn |> recycle() |> post("/games/training", %{lang: "python"})
    assert redirected_to(conn) != "/games/#{game.id}"
    assert Repo.get_by!(Session, guest_id: guest_id).next_practice_at
  end

  test "invalid languages and an empty task pool create no game or start milestone", %{conn: conn} do
    conn = get(conn, "/")
    conn = conn |> recycle() |> get("/onboarding")
    assert inertia_props(conn)["practice_task"] == nil
    conn = conn |> recycle() |> post("/games/training", %{lang: "python"})
    assert redirected_to(conn) == "/onboarding"

    insert(:task, level: "elementary", tags: ["training"])
    conn = conn |> recycle() |> post("/games/training", %{lang: "unknown"})
    assert redirected_to(conn) == "/onboarding"
    refute Repo.get_by!(Session, guest_id: get_session(conn, :guest_id)).practice_started_at
  end

  test "practice works with a seeded task catalog without training tags", %{conn: conn} do
    task = insert(:task, level: "elementary", tags: ["math", "collections"])
    conn = get(conn, "/onboarding")
    assert inertia_props(conn)["practice_task"].name == task.name
    conn = conn |> recycle() |> post("/games/training", %{lang: "js"})
    assert redirected_to(conn) =~ "/games/"
  end

  test "DNT and GPC skip tracking while keeping practice available", %{conn: conn} do
    insert(:task, level: "elementary", tags: ["training"])
    conn = get(conn, "/")
    assert Onboarding.report().total == 1
    conn = conn |> recycle() |> put_req_header("dnt", "1") |> get("/onboarding")
    assert inertia_component(conn) == "Onboarding"
    assert Onboarding.report().total == 0
    conn = conn |> recycle() |> put_req_header("sec-gpc", "1") |> get("/")
    assert inertia_component(conn) == "Landing"
    assert Onboarding.report().total == 0
  end

  test "a successful sign-in is counted once without storing account identity", %{conn: conn} do
    conn = get(conn, "/")
    user = insert(:user)
    conn = Plug.Test.init_test_session(build_conn(), %{guest_id: get_session(conn, :guest_id)})
    conn = CodebattleWeb.UserAuth.log_in_user(conn, user)
    CodebattleWeb.UserAuth.log_in_user(conn, user)
    assert Onboarding.report().signed_in == 1
  end
end
