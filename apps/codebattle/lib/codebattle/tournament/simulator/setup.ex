defmodule Codebattle.Tournament.Simulator.Setup do
  @moduledoc """
  Provisioning helpers for a Top200 simulation tournament.

  Responsibilities:
    * find or create 200 named users (one per name in `Simulator.Names`)
    * pick a random clan from the DB for each user (creating a small pool if none exist)
    * create a Top200 tournament with `meta.simulator = true` (token-access, admin-only)
    * join all 200 users to it
  """

  import Ecto.Query

  alias Codebattle.Clan
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Server, as: TournamentServer
  alias Codebattle.Tournament.Simulator.Names
  alias Codebattle.User

  require Logger

  @default_clans ~w(
    Hexlet River OpenSource Foxes Wolves Vipers Falcons Phoenix Dragons Owls
    Pandas Tigers Sharks Bears Eagles
  )

  @doc """
  Set up a fresh simulation tournament with 200 joined players.
  Returns `{:ok, tournament}` or `{:error, reason}`.
  """
  @spec create(map()) :: {:ok, Tournament.t()} | {:error, term()}
  def create(opts \\ %{}) do
    with {:ok, creator} <- find_creator(),
         {:ok, clans} <- ensure_clans(creator),
         {:ok, users} <- ensure_users(clans),
         {:ok, tournament} <- create_tournament(creator, opts),
         {:ok, tournament} <- stamp_simulator_meta(tournament),
         :ok <- join_users(tournament, users) do
      {:ok, tournament}
    end
  end

  # `Tournament.Context.prepare_tournament_params/1` hard-resets `meta` to `%{}`,
  # so we have to write the simulator flag after insertion and replay it into
  # the live Tournament.Server state so the stream LiveView sees it.
  defp stamp_simulator_meta(tournament) do
    case tournament
         |> Ecto.Changeset.change(meta: %{simulator: true})
         |> Repo.update() do
      {:ok, updated} ->
        TournamentServer.update_tournament(updated)
        {:ok, updated}

      {:error, _} = err ->
        err
    end
  end

  defp find_creator do
    case Repo.one(from(u in User, where: u.subscription_type == :admin, limit: 1)) do
      nil -> {:error, :no_admin_user}
      user -> {:ok, user}
    end
  end

  defp ensure_clans(creator) do
    case Clan.get_all() do
      [] ->
        results =
          Enum.map(@default_clans, fn name ->
            Clan.find_or_create_by_clan(name, creator.id)
          end)

        case Enum.split_with(results, &match?({:ok, _}, &1)) do
          {ok, []} -> {:ok, Enum.map(ok, fn {:ok, c} -> c end)}
          {_, errors} -> {:error, {:clan_create_failed, errors}}
        end

      clans ->
        {:ok, clans}
    end
  end

  defp ensure_users(clans) do
    users =
      Names.all()
      |> Enum.with_index()
      |> Enum.map(fn {name, idx} ->
        clan = Enum.random(clans)
        find_or_create_user(name, idx, clan)
      end)

    case Enum.split_with(users, &match?({:ok, _}, &1)) do
      {ok, []} ->
        {:ok, Enum.map(ok, fn {:ok, u} -> u end)}

      {_ok, errors} ->
        Logger.error("simulator: failed to seed users: #{inspect(Enum.take(errors, 3))}")
        {:error, {:user_seed_failed, errors}}
    end
  end

  defp find_or_create_user(real_name, idx, clan) do
    handle = name_to_handle(real_name, idx)

    case Repo.get_by(User, name: handle) do
      %User{} = u ->
        attach_clan_if_missing(u, clan)

      nil ->
        attrs = %{
          name: handle,
          lang: "python",
          locale: "en",
          subscription_type: :free,
          clan: clan.name
        }

        %User{}
        |> User.changeset(attrs)
        |> Repo.insert()
    end
  end

  defp attach_clan_if_missing(%User{clan_id: nil} = user, clan) do
    user
    |> User.changeset(%{clan: clan.name})
    |> Repo.update()
  end

  defp attach_clan_if_missing(user, _clan), do: {:ok, user}

  # Normalize real name to a unique handle. Constraints: 2..39 chars, unique.
  # We pad with `-sim<idx>` so we never collide with real users.
  defp name_to_handle(real_name, idx) do
    base =
      real_name
      |> String.replace(~r/[^A-Za-z0-9 ]/, "")
      |> String.replace(" ", "_")

    suffix = "-sim#{idx}"
    max_base = 39 - String.length(suffix)

    String.slice(base, 0, max_base) <> suffix
  end

  defp create_tournament(creator, opts) do
    starts_at =
      DateTime.utc_now()
      |> DateTime.add(60, :second)
      |> DateTime.to_naive()
      |> NaiveDateTime.truncate(:second)
      |> NaiveDateTime.to_iso8601()
      |> binary_part(0, 16)

    params = %{
      "name" => Map.get(opts, "name", "Top200 Simulation #{System.unique_integer([:positive])}"),
      "description" => "Top200 simulator tournament — 200 bots play full Python solutions.",
      "type" => "top200",
      "state" => "waiting_participants",
      "access_type" => "token",
      "user_timezone" => "Etc/UTC",
      "starts_at" => starts_at,
      "creator" => creator,
      "use_chat" => false,
      "use_clan" => true,
      "use_timer" => true,
      "players_limit" => 200,
      "rounds_limit" => 8,
      "task_provider" => "level",
      "task_strategy" => "per_round_pair",
      "timeout_mode" => "per_round_with_rematch",
      "round_timeout_seconds" => 300,
      "match_timeout_seconds" => 300,
      "break_duration_seconds" => 5,
      "score_strategy" => "75_percentile",
      "ranking_type" => "by_user",
      "meta" => %{"simulator" => true}
    }

    Tournament.Context.create(params)
  end

  defp join_users(tournament, users) do
    # Chunk to avoid huge single GenServer message timing.
    users
    |> Enum.chunk_every(50)
    |> Enum.each(fn chunk ->
      TournamentServer.handle_event(tournament.id, :join, %{users: chunk})
    end)

    :ok
  end
end
