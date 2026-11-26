defmodule CodebattleWeb.FeedbackController do
  use CodebattleWeb, :controller

  alias Codebattle.Feedback
  alias CodebattleWeb.Frontend

  plug(CodebattleWeb.Plugs.RequireAuth when action == :index)

  def index(conn, _params) do
    feedback =
      conn.assigns.current_user.id
      |> Feedback.by_author()
      |> Repo.all()
      |> Enum.map(&Map.take(&1, [:id, :status, :text, :inserted_at, :reply, :replied_at]))

    conn
    |> put_resp_header("cache-control", "private, no-store")
    |> Frontend.put_layout()
    |> render_inertia("MyFeedback", %{"feedback" => feedback})
  end

  def reply(conn, %{"id" => id} = params) do
    case {Integer.parse(id), params} do
      {{feedback_id, ""}, %{"reply" => reply}} when feedback_id > 0 and is_binary(reply) ->
        publish_reply(conn, feedback_id, reply)

      _ ->
        conn
        |> put_flash(:error, "Could not publish the reply.")
        |> redirect(to: "/admin/feedback")
    end
  end

  defp publish_reply(conn, id, reply) do
    case Feedback.publish_reply(id, reply) do
      :ok ->
        redirect(conn, to: "/admin/feedback#feedback-#{id}")

      {:error, :invalid_reply} ->
        conn
        |> put_flash(:error, "Enter a reply between 1 and 10,000 characters.")
        |> redirect(to: "/admin/feedback")

      {:error, :unavailable} ->
        conn
        |> put_flash(:error, "This feedback already has a reply or has no recipient.")
        |> redirect(to: "/admin/feedback")
    end
  end
end
