defmodule CodebattleWeb.DevControllerTest do
  use CodebattleWeb.ConnCase, async: false

  import Inertia.Testing

  setup do
    config = :codebattle |> Application.get_all_env() |> Keyword.take([:app_version, :deployed_at])

    on_exit(fn -> Application.put_all_env(codebattle: config) end)
  end

  test "shows the deployed commit and timestamp to guests", %{conn: conn} do
    commit = "fc426ea537962d8e5af5e31e515f7000deeedc68"
    Application.put_env(:codebattle, :app_version, commit)
    Application.put_env(:codebattle, :deployed_at, "2026-10-19 10:20:30")

    conn = get(conn, "/dev")

    assert html_response(conn, 200)
    assert inertia_component(conn) == "Dev"
    assert get_resp_header(conn, "cache-control") == ["no-store"]

    assert %{
             "commit" => ^commit,
             "commit_url" => "https://github.com/hexlet-codebattle/codebattle/commit/" <> ^commit,
             "deployed_at" => "2026-10-19 10:20:30",
             "release_version" => release_version,
             "elixir_version" => elixir_version,
             "otp_version" => otp_version
           } = inertia_props(conn)

    assert release_version == to_string(Application.spec(:codebattle, :vsn))
    assert elixir_version == System.version()
    assert otp_version == System.otp_release()
  end

  test "does not link development version labels to GitHub", %{conn: conn} do
    Application.put_env(:codebattle, :app_version, "dev")

    assert %{"commit" => "dev", "commit_url" => nil} = conn |> get("/dev") |> inertia_props()
  end

  test "handles missing release metadata", %{conn: conn} do
    Application.put_env(:codebattle, :app_version, "")
    Application.put_env(:codebattle, :deployed_at, nil)

    assert %{"commit" => nil, "commit_url" => nil, "deployed_at" => nil} =
             conn |> get("/dev") |> inertia_props()
  end
end
