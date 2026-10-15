defmodule Codebattle.ExternalPlatformTest do
  use ExUnit.Case, async: false

  alias Codebattle.ExternalPlatform

  setup do
    original_adapter = Application.get_env(:codebattle, :external_platform_adapter)
    original_service_url = Application.get_env(:codebattle, :external_platform_service_url)
    original_org_slug = Application.get_env(:codebattle, :external_platform_org_slug)
    original_auth_req_options = Application.get_env(:codebattle, :auth_req_options)

    on_exit(fn ->
      Application.put_env(:codebattle, :external_platform_adapter, original_adapter)
      Application.put_env(:codebattle, :external_platform_service_url, original_service_url)
      Application.put_env(:codebattle, :external_platform_org_slug, original_org_slug)
      Application.put_env(:codebattle, :auth_req_options, original_auth_req_options)
    end)

    :ok
  end

  test "create_invite returns an error tuple when external platform url is invalid" do
    Application.put_env(:codebattle, :external_platform_adapter, nil)
    Application.put_env(:codebattle, :external_platform_service_url, "value")
    Application.put_env(:codebattle, :external_platform_org_slug, "value")
    Application.put_env(:codebattle, :auth_req_options, [])

    assert {:error, {:request_exception, message}} = ExternalPlatform.create_invite("alice")
    assert message =~ "scheme is required"
  end

  test "unveil_repos sends repo_ids as a JSON object to the normalized endpoint" do
    Application.put_env(:codebattle, :external_platform_adapter, nil)
    Application.put_env(:codebattle, :external_platform_service_url, "https://ext.test/")
    Application.put_env(:codebattle, :auth_req_options, plug: {Req.Test, Codebattle.Auth})

    test_pid = self()

    Req.Test.stub(Codebattle.Auth, fn conn ->
      {:ok, body, conn} = Plug.Conn.read_body(conn)

      send(test_pid, {
        :request,
        conn.method,
        conn.request_path,
        Plug.Conn.get_req_header(conn, "content-type"),
        body
      })

      Req.Test.json(conn, %{"ok" => true})
    end)

    assert {:ok, %{"ok" => true}} = ExternalPlatform.unveil_repos(["repo-1", "repo-2"])

    assert_receive {
      :request,
      "POST",
      "/repos/unveil",
      ["application/json"],
      ~s({"repo_ids":["repo-1","repo-2"]})
    }
  end
end
