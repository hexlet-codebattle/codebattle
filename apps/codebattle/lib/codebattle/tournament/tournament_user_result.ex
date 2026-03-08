defmodule Codebattle.Tournament.TournamentUserResult do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Query

  alias Codebattle.Clan
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.User

  @type t :: %__MODULE__{}

  schema "tournament_user_results" do
    field(:avg_result_percent, :decimal)
    field(:clan_id, :integer)
    field(:clan_name, :string)
    field(:games_count, :integer, default: 0)
    field(:is_cheater, :boolean, default: false)
    field(:place, :integer, default: 0)
    field(:points, :integer, default: 0)
    field(:score, :integer, default: 0)
    field(:total_time, :integer, default: 0)
    field(:tournament_id, :integer)
    field(:user_id, :integer)
    field(:user_name, :string)
    field(:user_lang, :string)
    field(:wins_count, :integer, default: 0)

    timestamps(updated_at: false)
  end

  @spec get_by(pos_integer()) :: [t()]
  def get_by(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.all()
  end

  @spec get_leaderboard(pos_integer(), pos_integer()) :: [t()]
  def get_leaderboard(tournament_id, limit \\ 32) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> order_by([tr], asc: tr.place)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec get_user_history(integer() | String.t(), pos_integer(), pos_integer()) :: map()
  def get_user_history(user_id, page \\ 1, page_size \\ 20) do
    __MODULE__
    |> join(:inner, [tur], t in Tournament, on: tur.tournament_id == t.id)
    |> where([tur, t], tur.user_id == ^user_id and t.state == "finished")
    |> order_by([_tur, t], desc: t.finished_at, desc: t.started_at, desc: t.id)
    |> select([tur, t], %{
      tournament_id: t.id,
      tournament_name: t.name,
      tournament_grade: t.grade,
      tournament_type: t.type,
      tournament_state: t.state,
      tournament_started_at: t.started_at,
      tournament_finished_at: t.finished_at,
      place: tur.place,
      points: tur.points,
      score: tur.score,
      games_count: tur.games_count,
      wins_count: tur.wins_count,
      total_time: tur.total_time,
      avg_result_percent: tur.avg_result_percent,
      user_lang: tur.user_lang,
      clan_name: tur.clan_name,
      is_cheater: tur.is_cheater
    })
    |> Repo.paginate(%{page: page, page_size: page_size, total: true})
  end

  @spec upsert_results(tounament :: Tournament.t() | map()) :: Tournament.t()
  def upsert_results(%{type: "swiss", ranking_type: "by_user"} = tournament) do
    clean_results(tournament.id)

    timestamp = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

    rows =
      from(tr in TournamentResult,
        where: tr.tournament_id == ^tournament.id and tr.was_cheated == false,
        where: tr.user_id not in ^(tournament.cheater_ids || []),
        left_join: c in Clan,
        on: c.id == tr.clan_id,
        group_by: [tr.tournament_id, tr.user_id, tr.clan_id, c.name],
        order_by: [desc: sum(tr.score), asc: sum(tr.duration_sec), asc: tr.user_id],
        select: %{
          tournament_id: tr.tournament_id,
          user_id: tr.user_id,
          clan_id: tr.clan_id,
          clan_name: c.name,
          user_name: max(tr.user_name),
          user_lang: max(tr.user_lang),
          score: sum(tr.score),
          games_count: count(tr.id),
          wins_count:
            fragment(
              "SUM(CASE WHEN ? = 100.0 THEN 1 ELSE 0 END)::integer",
              tr.result_percent
            ),
          total_time: sum(tr.duration_sec),
          avg_result_percent: type(avg(tr.result_percent), :decimal)
        }
      )
      |> Repo.all()
      |> Enum.with_index(1)
      |> Enum.map(fn {row, place} ->
        Map.merge(row, %{
          place: place,
          points: grade_points(tournament.grade, place),
          is_cheater: false,
          inserted_at: timestamp
        })
      end)

    if rows != [] do
      Repo.insert_all(__MODULE__, rows)
    end

    upsert_cheater_results(tournament)

    tournament
  end

  def upsert_results(tournament), do: tournament

  def clean_results(tournament_id) do
    __MODULE__
    |> where([tr], tr.tournament_id == ^tournament_id)
    |> Repo.delete_all()
  end

  defp upsert_cheater_results(%{cheater_ids: cheater_ids} = tournament) when is_list(cheater_ids) do
    cheater_ids = cheater_ids |> Enum.uniq() |> Enum.sort()

    if cheater_ids == [] do
      :ok
    else
      fair_count =
        __MODULE__
        |> where([tr], tr.tournament_id == ^tournament.id)
        |> Repo.aggregate(:count, :user_id)

      timestamp = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

      rows =
        tournament
        |> Helpers.get_players(cheater_ids)
        |> Enum.map(fn
          nil -> nil
          player -> player
        end)
        |> Enum.zip(cheater_ids)
        |> Enum.map(fn
          {nil, user_id} ->
            user = User.get!(user_id)

            %{
              id: user.id,
              clan_id: user.clan_id,
              clan: user.clan,
              lang: user.lang,
              name: user.name
            }

          {player, _user_id} ->
            player
        end)
        |> Enum.sort_by(& &1.id)
        |> Enum.with_index(fair_count + 1)
        |> Enum.map(fn {player, place} ->
          %{
            tournament_id: tournament.id,
            user_id: player.id,
            clan_id: player.clan_id,
            clan_name: player.clan,
            user_name: player.name,
            user_lang: player.lang,
            score: 0,
            points: 0,
            place: place,
            games_count: 0,
            wins_count: 0,
            total_time: 0,
            is_cheater: true,
            avg_result_percent: Decimal.new("0.0"),
            inserted_at: timestamp
          }
        end)

      if rows != [] do
        Repo.insert_all(
          __MODULE__,
          rows,
          on_conflict:
            {:replace,
             [
               :clan_id,
               :clan_name,
               :user_name,
               :user_lang,
               :score,
               :points,
               :place,
               :games_count,
               :wins_count,
               :total_time,
               :is_cheater,
               :avg_result_percent
             ]},
          conflict_target: [:tournament_id, :user_id]
        )
      end
    end
  end

  defp upsert_cheater_results(_tournament), do: :ok

  defp grade_points("rookie", place) when place <= 3, do: Enum.at([8, 4, 2], place - 1)
  defp grade_points("challenger", place) when place <= 4, do: Enum.at([16, 8, 4, 2], place - 1)
  defp grade_points("pro", place) when place <= 7, do: Enum.at([128, 64, 32, 16, 8, 4, 2], place - 1)
  defp grade_points("elite", place) when place <= 8, do: Enum.at([256, 128, 64, 32, 16, 8, 4, 2], place - 1)

  defp grade_points("masters", place) when place <= 10, do: Enum.at([1024, 512, 256, 128, 64, 32, 16, 8, 4, 2], place - 1)

  defp grade_points("grand_slam", place) when place <= 11,
    do: Enum.at([2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2], place - 1)

  defp grade_points("open", _place), do: 0
  defp grade_points(_grade, _place), do: 2
end
