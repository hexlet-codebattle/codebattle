defmodule CodebattleWeb.Admin.GroupTaskRunController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTask.Context

  plug(CodebattleWeb.Plugs.AdminOnly)

  def create(conn, %{"group_task_id" => group_task_id, "group_task_run" => run_params}) do
    group_task = Context.get_group_task!(group_task_id)

    case parse_player_ids(run_params["player_ids"]) do
      {:ok, player_ids} ->
        case Context.run_group_task(group_task, player_ids) do
          {:ok, %{status: "success"}} ->
            conn
            |> put_flash(:info, "Group task run finished.")
            |> redirect(to: Routes.group_task_path(conn, :show, group_task))

          {:ok, %{status: "error"}} ->
            conn
            |> put_flash(:error, "Group task run failed.")
            |> redirect(to: Routes.group_task_path(conn, :show, group_task))

          {:error, %Ecto.Changeset{} = changeset} ->
            render_show(conn, group_task, merge_run_changeset(changeset, run_params["player_ids"]))
        end

      :error ->
        render_show(
          conn,
          group_task,
          %{player_ids: run_params["player_ids"]}
          |> run_changeset()
          |> Ecto.Changeset.add_error(:player_ids, "is invalid")
          |> Map.put(:action, :insert)
        )
    end
  end

  defp render_show(conn, group_task, run_changeset) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(CodebattleWeb.Admin.GroupTaskView)
    |> put_layout(html: {CodebattleWeb.LayoutView, :admin})
    |> render("show.html",
      group_task: group_task,
      run_changeset: run_changeset,
      token_changeset: token_changeset(%{}),
      runs: Context.list_runs(group_task),
      solutions: Context.list_solutions(group_task),
      tokens: Context.list_tokens(group_task),
      user: conn.assigns.current_user
    )
  end

  defp parse_player_ids(player_ids_text) when is_binary(player_ids_text) do
    player_ids =
      player_ids_text
      |> String.split(",", trim: true)
      |> Enum.map(&String.trim/1)
      |> Enum.map(&Integer.parse/1)

    if player_ids != [] and Enum.all?(player_ids, &match?({id, ""} when id > 0, &1)) do
      {:ok, Enum.map(player_ids, fn {id, ""} -> id end)}
    else
      :error
    end
  end

  defp parse_player_ids(_player_ids_text), do: :error

  defp token_changeset(attrs) do
    types = %{user_id: :integer}

    {%{}, types}
    |> Ecto.Changeset.cast(attrs, Map.keys(types))
    |> Ecto.Changeset.validate_required([:user_id])
    |> Ecto.Changeset.validate_number(:user_id, greater_than: 0)
  end

  defp run_changeset(attrs) do
    types = %{player_ids: :string}

    {%{}, types}
    |> Ecto.Changeset.cast(attrs, Map.keys(types))
    |> Ecto.Changeset.validate_required([:player_ids])
  end

  defp merge_run_changeset(%Ecto.Changeset{} = source, player_ids_text) do
    Enum.reduce(source.errors, run_changeset(%{player_ids: player_ids_text}), fn {field, {message, opts}}, acc ->
      Ecto.Changeset.add_error(acc, field, message, opts)
    end)
  end
end
