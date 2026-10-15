defmodule Codebattle.Leaderboard do
  @moduledoc """
  Paginated leaderboards for the lobby widget.

  * `elo/3` — `:all` ranks people by current Elo rating; `:week` / `:month` /
    `:year` rank them by Elo gained since the start of the current UTC week /
    month / year (the sum of `user_games.rating_diff`), with games and wins
    played in that window.
  * `season/3` — standings of a season from `season_results`.

  Every result carries `me`: the requesting user's own row (with position), so
  the widget can show where they stand even when they're not on the page.
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Season
  alias Codebattle.SeasonResult
  alias Codebattle.User
  alias Codebattle.UserGame

  @type period :: :week | :month | :year | :all
  @type page_opts :: %{page: pos_integer(), page_size: pos_integer()}

  @spec elo(period(), page_opts(), User.t() | nil) :: map()
  def elo(:all, opts, user) do
    ranked =
      from(u in User,
        where: is_nil(u.archived_at) and u.is_bot == false,
        select: %{
          id: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          lang: u.lang,
          rating: u.rating,
          position: over(row_number(), order_by: [desc: u.rating, asc: u.id])
        }
      )

    paginate(ranked, opts, user)
  end

  def elo(period, opts, user) when period in [:week, :month, :year] do
    since = period_start(period)

    gains =
      from(ug in UserGame,
        join: u in User,
        on: u.id == ug.user_id,
        where: ug.inserted_at >= ^since and u.is_bot == false and is_nil(u.archived_at),
        group_by: [u.id, u.name, u.avatar_url, u.lang, u.rating],
        select: %{
          id: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          lang: u.lang,
          rating: u.rating,
          gain: sum(coalesce(ug.rating_diff, 0)),
          games: count(ug.id),
          wins: filter(count(ug.id), ug.result == "won"),
          position:
            over(row_number(),
              order_by: [desc: sum(coalesce(ug.rating_diff, 0)), desc: count(ug.id), asc: u.id]
            )
        }
      )

    paginate(gains, opts, user)
  end

  @spec season(Season.t() | nil, page_opts(), User.t() | nil) :: map()
  def season(nil, opts, _user), do: empty(opts)

  def season(%Season{id: season_id}, opts, user) do
    standings =
      from(sr in SeasonResult,
        left_join: u in User,
        on: u.id == sr.user_id,
        where: sr.season_id == ^season_id and sr.place >= 1,
        select: %{
          id: sr.user_id,
          name: sr.user_name,
          avatar_url: u.avatar_url,
          lang: sr.user_lang,
          clan: sr.clan_name,
          points: sr.total_points,
          tournaments: sr.tournaments_count,
          wins: sr.total_wins_count,
          position: sr.place
        }
      )

    paginate(standings, opts, user)
  end

  @doc "Most recent seasons that have started, newest first (the widget's season tabs)."
  @spec recent_seasons(pos_integer(), Date.t()) :: [Season.t()]
  def recent_seasons(limit, today \\ Date.utc_today()) do
    Repo.all(from(s in Season, where: s.starts_at <= ^today, order_by: [desc: s.starts_at], limit: ^limit))
  end

  @doc "Start of the current UTC week (Monday), month or year, as a naive datetime."
  @spec period_start(:week | :month | :year, Date.t()) :: NaiveDateTime.t()
  def period_start(period, today \\ Date.utc_today())

  def period_start(:week, today), do: today |> Date.beginning_of_week() |> NaiveDateTime.new!(~T[00:00:00])
  def period_start(:month, today), do: today |> Date.beginning_of_month() |> NaiveDateTime.new!(~T[00:00:00])
  def period_start(:year, today), do: today.year |> Date.new!(1, 1) |> NaiveDateTime.new!(~T[00:00:00])

  # `ranked` selects a `position`; wrap it so the window is computed over every
  # row before paging or picking out the current user.
  defp paginate(ranked, %{page: page, page_size: page_size}, user) do
    rows = from(r in subquery(ranked))
    total = Repo.aggregate(rows, :count)

    entries =
      Repo.all(
        from(r in rows,
          order_by: [asc: r.position],
          limit: ^page_size,
          offset: ^((page - 1) * page_size)
        )
      )

    %{
      entries: entries,
      me: me(rows, user),
      page_info: %{
        page_number: page,
        page_size: page_size,
        total_entries: total,
        total_pages: max(1, div(total + page_size - 1, page_size))
      }
    }
  end

  defp me(_rows, nil), do: nil
  defp me(_rows, %{is_guest: true}), do: nil
  defp me(rows, %{id: user_id}), do: Repo.one(from(r in rows, where: r.id == ^user_id))

  defp empty(%{page_size: page_size}) do
    %{entries: [], me: nil, page_info: %{page_number: 1, page_size: page_size, total_entries: 0, total_pages: 1}}
  end
end
