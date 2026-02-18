defmodule CodebattleWeb.FeedbackController do
  use CodebattleWeb, :controller

  plug(:put_view, CodebattleWeb.FeedbackView)

  def index(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Feedback",
      description: "Feedback from users",
      url: Routes.feedback_url(conn, :index)
    })
    |> render("index.html")
  end
end
