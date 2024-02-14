defmodule CodebattleWeb.Api.UserView do
  use CodebattleWeb, :view

  alias Codebattle.User.Scope
  alias Codebattle.Repo

  import Ecto.Query, warn: false

  def render_rating(params) do
    page_number =
      params
      |> Map.get("page", "1")
      |> String.to_integer()

    page_size =
      params
      |> Map.get("page_size", "50")
      |> String.to_integer()

    result =
      params
      |> Scope.list_users()
      |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})

    page_info = Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])

    %{
      users: result.entries,
      page_info: page_info,
      date_from: Map.get(params, "date_from"),
      with_bots: Map.get(params, "with_bots")
    }
  end
end
