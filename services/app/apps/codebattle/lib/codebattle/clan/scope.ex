defmodule Codebattle.Clan.Scope do
  @moduledoc """
    Module with scopes for the Clan scheme
  """

  alias Codebattle.Clan

  import Ecto.Query

  def by_clan do
    Clan
    |> from(as: :c)
    |> join(:left, [c: c], u in assoc(c, :users), as: :u)
    |> where([u: u], fragment("? not like 'neBot_%'", u.name))
    |> group_by([c: c], c.id)
    |> order_by([u], {:desc, count(u.id)})
    |> select([u: u, c: c], %{
      players_count: count(u.id),
      score: 0,
      place: 0,
      clan_id: c.id,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
  end

  def by_player do
    Clan
    |> from(as: :c)
    |> join(:inner, [c: c], u in assoc(c, :users), as: :u)
    |> where([u: u], fragment("? not like 'neBot_%'", u.name))
    |> where([u: u], u.is_bot != true)
    |> select([u: u, c: c], %{
      score: 0,
      place: 0,
      clan_id: c.id,
      user_id: u.id,
      user_name: u.name,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
  end

  def by_player_clan(clan_id) do
    Clan
    |> from(as: :c)
    |> join(:inner, [c: c], u in assoc(c, :users), as: :u)
    |> where([u: u], fragment("? not like 'neBot_%'", u.name))
    |> where([u: u], u.is_bot != true)
    |> where([c: c], c.id == ^clan_id)
    |> select([u: u, c: c], %{
      score: 0,
      place: 0,
      clan_id: c.id,
      user_id: u.id,
      user_name: u.name,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
  end
end
