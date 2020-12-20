defmodule CodebattleWeb.Api.V1.SettingsControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Repo

  describe "#show" do
    test "shows current user settings", %{conn: conn} do
      user = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 2400})

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> get(Routes.api_v1_settings_path(conn, :show))

      assert json_response(conn, 200) == %{"name" => user.name}
    end
  end

  describe "#update" do
    test "updates current user settings", %{conn: conn} do
      new_settings = %{
        "name" => "evgen",
        "sound_settings" => %{"level" => 3, "type" => "silent"}
      }

      user = insert(:user)

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch(Routes.api_v1_settings_path(conn, :show, new_settings))

      assert json_response(conn, 200) == new_settings

      updated = Repo.get!(Codebattle.User, user.id)

      assert updated.sound_settings.level == 3
      assert updated.sound_settings.type == "silent"
      assert updated.name == "evgen"
    end

    test "returns validation errors", %{conn: conn} do
      new_settings = %{"name" => "evgen"}
      user = insert(:user)
      insert(:user, %{name: "evgen"})

      conn =
        conn
        |> put_session(:user_id, user.id)
        |> patch(Routes.api_v1_settings_path(conn, :show, new_settings))

      assert json_response(conn, 422) == %{"errors" => %{"name" => ["has already been taken"]}}
    end
  end
end
