defmodule CodebattleWeb.Api.V1.PlayerReportControllerTest do
  use Codebattle.IntegrationCase
  # use CodebattleWeb.ConnCase, async: true

  # alias Codebattle.Game
  # alias CodebattleWeb.UserSocket

  describe ".create" do
    setup %{conn: conn} do
      user1 = insert(:user)
      user2 = insert(:user)
      task = insert(:task)
      socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
      socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})
      game_params = %{state: "playing", players: [user1, user2], task: task}

      conn = put_session(conn, :user_id, user1.id)

      {:ok, %{conn: conn, game_params: game_params, socket1: socket1, socket2: socket2}}
    end

    test "player can report opponent", %{conn: conn} do
      # player_report = Codebattle.PlayerReport.get!()
    end

    test "player cannot report himself" do
    end

    test "player cannot report when game does not exists" do
    end
  end

  test "admin can view list of player reports" do
  end

  test "admin can mark player report as finished_check" do
  end

  test "admin can mark player report as finished check with skip result???" do
  end
end
