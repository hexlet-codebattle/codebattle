defmodule Codebattle.User.Scope do
  @moduledoc """
    module with scopes for user repo
  """

  alias Codebattle.{User, UserGame, Game}
  import Ecto.Query, warn: false

  @sort_order ~w(asc desc)
  @sortable_attributes ~w(id rank games_played rating inserted_at)

  def list_users_with_raiting(params) do
    params
    |> initial_with_raiting_scope()
    |> search_by_name(params)
    |> without_bots(params)
    |> sort(params)
  end

  def by_email_or_name(query, %{name: name, email: email}) do
    from(u in query, where: u.name == ^name or u.email == ^email)
  end

  defp initial_with_raiting_scope(%{"date_from" => date_from}) when date_from !== "" do
    starts_at = Timex.parse!(date_from, "{YYYY}-{0M}-{D}")

    from(u in User,
      order_by: {:desc, :rating},
      left_join: ug in UserGame,
      on: u.id == ug.user_id,
      left_join: g in Game,
      on: g.id == ug.game_id,
      where: g.starts_at >= type(^starts_at, :naive_datetime),
      group_by: u.id,
      select: %User{
        id: u.id,
        is_bot: u.is_bot,
        name: u.name,
        rating: sum(ug.rating_diff),
        github_id: u.github_id,
        lang: u.lang,
        games_played: count(ug.user_id),
        rank: fragment("row_number() OVER(order by ? desc)", u.rating),
        inserted_at: u.inserted_at
      }
    )
  end

  defp initial_with_raiting_scope(_params) do
    from(u in User,
      order_by: {:desc, :rating},
      left_join: ug in UserGame,
      on: u.id == ug.user_id,
      group_by: u.id,
      select: %User{
        id: u.id,
        is_bot: u.is_bot,
        name: u.name,
        rating: u.rating,
        github_id: u.github_id,
        lang: u.lang,
        games_played: count(ug.user_id),
        rank: fragment("row_number() OVER(order by ? desc)", u.rating),
        inserted_at: u.inserted_at
      }
    )
  end

  defp without_bots(query, %{"with_bots" => "true"}), do: query

  defp without_bots(query, _params) do
    from(u in subquery(query), where: u.is_bot == false)
  end

  defp search_by_name(query, %{"q" => %{"name_ilike" => term}})
       when is_binary(term) do
    from(u in subquery(query),
      where: ilike(u.name, ^"%#{term}%")
    )
  end

  defp search_by_name(query, _), do: query

  defp sort(query, %{"s" => value}) do
    direction = sort_direction(value)
    attribute = sort_attribute(value)

    query
    |> sort(attribute, direction)
  end

  defp sort(query, _), do: query

  defp sort(query, attribute, direction)
       when is_binary(direction) and is_binary(attribute) do
    direction = direction |> String.to_existing_atom()
    attribute = attribute |> String.to_existing_atom()

    from(
      u in subquery(query),
      order_by: {^direction, ^attribute}
    )
  end

  defp sort(query, _, _), do: query

  defp sort_direction(value) do
    value
    |> String.split(~r/\+/)
    |> Enum.find(&Enum.member?(@sort_order, &1))
  end

  defp sort_attribute(value) do
    value
    |> String.split(~r/\+/)
    |> Enum.find(&Enum.member?(@sortable_attributes, &1))
  end
end
