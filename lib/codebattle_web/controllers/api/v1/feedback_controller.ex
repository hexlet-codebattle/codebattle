defmodule CodebattleWeb.Api.V1.FeedbackController do
  use CodebattleWeb, :controller

  alias Codebattle.Feedback

  # Feedback carries privacy requests (see /privacy): users see only their own, admins all.
  def index(conn, params) do
    page_number = params |> Map.get("page", "1") |> String.to_integer()
    page_size = params |> Map.get("page_size", "50") |> String.to_integer()

    page =
      conn.assigns.current_user
      |> Feedback.visible_to()
      |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})

    json(conn, %{
      feedback: page.entries,
      page_info: Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])
    })
  end

  def update(conn, %{"id" => id} = params) do
    if Codebattle.User.admin?(conn.assigns.current_user) do
      case Repo.get(Feedback, id) do
        nil ->
          conn |> put_status(:not_found) |> json(%{error: %{code: "not_found", message: "Feedback not found"}})

        feedback ->
          update_feedback(conn, feedback, Map.get(params, "feedback", params))
      end
    else
      conn |> put_status(:forbidden) |> json(%{error: %{code: "forbidden", message: "Forbidden"}})
    end
  end

  defp update_feedback(conn, feedback, params) do
    feedback
    |> Feedback.update_changeset(params)
    |> Repo.update()
    |> case do
      {:ok, updated} ->
        json(conn, %{feedback: updated})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)})
    end
  end

  def create(conn, %{"attachments" => attachments}) do
    %{
      "fallback" => status,
      "text" => text,
      "title_link" => title_link
    } = List.first(attachments)

    current_user = conn.assigns.current_user

    # The author comes from the session, not the client: admins act on requests
    # (e.g. "delete my data") by author, so it must not be spoofable.
    %Feedback{}
    |> Feedback.changeset(%{
      user_id: current_user.id,
      author_name: current_user.name,
      status: status,
      text: text,
      title_link: title_link
    })
    |> Repo.insert()
    |> case do
      {:ok, feedback} ->
        conn |> put_status(:created) |> json(%{feedback: feedback})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)})
    end
  end
end
