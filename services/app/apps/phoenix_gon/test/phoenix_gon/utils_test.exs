defmodule PhoenixGon.UtilsTest do
  use ExUnit.Case, async: false
  use RouterHelper

  import PhoenixGon.Utils

  alias Plug.Conn

  describe "#mix_env_dev?" do
    test "env" do
      conn =
        %Conn{}
        |> with_gon(env: :dev)

      actual = mix_env_dev?(conn)
      expectation = true

      assert actual == expectation
    end
  end

  describe "#mix_env_prod?" do
    test "prod" do
      conn =
        %Conn{}
        |> with_gon(env: :prod)

      actual = mix_env_prod?(conn)
      expectation = true

      assert actual == expectation
    end
  end

  describe "#variables" do
    test "conn" do
      conn =
        %Conn{}
        |> with_gon(env: nil)

      actual = variables(conn)
      expectation = %PhoenixGon.Storage{}

      assert actual == expectation
    end
  end

  describe "#assets" do
    test "conn" do
      conn =
        %Conn{}
        |> with_gon(env: nil)

      actual = assets(conn)
      expectation = %{}

      assert actual == expectation
    end
  end

  describe "settings" do
    test "conn" do
      conn =
        %Conn{}
        |> with_gon(env: nil)

      actual = settings(conn)

      expectation = [
        camel_case: false,
        compatibility: :native,
        env: nil,
        namespace: nil
      ]

      assert Enum.sort(actual) == Enum.sort(expectation)
    end
  end

  describe "#namescpase" do
    test "conn" do
      conn =
        %Conn{}
        |> with_gon(namespace: TestCase)

      actual = namespace(conn)
      expectation = "TestCase"

      assert actual == expectation
    end
  end
end
