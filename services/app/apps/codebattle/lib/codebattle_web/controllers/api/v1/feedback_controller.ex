defmodule CodebattleWeb.Api.V1.FeedbackController do
  use CodebattleWeb, :controller

  alias Codebattle.Feedback

  import Ecto.Query

  def index(conn, params) do
    page_number = params |> Map.get("page", "1") |> String.to_integer()
    page_size = params |> Map.get("page_size", "50") |> String.to_integer()

    query = from(f in Feedback, order_by: {:desc, f.id})
    page = Repo.paginate(query, %{page: page_number, page_size: page_size, total: true})
    page_info = Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])

    json(conn, %{
      feedback: page.entries,
      page_info: page_info
    })
  end

  def create(conn, %{
        "attachments" => attachments
      }) do
    %{
      "author_name" => author_name,
      "fallback" => status,
      "text" => text,
      "title_link" => title_link
    } = List.first(attachments)

    feedback =
      Repo.insert!(
        Feedback.changeset(%Feedback{}, %{
          author_name: author_name,
          status: status,
          text: text,
          title_link: title_link
        })
      )

    conn |> put_status(:created) |> json(%{feedback: feedback})
  end
end
