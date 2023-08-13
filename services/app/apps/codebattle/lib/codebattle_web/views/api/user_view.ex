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

    query = Scope.list_users(params)
    page = Repo.paginate(query, %{page: page_number, page_size: page_size, total: true})

    page_info = Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])

    users =
      Enum.map(
        page.entries,
        fn user ->
          performance =
            if is_nil(user.rating) do
              nil
            else
              Kernel.round((user.rating - 1200) * 100 / (user.games_played + 1))
            end

          Map.put(user, :performance, performance)
        end
      )

    %{
      users: users,
      page_info: page_info,
      date_from: Map.get(params, "date_from"),
      with_bots: Map.get(params, "with_bots")
    }
  end
end
