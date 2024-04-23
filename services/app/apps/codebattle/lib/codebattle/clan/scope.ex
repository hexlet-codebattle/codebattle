defmodule Codebattle.Clan.Scope do
  @moduledoc """
    Module with scopes for the Clan scheme
  """

  alias Codebattle.Clan
  alias Codebattle.User

  import Ecto.Query

  def by_clan(_params) do
    Clan
    |> from(as: :c)
    |> join(:left, [c: c], u in assoc(c, :users), as: :u)
    |> where([u: u], fragment("? not like 'neBot_%'", u.name))
    |> group_by([c: c], c.id)
    |> order_by([u: u], count(u.id))
    |> select([u: u, c: c], %{
      players_count: count(u.id),
      # TODO: add score and place
      score: 0,
      place: 0,
      clan_id: c.id,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
  end

  def by_player(_params) do
    Clan
    |> from(as: :c)
    |> join(:inner, [c: c], u in assoc(c, :users), as: :u)
    |> where([u: u], fragment("? not like 'neBot_%'", u.name))
    |> where([u: u], u.is_bot != true)
    |> select([u: u, c: c], %{
      # TODO: add score and place
      score: 0,
      place: 0,
      clan_id: c.id,
      user_name: u.name,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
  end

  def by_player_clan(params) do
    Clan
    |> from(as: :c)
    |> join(:inner, [c: c], u in assoc(c, :users), as: :u)
    |> where([u: u], fragment("? not like 'neBot_%'", u.name))
    |> where([u: u], u.is_bot != true)
    |> where([c: c], c.id == ^params.clan_id)
    |> select([u: u, c: c], %{
      # TODO: add score and place
      score: 0,
      place: 0,
      clan_id: c.id,
      user_name: u.name,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
  end
end
