defmodule Codebattle.Mcp.Tools do
  @moduledoc "Allowlisted MCP operations and schemas derived from the Public API contract."

  alias CodebattleWeb.PublicApi.V1.GameController
  alias CodebattleWeb.PublicApi.V1.InviteController
  alias CodebattleWeb.PublicApi.V1.MeController
  alias CodebattleWeb.PublicApi.V1.TaskController
  alias CodebattleWeb.PublicApi.V1.TournamentController
  alias CodebattleWeb.PublicApi.V1.UserController

  @spec_path Path.expand("../../../priv/openapi/public_api_v1.json", __DIR__)
  @external_resource @spec_path
  @openapi @spec_path |> File.read!() |> Jason.decode!()

  @operations [
    {"get_me", "get", "/me", MeController, :show},
    {"get_active_game", "get", "/me/active_game", MeController, :active_game},
    {"list_my_games", "get", "/me/games", MeController, :games},
    {"list_my_tournaments", "get", "/me/tournaments", MeController, :tournaments},
    {"list_invites", "get", "/me/invites", InviteController, :index},
    {"list_tournament_schedule", "get", "/tournaments/schedule", TournamentController, :schedule},
    {"list_live_tournaments", "get", "/tournaments/live", TournamentController, :live},
    {"get_tournament", "get", "/tournaments/{id}", TournamentController, :show},
    {"get_tournament_ranking", "get", "/tournaments/{id}/ranking", TournamentController, :ranking},
    {"create_tournament", "post", "/tournaments", TournamentController, :create},
    {"update_tournament", "patch", "/tournaments/{id}", TournamentController, :update},
    {"start_tournament", "post", "/tournaments/{id}/start", TournamentController, :start},
    {"cancel_tournament", "post", "/tournaments/{id}/cancel", TournamentController, :cancel},
    {"join_tournament", "post", "/tournaments/{id}/join", TournamentController, :join},
    {"leave_tournament", "post", "/tournaments/{id}/leave", TournamentController, :leave},
    {"list_tasks", "get", "/tasks", TaskController, :index},
    {"list_live_games", "get", "/games/live", GameController, :live},
    {"create_game", "post", "/games", GameController, :create},
    {"join_game", "post", "/games/{id}/join", GameController, :join},
    {"cancel_game", "post", "/games/{id}/cancel", GameController, :cancel},
    {"create_invite", "post", "/invites", InviteController, :create},
    {"accept_invite", "post", "/invites/{id}/accept", InviteController, :accept},
    {"cancel_invite", "post", "/invites/{id}/cancel", InviteController, :cancel},
    {"list_online_users", "get", "/users/online", UserController, :online}
  ]

  def all do
    Enum.map(@operations, &from_operation/1) ++ [snapshot(), leaderboard()]
  end

  def find(name), do: Enum.find(all(), &(&1.name == name))

  def validate(tool, params) when is_map(params) do
    properties = tool.schema["properties"]
    unknown = Map.keys(params) -- Map.keys(properties)
    missing = tool.schema["required"] -- Map.keys(params)
    errors = Map.new(unknown, &{&1, "is not allowed"})
    errors = Enum.reduce(missing, errors, &Map.put(&2, &1, "is required"))

    errors =
      Enum.reduce(params, errors, fn {name, value}, errors ->
        case Map.fetch(properties, name) do
          {:ok, schema} -> validate_field(errors, name, value, schema)
          :error -> errors
        end
      end)

    if errors == %{}, do: {:ok, params}, else: {:error, errors}
  end

  def validate(_tool, _params), do: {:error, %{"arguments" => "must be an object"}}

  defp from_operation({name, method, path, controller, action}) do
    operation = get_in(@openapi, ["paths", path, method])
    body = get_in(operation, ["requestBody", "content", "application/json", "schema"]) || %{}
    parameters = Map.get(operation, "parameters", [])

    properties =
      Enum.reduce(parameters, Map.get(body, "properties", %{}), fn param, properties ->
        field = Map.put_new(param["schema"], "description", param["description"] || param["name"])
        field = if param["in"] == "path", do: Map.put(field, "minimum", 1), else: field
        Map.put(properties, param["name"], field)
      end)

    required = Map.get(body, "required", []) ++ for(param <- parameters, param["required"], do: param["name"])
    scope = operation["security"] |> hd() |> Map.fetch!("bearerAuth") |> hd()

    %{
      name: name,
      method: String.upcase(method),
      path: path,
      controller: controller,
      action: action,
      scope: scope,
      description: description(operation, scope),
      schema: %{"type" => "object", "properties" => properties, "required" => required, "additionalProperties" => false}
    }
  end

  defp snapshot do
    %{
      name: "get_my_state",
      method: "GET",
      path: "/me/events",
      controller: :snapshot,
      action: :hello,
      scope: "read",
      description:
        "Get the event stream's current state: profile, active game, invites and tournaments. Call again to refresh; this tool does not open a subscription. Requires read.",
      schema: %{"type" => "object", "properties" => %{}, "required" => [], "additionalProperties" => false}
    }
  end

  defp leaderboard do
    fields = %{
      "id" => %{"type" => "integer", "minimum" => 1, "description" => "Event ID"},
      "type" => %{"type" => "string", "enum" => ~w(clan personal player player_clan)},
      "clan_id" => %{"type" => "integer", "minimum" => 1},
      "user_id" => %{"type" => "integer", "minimum" => 1},
      "page_number" => %{"type" => "integer", "minimum" => 1, "maximum" => 2000},
      "page_size" => %{"type" => "integer", "minimum" => 1, "maximum" => 20},
      "players_limit" => %{"type" => "integer", "minimum" => 1, "maximum" => 100},
      "clans_limit" => %{"type" => "integer", "minimum" => 1, "maximum" => 100}
    }

    %{
      name: "get_event_leaderboard",
      method: "GET",
      path: "/events/{id}/leaderboard",
      controller: CodebattleWeb.Api.V1.Event.LeaderboardController,
      action: :show,
      scope: "read",
      description: "Get an event's public clan or player leaderboard. Requires read.",
      schema: %{"type" => "object", "properties" => fields, "required" => ["id"], "additionalProperties" => false}
    }
  end

  defp description(operation, scope) do
    [operation["summary"], operation["description"], "Requires #{scope}."]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
  end

  defp validate_field(errors, name, value, schema) do
    case field_error(value, schema) do
      nil -> errors
      message -> Map.put(errors, name, message)
    end
  end

  defp field_error(value, %{"type" => "integer"} = schema) when is_integer(value) do
    enum_error(value, schema["enum"]) ||
      range_error(
        value,
        schema["minimum"],
        schema["maximum"],
        "must be at least #{schema["minimum"]}",
        "must be at most #{schema["maximum"]}"
      )
  end

  defp field_error(value, %{"type" => "string"} = schema) when is_binary(value) do
    enum_error(value, schema["enum"]) ||
      range_error(String.length(value), schema["minLength"], schema["maxLength"], "is too short", "is too long")
  end

  defp field_error(value, %{"type" => "boolean"}) when is_boolean(value), do: nil
  defp field_error(_value, schema), do: "must be a #{schema["type"]}"

  defp enum_error(_value, nil), do: nil
  defp enum_error(value, values), do: if(value not in values, do: "must be one of: #{Enum.join(values, ", ")}")

  defp range_error(value, minimum, maximum, below, above) do
    cond do
      is_number(minimum) and value < minimum -> below
      is_number(maximum) and value > maximum -> above
      true -> nil
    end
  end
end
