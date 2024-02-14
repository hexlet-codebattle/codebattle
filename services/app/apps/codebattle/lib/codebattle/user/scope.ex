defmodule Codebattle.User.Scope do
  @moduledoc """
    Module with scopes for the User scheme
  """

  alias Codebattle.User

  import Ecto.Query

  def by_email_or_name(query, %{name: name, email: email}) do
    from(u in query, where: u.name == ^name or u.email == ^email)
  end

  def list_users(params) do
    base_query()
    |> filter_by_date(params)
    |> search_by_name(params)
    |> without_bots(params)
    |> sort(params)
  end

  defp base_query() do
    User
    |> from(as: :u)
    |> join(:left, [u: u], ug in assoc(u, :user_games), as: :ug)
    |> group_by([u: u], u.id)
    |> select([u: u, ug: ug], %{
      games_played: count(ug.user_id),
      github_id: u.github_id,
      id: u.id,
      inserted_at: u.inserted_at,
      lang: u.lang,
      name: u.name,
      rank: u.rank,
      rating: u.rating
    })
  end

  defp filter_by_date(query, %{"date_from" => date_from}) when date_from !== "" do
    starts_at = Timex.parse!(date_from, "{YYYY}-{0M}-{D}")

    query
    |> where([ug: ug], ug.inserted_at >= type(^starts_at, :naive_datetime))
    |> select_merge([ug: ug], %{rating: sum(ug.rating_diff)})
  end

  defp filter_by_date(query, _params), do: query

  defp search_by_name(query, %{"q" => %{"name_ilike" => ""}}), do: query

  defp search_by_name(query, %{"q" => %{"name_ilike" => term}})
       when is_binary(term) do
    where(query, [u: u], ilike(u.name, ^"%#{term}%"))
  end

  defp search_by_name(query, _params), do: query

  defp without_bots(query, %{"with_bots" => "true"}), do: query

  defp without_bots(query, _params) do
    where(query, [u: u], u.is_bot == false)
  end

  defp sort(query, %{"s" => value}) do
    [field, direction] = String.split(value, "+")

    apply_sort(query, field, String.to_existing_atom(direction))
  rescue
    _e ->
      order_by(query, {:desc, :rating})
  end

  defp sort(query, _), do: query

  defp apply_sort(query, "id", direction) do
    order_by(query, {^direction, :id})
  end

  defp apply_sort(query, "rank", direction) do
    order_by(query, {^direction, :rank})
  end

  defp apply_sort(query, "rating", direction) do
    order_by(query, {^direction, :rating})
  end

  defp apply_sort(query, "games_played", direction) do
    order_by(query, [ug: ug], {^direction, count(ug.user_id)})
  end

  defp apply_sort(query, _field, _direction) do
    order_by(query, {:desc, :rating})
  end
end
