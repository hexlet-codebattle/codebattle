defmodule CodebattleWeb.Api.V1.StreamConfigControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.StreamConfig

  setup %{conn: conn} do
    user = :user |> insert() |> Repo.reload()
    conn = put_session(conn, :user_id, user.id)

    {:ok, %{conn: conn, user: user}}
  end

  describe "index" do
    test "returns empty list when user has no configs", %{conn: conn} do
      conn = get(conn, Routes.api_v1_stream_config_path(conn, :index))
      assert json_response(conn, 200) == %{"items" => []}
    end

    test "returns user's configs", %{conn: conn, user: user} do
      # Create some test configs
      config1 = %{name: "config1", user_id: user.id, config: %{"key" => "value1"}}
      config2 = %{name: "config2", user_id: user.id, config: %{"key" => "value2"}}

      %StreamConfig{} |> StreamConfig.changeset(config1) |> Repo.insert!()
      %StreamConfig{} |> StreamConfig.changeset(config2) |> Repo.insert!()

      conn = get(conn, Routes.api_v1_stream_config_path(conn, :index))

      response = json_response(conn, 200)
      assert length(response["items"]) == 2

      # Check that configs are returned in alphabetical order by name
      assert Enum.at(response["items"], 0)["name"] == "config1"
      assert Enum.at(response["items"], 1)["name"] == "config2"
    end
  end

  describe "put_all" do
    test "creates new configs", %{conn: conn} do
      configs = [
        %{"name" => "config1", "config" => %{"key" => "value1"}},
        %{"name" => "config2", "config" => %{"key" => "value2"}}
      ]

      conn = put(conn, Routes.api_v1_stream_config_path(conn, :put_all), %{configs: configs})

      response = json_response(conn, 200)
      assert length(response["items"]) == 2

      # Verify configs were created with correct values
      config1 = Enum.find(response["items"], &(&1["name"] == "config1"))
      config2 = Enum.find(response["items"], &(&1["name"] == "config2"))
      assert config1["name"] == "config1"
      assert config1["config"] == %{"config" => %{"key" => "value1"}, "name" => "config1"}
      assert config2["name"] == "config2"
      assert config2["config"] == %{"config" => %{"key" => "value2"}, "name" => "config2"}
    end

    test "updates existing configs", %{conn: conn, user: user} do
      # Create initial config
      config = %{name: "config1", user_id: user.id, config: %{"key" => "old_value"}}
      %StreamConfig{} |> StreamConfig.changeset(config) |> Repo.insert!()

      # Update the config
      updated_configs = [
        %{"name" => "config1", "config" => %{"key" => "new_value"}}
      ]

      conn = put(conn, Routes.api_v1_stream_config_path(conn, :put_all), %{configs: updated_configs})

      response = json_response(conn, 200)
      assert length(response["items"]) == 1
      config = Enum.at(response["items"], 0)
      assert config["name"] == "config1"
      assert config["config"] == %{"config" => %{"key" => "new_value"}, "name" => "config1"}
    end

    test "deletes configs not in the list", %{conn: conn, user: user} do
      # Create initial configs
      config1 = %{name: "config1", user_id: user.id, config: %{"key" => "value1"}}
      config2 = %{name: "config2", user_id: user.id, config: %{"key" => "value2"}}

      %StreamConfig{} |> StreamConfig.changeset(config1) |> Repo.insert!()
      %StreamConfig{} |> StreamConfig.changeset(config2) |> Repo.insert!()

      # Only keep config1, config2 should be deleted
      updated_configs = [
        %{"name" => "config1", "config" => %{"key" => "updated_value"}}
      ]

      conn = put(conn, Routes.api_v1_stream_config_path(conn, :put_all), %{configs: updated_configs})

      response = json_response(conn, 200)
      assert length(response["items"]) == 1
      config = Enum.at(response["items"], 0)
      assert config["name"] == "config1"
      assert config["config"] == %{"config" => %{"key" => "updated_value"}, "name" => "config1"}

      # Verify config2 was deleted
      assert Repo.get_by(StreamConfig, name: "config2", user_id: user.id) == nil
    end

    test "handles empty configs list", %{conn: conn, user: user} do
      # Create initial config
      config = %{name: "config1", user_id: user.id, config: %{"key" => "value"}}
      %StreamConfig{} |> StreamConfig.changeset(config) |> Repo.insert!()

      # Send empty configs list (should delete all configs)
      conn = put(conn, Routes.api_v1_stream_config_path(conn, :put_all), %{configs: []})

      response = json_response(conn, 200)
      assert response["items"] == []

      # Verify all configs were deleted
      assert Repo.all(StreamConfig) == []
    end
  end
end
