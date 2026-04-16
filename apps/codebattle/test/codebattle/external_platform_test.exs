defmodule Codebattle.ExternalPlatformTest do
  use ExUnit.Case, async: false

  alias Codebattle.ExternalPlatform

  setup do
    original_service_url = Application.get_env(:codebattle, :external_platform_service_url)
    original_org_slug = Application.get_env(:codebattle, :external_platform_org_slug)
    original_auth_req_options = Application.get_env(:codebattle, :auth_req_options)

    on_exit(fn ->
      Application.put_env(:codebattle, :external_platform_service_url, original_service_url)
      Application.put_env(:codebattle, :external_platform_org_slug, original_org_slug)
      Application.put_env(:codebattle, :auth_req_options, original_auth_req_options)
    end)

    :ok
  end

  test "create_invite returns an error tuple when external platform url is invalid" do
    Application.put_env(:codebattle, :external_platform_service_url, "value")
    Application.put_env(:codebattle, :external_platform_org_slug, "value")
    Application.put_env(:codebattle, :auth_req_options, [])

    assert {:error, {:request_exception, message}} = ExternalPlatform.create_invite("alice")
    assert message =~ "scheme is required"
  end
end
