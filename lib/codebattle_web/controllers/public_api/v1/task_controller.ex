defmodule CodebattleWeb.PublicApi.V1.TaskController do
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers

  alias Codebattle.Task
  alias CodebattleWeb.PublicApi.V1.JSON

  @levels ~w(elementary easy medium hard)

  plug(:require_scope, "read")

  # Only tasks the token's user may play: public and active ones, plus their own.
  def index(conn, params) do
    case filters(params) do
      {:ok, filters} ->
        tasks = Task.search_for_user(conn.assigns.current_user, filters)
        json(conn, %{tasks: Enum.map(tasks, &JSON.task/1)})

      {:error, errors} ->
        validation_failed(conn, errors)
    end
  end

  defp filters(params) do
    level = params["level"]

    cond do
      not (is_nil(level) or level in @levels) ->
        {:error, %{"level" => "must be one of: #{Enum.join(@levels, ", ")}"}}

      not (is_nil(params["name"]) or is_binary(params["name"])) ->
        {:error, %{"name" => "must be a string"}}

      true ->
        {:ok, [level: level, tags: tags(params["tags"]), name: params["name"]]}
    end
  end

  # `tags=strings,math` or `tags[]=strings&tags[]=math`
  defp tags(tags) when is_binary(tags), do: tags |> String.split(",") |> tags()

  defp tags(tags) when is_list(tags),
    do: tags |> Enum.filter(&is_binary/1) |> Enum.map(&String.trim/1) |> Enum.reject(&(&1 == ""))

  defp tags(_tags), do: []
end
