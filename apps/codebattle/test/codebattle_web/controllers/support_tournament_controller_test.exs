defmodule CodebattleWeb.SupportTournamentControllerTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Customization
  alias Codebattle.Repo
  alias Codebattle.SupportTournament
  alias Codebattle.UserGroupTournament

  describe "GET /support-tournament" do
    test "returns not found without auth token", %{conn: conn} do
      conn = get(conn, "/support-tournament")

      assert html_response(conn, 404) =~ "Page not found"
    end

    test "shows configured tournament info for a user", %{conn: conn} do
      user = insert(:user, name: "Support User", clan: "Hexlet", clan_id: 42)

      tournament =
        insert(:tournament,
          name: "Main Tournament",
          players: %{"#{user.id}" => %{"id" => user.id, "name" => user.name}}
        )

      group_tournament = insert(:group_tournament, name: "Group Main")

      Repo.insert!(%UserGroupTournament{
        user_id: user.id,
        group_tournament_id: group_tournament.id,
        state: "ready",
        token: "support-token-123456"
      })

      {:ok, _config} =
        SupportTournament.save_config(%{
          "tournament_ids" => "#{tournament.id}",
          "group_tournament_ids" => "#{group_tournament.id}"
        })

      conn =
        conn
        |> get("/support-tournament?auth_token=support-token")
        |> recycle()
        |> post("/support-tournament", %{user_id: "#{user.id}"})

      html = html_response(conn, 200)

      assert html =~ "Support User"
      assert html =~ "Hexlet"
      assert html =~ "42"
      assert html =~ "Main Tournament"
      assert html =~ "present in players"
      assert html =~ "yes"
      assert html =~ "Group Main"
      assert html =~ "support-token-123456"
    end
  end

  describe "PUT /admin/support-tournament" do
    test "persists config in customizations", %{conn: conn} do
      admin = insert(:user, subscription_type: :admin)

      conn =
        conn
        |> put_session(:user_id, admin.id)
        |> put("/admin/support-tournament", %{
          "support_tournament" => %{
            "tournament_ids" => "10\n20",
            "group_tournament_ids" => "30, 40"
          }
        })

      html = html_response(conn, 200)

      assert html =~ "10\n20"
      assert html =~ "30\n40"

      customization = Repo.get_by!(Customization, key: SupportTournament.config_key())

      assert Jason.decode!(customization.value) == %{
               "tournament_ids" => [10, 20],
               "group_tournament_ids" => [30, 40]
             }
    end
  end
end
