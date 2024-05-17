defmodule Codebattle.Event.EventResult do
  @moduledoc false

  alias Codebattle.Clan
  alias Codebattle.Event
  alias Codebattle.Repo

  use Ecto.Schema
  import Ecto.Query

  @type t :: %__MODULE__{}

  @derive Jason.Encoder

  schema "event_results" do
    belongs_to(:event, Event)
    belongs_to(:clan, Clan)

    field(:user_id, :integer)
    field(:user_name, :string)
    field(:place, :integer)
    field(:clan_place, :integer)
    field(:score, :integer)
  end

  def get_by_user_id(event_id, user_id, page_size, nil) do
    page_number =
      __MODULE__
      |> Repo.get_by(user_id: user_id, event_id: event_id)
      |> case do
        nil -> 1
        %{place: place} -> div(place, page_size) + 1
      end

    get_by_user_id(event_id, user_id, page_size, page_number)
  end

  def get_by_user_id(event_id, _user_id, page_size, page_number) do
    __MODULE__
    |> where([er], er.event_id == ^event_id)
    |> order_by([er], er.place)
    |> join(:left, [er], c in assoc(er, :clan))
    |> select([er, c], %{
      score: er.score,
      user_id: er.user_id,
      user_name: er.user_name,
      place: er.place,
      clan_id: c.id,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
    |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})
  end

  def get_by_user_id_and_clan_id(event_id, user_id, clan_id, page_size, nil) do
    page_number =
      __MODULE__
      |> Repo.get_by(user_id: user_id, clan_id: clan_id, event_id: event_id)
      |> case do
        nil -> 1
        %{clan_place: place} -> div(place, page_size) + 1
      end

    get_by_user_id_and_clan_id(event_id, user_id, clan_id, page_size, page_number)
  end

  def get_by_user_id_and_clan_id(event_id, _user_id, clan_id, page_size, page_number) do
    __MODULE__
    |> where([er], er.event_id == ^event_id)
    |> where([er], er.clan_id == ^clan_id)
    |> order_by([er], er.clan_place)
    |> join(:left, [er], c in assoc(er, :clan))
    |> select([er, c], %{
      score: er.score,
      user_id: er.user_id,
      user_name: er.user_name,
      place: er.clan_place,
      clan_id: c.id,
      clan_name: c.name,
      clan_long_name: c.long_name
    })
    |> Repo.paginate(%{page: page_number, page_size: page_size, total: true})
  end

  def save_results(tournament) do
    clean_results(tournament.event_id)

    sql = """
    INSERT INTO event_results
      (
      event_id,
      user_id,
      user_name,
      clan_id,
      score,
      place,
      clan_place
      )
      SELECT
        #{tournament.event_id},
        user_id,
        user_name,
        clan_id,
        SUM(score),
        DENSE_RANK() OVER (ORDER BY SUM(score) DESC, SUM(duration_sec) ASC),
        DENSE_RANK() OVER (PARTITION BY clan_id ORDER BY SUM(score) DESC, SUM(duration_sec) ASC)
      FROM
        tournament_results
        WHERE tournament_id in (select id from tournaments where event_id = #{tournament.event_id})
        GROUP BY user_id, user_name, clan_id
    """

    Ecto.Adapters.SQL.query!(Repo, sql)
  end

  def clean_results(event_id) do
    __MODULE__
    |> where([er], er.event_id == ^event_id)
    |> Repo.delete_all()
  end
end
