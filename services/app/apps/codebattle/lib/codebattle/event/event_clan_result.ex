defmodule Codebattle.Event.EventClanResult do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Query

  alias Codebattle.Clan
  alias Codebattle.Event
  alias Codebattle.Repo

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:clan_id, :players_count, :place, :score]}

  schema "event_clan_results" do
    belongs_to(:event, Event)
    belongs_to(:clan, Clan)

    field(:players_count, :integer)
    field(:place, :integer)
    field(:score, :integer)
  end

  def get_by_event_id(event_id) do
    __MODULE__
    |> where([er], er.event_id == ^event_id)
    |> Repo.all()
  end

  def get_by_clan_id(event_id, clan_id, page_size, nil) do
    page_number =
      __MODULE__
      |> Repo.get_by(clan_id: clan_id, event_id: event_id)
      |> case do
        nil -> 1
        %{place: place} -> div(place, page_size) + 1
      end

    get_by_clan_id(event_id, clan_id, page_size, page_number)
  end

  def get_by_clan_id(event_id, _clan_id, page_size, page_number) do
    Clan
    |> from(as: :c)
    |> join(:left, [c: c], u in assoc(c, :users), as: :u)
    |> join(:left, [c: c], er in __MODULE__,
      on: er.clan_id == c.id and er.event_id == ^event_id,
      as: :er
    )
    |> where([u: u], fragment("? not like 'neBot_%'", u.name))
    |> group_by([c: c, er: er], [c.id, er.id])
    |> order_by([er: er], {:asc_nulls_last, er.place})
    |> select([u: u, c: c, er: er], %{
      event_players_count: er.players_count,
      clans_players_count: count(u.id),
      score: er.score,
      place: er.place,
      clan_id: c.id,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
    |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})
  end

  def save_results(tournament) do
    clean_results(tournament.event_id)

    sql = """
    INSERT INTO event_clan_results
      (
      clan_id,
      event_id,
      players_count,
      score,
      place
      )
      SELECT
        clan_id,
        #{tournament.event_id},
        COUNT(distinct user_id),
        SUM(score),
        ROW_NUMBER() OVER (ORDER BY SUM(score) DESC, SUM(duration_sec) ASC, COUNT(user_id) DESC)
      FROM
        tournament_results
        WHERE tournament_id in (select id from tournaments where event_id = #{tournament.event_id})
        GROUP BY clan_id
    """

    Ecto.Adapters.SQL.query!(Repo, sql)
  end

  def clean_results(event_id) do
    __MODULE__
    |> where([er], er.event_id == ^event_id)
    |> Repo.delete_all()
  end
end
