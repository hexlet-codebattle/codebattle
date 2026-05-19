defmodule Codebattle.GroupTournament.LeaderboardStore do
  @moduledoc """
  Per-tournament ETS-backed cache for the group tournament leaderboard.

  The owning `Codebattle.GroupTournament.Server` creates one ETS table per
  live tournament and rebuilds it from Postgres at boot and after each round
  finishes. Reads (top-N, rank, window-around-user, total) are served from
  ETS so a tournament with N viewers no longer pays N × full recomputations
  on every status update.

  When the server is not running (or the table has not been built yet),
  read functions transparently fall back to
  `Codebattle.GroupTournament.Context.build_leaderboard/1` so callers don't
  have to special-case cold tournaments.
  """

  alias Codebattle.GroupTournament.Context

  @registry Codebattle.Registry
  @registry_key {:gt_leaderboard, :_id}

  @type entry :: %{
          user_id: pos_integer(),
          name: String.t() | nil,
          avatar_url: String.t() | nil,
          clan: String.t() | nil,
          clan_id: pos_integer() | nil,
          state: String.t(),
          slice_index: integer() | nil,
          total_score: integer(),
          seed_score: integer() | nil,
          last_round_place: integer() | nil,
          rounds: map()
        }

  # --- Public API used by the owning Server ---

  @doc """
  Build the ETS tables for the tournament and fill them from Postgres.

  Must be called from the process that should own the tables (the
  GroupTournament.Server). Safe to call repeatedly: on rebuild we drop the
  old rows and reinsert.
  """
  @spec init(pos_integer()) :: :ok
  def init(tournament_id) do
    {rows, idx} = ensure_tables(tournament_id)
    fill(tournament_id, rows, idx)
    :ok
  end

  @doc """
  Recompute the leaderboard from Postgres and replace the ETS contents.

  Called by the Server after a round finishes or after seeding so cached
  reads stay fresh. If the tables don't exist yet (e.g. process restarted
  without going through `init/1`) we create them on demand.
  """
  @spec refresh(pos_integer()) :: :ok
  def refresh(tournament_id) do
    {rows, idx} = ensure_tables(tournament_id)
    fill(tournament_id, rows, idx)
    :ok
  end

  # --- Read API (callable from any process) ---

  @doc """
  Returns all leaderboard entries in rank order. Falls back to a DB
  computation if the ETS table is not registered.
  """
  @spec list(pos_integer()) :: [entry()]
  def list(tournament_id) do
    case lookup_tables(tournament_id) do
      {:ok, %{rows: rows}} -> select_all(rows)
      :error -> Context.build_leaderboard(tournament_id)
    end
  end

  @doc """
  Returns up to `limit` top entries. `limit` defaults to 50, capped at 500
  to keep payloads bounded.
  """
  @spec top(pos_integer(), pos_integer()) :: [entry()]
  def top(tournament_id, limit \\ 50) do
    capped = limit |> max(1) |> min(500)

    case lookup_tables(tournament_id) do
      {:ok, %{rows: rows}} -> select_top(rows, capped)
      :error -> tournament_id |> Context.build_leaderboard() |> Enum.take(capped)
    end
  end

  @doc """
  Returns `{rank, entries}` for a window of `2*radius+1` entries centered
  on `user_id`. `rank` is 1-based or `nil` if the user is not in the
  leaderboard.
  """
  @spec window(pos_integer(), pos_integer(), pos_integer()) ::
          {pos_integer() | nil, [entry()]}
  def window(tournament_id, user_id, radius \\ 5) do
    case lookup_tables(tournament_id) do
      {:ok, %{rows: rows, idx: idx}} ->
        case :ets.lookup(idx, user_id) do
          [{^user_id, key}] -> window_from(rows, key, radius)
          [] -> {nil, []}
        end

      :error ->
        all = Context.build_leaderboard(tournament_id)
        window_from_list(all, user_id, radius)
    end
  end

  @doc """
  Returns the 1-based rank of `user_id` in the leaderboard, or `nil` if the
  user is not present. Uses an O(N) walk through ETS — fine up to a few
  thousand players. If we ever blow past that, swap in a `gb_trees` rank
  index alongside the ETS rows table.
  """
  @spec rank(pos_integer(), pos_integer()) :: pos_integer() | nil
  def rank(tournament_id, user_id) do
    case lookup_tables(tournament_id) do
      {:ok, %{rows: rows, idx: idx}} ->
        case :ets.lookup(idx, user_id) do
          [{^user_id, key}] -> rank_of_key(rows, key)
          [] -> nil
        end

      :error ->
        tournament_id
        |> Context.build_leaderboard()
        |> Enum.find_index(&(&1.user_id == user_id))
        |> case do
          nil -> nil
          i -> i + 1
        end
    end
  end

  @doc """
  Returns the number of entries in the leaderboard.
  """
  @spec total(pos_integer()) :: non_neg_integer()
  def total(tournament_id) do
    case lookup_tables(tournament_id) do
      {:ok, %{rows: rows}} -> :ets.info(rows, :size) || 0
      :error -> length(Context.build_leaderboard(tournament_id))
    end
  end

  # --- Internal helpers ---

  defp ensure_tables(tournament_id) do
    case lookup_tables(tournament_id) do
      {:ok, %{rows: rows, idx: idx}} ->
        {rows, idx}

      :error ->
        rows = :ets.new(:"gt_lb_rows_#{tournament_id}", [:ordered_set, :protected, read_concurrency: true])
        idx = :ets.new(:"gt_lb_idx_#{tournament_id}", [:set, :protected, read_concurrency: true])
        Registry.register(@registry, registry_key(tournament_id), %{rows: rows, idx: idx})
        {rows, idx}
    end
  end

  defp fill(tournament_id, rows, idx) do
    :ets.delete_all_objects(rows)
    :ets.delete_all_objects(idx)

    tournament_id
    |> Context.build_leaderboard()
    |> Enum.each(fn entry ->
      key = sort_key(entry)
      :ets.insert(rows, {key, entry})
      :ets.insert(idx, {entry.user_id, key})
    end)
  end

  # Sort key chosen so that an :ordered_set iterates from rank 1 upwards.
  # Negative scores put higher scores first; user_id tie-breaks deterministically.
  defp sort_key(entry) do
    {-(entry.total_score || 0), -(entry.seed_score || 0), entry.user_id}
  end

  defp select_all(rows) do
    rows
    |> :ets.tab2list()
    |> Enum.sort_by(&elem(&1, 0))
    |> Enum.map(&elem(&1, 1))
  end

  defp select_top(rows, limit) do
    case :ets.select(rows, [{{:_, :"$1"}, [], [:"$1"]}], limit) do
      {entries, _cont} -> entries
      :"$end_of_table" -> []
    end
  end

  defp window_from(rows, key, radius) do
    before = rows |> walk(key, :prev, radius, []) |> Enum.reverse()
    after_entries = rows |> walk(key, :next, radius, []) |> Enum.reverse()
    [{_key, self_entry}] = :ets.lookup(rows, key)

    {rank_of_key(rows, key), before ++ [self_entry] ++ after_entries}
  end

  # Walks up to `steps` positions in `direction` (:prev or :next), returning
  # the visited entries in walk order (nearest-first).
  defp walk(_rows, _key, _dir, 0, acc), do: acc

  defp walk(rows, key, dir, steps, acc) do
    case apply(:ets, dir, [rows, key]) do
      :"$end_of_table" ->
        acc

      next_key ->
        [{^next_key, entry}] = :ets.lookup(rows, next_key)
        walk(rows, next_key, dir, steps - 1, [entry | acc])
    end
  end

  defp window_from_list(all, user_id, radius) do
    case Enum.find_index(all, &(&1.user_id == user_id)) do
      nil ->
        {nil, []}

      i ->
        lo = max(i - radius, 0)
        hi = min(i + radius, length(all) - 1)
        {i + 1, Enum.slice(all, lo..hi)}
    end
  end

  defp rank_of_key(rows, target_key) do
    rank_of_key(rows, :ets.first(rows), target_key, 1)
  end

  defp rank_of_key(_rows, :"$end_of_table", _target, _n), do: nil
  defp rank_of_key(_rows, key, key, n), do: n

  defp rank_of_key(rows, key, target, n) do
    rank_of_key(rows, :ets.next(rows, key), target, n + 1)
  end

  defp lookup_tables(tournament_id) do
    case Registry.lookup(@registry, registry_key(tournament_id)) do
      [{_pid, refs}] -> {:ok, refs}
      [] -> :error
    end
  end

  defp registry_key(tournament_id), do: put_elem(@registry_key, 1, tournament_id)
end
