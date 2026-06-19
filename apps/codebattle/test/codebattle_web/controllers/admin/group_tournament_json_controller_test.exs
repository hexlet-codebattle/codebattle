defmodule CodebattleWeb.Admin.GroupTournamentJsonControllerTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Repo
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournamentRun

  defp insert_run(group_tournament, user, kind, history_payload) do
    user_gt =
      Repo.get_by(UserGroupTournament,
        user_id: user.id,
        group_tournament_id: group_tournament.id
      ) ||
        Repo.insert!(%UserGroupTournament{
          user_id: user.id,
          group_tournament_id: group_tournament.id,
          state: "active"
        })

    Repo.insert!(%UserGroupTournamentRun{
      user_group_tournament_id: user_gt.id,
      group_task_id: group_tournament.group_task_id,
      group_tournament_id: group_tournament.id,
      run_key: Ecto.UUID.generate(),
      player_ids: [user.id],
      kind: kind,
      status: "success",
      result: %{"history" => history_payload}
    })
  end

  describe "GET /admin/group_tournaments/:id/history.json" do
    test "returns history JSON for admin session — prefers slice run", %{conn: conn} do
      admin = insert(:user, subscription_type: :admin)
      user = insert(:user)
      gt = insert(:group_tournament)

      _user_run = insert_run(gt, user, "user", %{"who" => "user-run"})
      _slice_run = insert_run(gt, user, "slice", %{"who" => "slice-run"})

      conn =
        conn
        |> put_session(:user_id, admin.id)
        |> get("/admin/group_tournaments/#{gt.id}/history.json")

      assert response_content_type(conn, :json)
      assert json_response(conn, 200) == %{"who" => "slice-run"}
    end

    test "falls back to latest user run when no slice run exists", %{conn: conn} do
      admin = insert(:user, subscription_type: :admin)
      user = insert(:user)
      gt = insert(:group_tournament)

      _older_user_run = insert_run(gt, user, "user", %{"who" => "older"})
      _newer_user_run = insert_run(gt, user, "user", %{"who" => "newer"})

      conn =
        conn
        |> put_session(:user_id, admin.id)
        |> get("/admin/group_tournaments/#{gt.id}/history.json")

      assert json_response(conn, 200) == %{"who" => "newer"}
    end

    test "anonymous request with valid auth_token query param is allowed", %{conn: conn} do
      user = insert(:user)
      gt = insert(:group_tournament)
      _slice_run = insert_run(gt, user, "slice", %{"slice" => true})

      with_api_key("gt-key", fn ->
        conn = get(conn, "/admin/group_tournaments/#{gt.id}/history.json?auth_token=gt-key")
        assert json_response(conn, 200) == %{"slice" => true}
      end)
    end

    test "anonymous request with valid x-auth-key header is allowed", %{conn: conn} do
      user = insert(:user)
      gt = insert(:group_tournament)
      _slice_run = insert_run(gt, user, "slice", %{"slice" => true})

      with_api_key("hdr-key", fn ->
        conn =
          conn
          |> put_req_header("x-auth-key", "hdr-key")
          |> get("/admin/group_tournaments/#{gt.id}/history.json")

        assert json_response(conn, 200) == %{"slice" => true}
      end)
    end

    test "anonymous request without token is denied", %{conn: conn} do
      gt = insert(:group_tournament)

      with_api_key("real-key", fn ->
        conn = get(conn, "/admin/group_tournaments/#{gt.id}/history.json")
        assert json_response(conn, 404) == %{"error" => "NOT_FOUND"}
      end)
    end

    test "anonymous request with wrong token is denied", %{conn: conn} do
      gt = insert(:group_tournament)

      with_api_key("real-key", fn ->
        conn = get(conn, "/admin/group_tournaments/#{gt.id}/history.json?auth_token=wrong")
        assert json_response(conn, 404) == %{"error" => "NOT_FOUND"}
      end)
    end

    test "returns 404 when no runs exist", %{conn: conn} do
      admin = insert(:user, subscription_type: :admin)
      gt = insert(:group_tournament)

      conn =
        conn
        |> put_session(:user_id, admin.id)
        |> get("/admin/group_tournaments/#{gt.id}/history.json")

      assert json_response(conn, 404) == %{"error" => "NOT_FOUND"}
    end

    test "sets attachment content-disposition", %{conn: conn} do
      admin = insert(:user, subscription_type: :admin)
      user = insert(:user)
      gt = insert(:group_tournament)
      _ = insert_run(gt, user, "user", %{"ok" => true})

      conn =
        conn
        |> put_session(:user_id, admin.id)
        |> get("/admin/group_tournaments/#{gt.id}/history.json")

      assert conn |> get_resp_header("content-disposition") |> hd() =~ "attachment;"
      assert conn |> get_resp_header("content-disposition") |> hd() =~ "history.json"
    end
  end

  defp with_api_key(key, fun) do
    previous = Application.get_env(:codebattle, :api_key)
    Application.put_env(:codebattle, :api_key, key)

    try do
      fun.()
    after
      if previous == nil do
        Application.delete_env(:codebattle, :api_key)
      else
        Application.put_env(:codebattle, :api_key, previous)
      end
    end
  end
end
