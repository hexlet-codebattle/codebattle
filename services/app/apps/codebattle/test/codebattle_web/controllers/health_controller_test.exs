defmodule CodebattleWeb.HealthControllerTest do
  use CodebattleWeb.ConnCase, async: true

  describe ".index" do
    test "works", %{conn: conn} do
      conn
      |> get(Routes.health_path(conn, :index))
      |> json_response(200)
    end
  end
end
