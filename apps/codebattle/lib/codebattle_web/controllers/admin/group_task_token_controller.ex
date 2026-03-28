defmodule CodebattleWeb.Admin.GroupTaskTokenController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTask.Context

  plug(CodebattleWeb.Plugs.AdminOnly)

  def create(conn, %{"group_task_id" => group_task_id, "group_task_token" => token_params}) do
    group_task = Context.get_group_task!(group_task_id)

    case parse_user_id(token_params["user_id"]) do
      {:ok, user_id} ->
        case Context.create_or_rotate_token(group_task, user_id) do
          {:ok, _group_task_token} ->
            conn
            |> put_flash(:info, "Group task token generated successfully.")
            |> redirect(to: Routes.group_task_path(conn, :show, group_task))

          {:error, %Ecto.Changeset{} = changeset} ->
            render_show(conn, group_task, changeset)
        end

      :error ->
        render_show(
          conn,
          group_task,
          %{}
          |> token_changeset()
          |> Ecto.Changeset.add_error(:user_id, "is invalid")
          |> Map.put(:action, :insert)
        )
    end
  end

  defp render_show(conn, group_task, token_changeset) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(CodebattleWeb.Admin.GroupTaskView)
    |> put_layout(html: {CodebattleWeb.LayoutView, :admin})
    |> render("show.html",
      group_task: group_task,
      token_changeset: token_changeset,
      solutions: Context.list_solutions(group_task),
      tokens: Context.list_tokens(group_task),
      user: conn.assigns.current_user
    )
  end

  defp parse_user_id(user_id) when is_integer(user_id) and user_id > 0, do: {:ok, user_id}

  defp parse_user_id(user_id) when is_binary(user_id) do
    case Integer.parse(String.trim(user_id)) do
      {parsed_user_id, ""} when parsed_user_id > 0 -> {:ok, parsed_user_id}
      _ -> :error
    end
  end

  defp parse_user_id(_user_id), do: :error

  defp token_changeset(attrs) do
    types = %{user_id: :integer}

    {%{}, types}
    |> Ecto.Changeset.cast(attrs, Map.keys(types))
    |> Ecto.Changeset.validate_required([:user_id])
  end
end
