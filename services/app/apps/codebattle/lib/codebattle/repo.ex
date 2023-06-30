defmodule Codebattle.Repo do
  use Ecto.Repo, otp_app: :codebattle, adapter: Ecto.Adapters.Postgres

  import Ecto.Query

  alias Codebattle.Repo

  @default_pagination %{page: 1, page_size: 50, total: false}

  def count(q), do: Codebattle.Repo.aggregate(q, :count, :id)

  def paginate(query, params) do
    params = Map.merge(@default_pagination, params)

    total_entries =
      if params.total do
        query
        |> exclude(:order_by)
        |> exclude(:select)
        |> Repo.count()
      else
        0
      end

    offset = (params.page - 1) * params.page_size

    limited_query = from(q in query, limit: ^params.page_size, offset: ^offset)

    %{
      entries: Repo.all(limited_query),
      page_number: params.page,
      page_size: params.page_size,
      total_entries: total_entries,
      total_pages: div(total_entries, params.page_size) + 1
    }
  end
end
