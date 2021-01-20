defmodule CodebattleWeb.Api.V1.FeedBackController do
  use CodebattleWeb, :controller

  alias Codebattle.FeedBack

  def index(conn, %{
        "attachments" => attachments
      }) do
    %{
      "author_name" => author_name,
      "fallback" => status,
      "text" => text,
      "title_link" => title_link
    } = List.first(attachments)

    Repo.insert!(
      FeedBack.changeset(%FeedBack{}, %{
        author_name: author_name,
        status: status,
        text: text,
        title_link: title_link
      })
    )

    json(conn, %{})
  end
end
