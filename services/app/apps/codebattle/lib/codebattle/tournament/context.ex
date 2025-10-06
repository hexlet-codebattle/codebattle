# credo:disable-for-this-file
defmodule Codebattle.Tournament.Context do
  @moduledoc false
  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Runner.AtomizedMap

  @type tournament_id :: pos_integer() | String.t()
  @type event_id :: pos_integer() | String.t()

  @states_from_restore ["waiting_participants"]

  def get_user_latest_game_id(tournament, user_id) do
    tournament
    |> Tournament.Helpers.get_player_latest_match(user_id)
    |> case do
      %{game_id: game_id} -> game_id
      _ -> nil
    end
  end

  @spec get_tournament_info(tournament_id()) :: Tournament.t() | map()
  def get_tournament_info(tournament_id) do
    case Tournament.Server.get_tournament_info(tournament_id) do
      nil -> get_from_db!(tournament_id)
      tournament_info -> tournament_info
    end
  end

  @spec get!(tournament_id()) :: Tournament.t() | no_return()
  def get!(id) do
    case Tournament.Server.get_tournament(id) do
      nil -> get_from_db!(id)
      tournament -> tournament
    end
  end

  @spec get(tournament_id()) :: Tournament.t() | nil
  def get(id) do
    get!(id)
  rescue
    Ecto.NoResultsError ->
      nil
  end

  @spec get_from_db!(tournament_id()) :: Tournament.t() | no_return()
  def get_from_db!(id) do
    Tournament
    |> Repo.get!(id)
    |> Repo.preload([:creator])
    |> add_module()
  end

  @spec check_pass_code(tournament_id(), String.t()) :: boolean()
  def check_pass_code(id, pass_code) do
    case get(id) do
      %{meta: %{game_passwords: passwords}} -> pass_code in passwords
      _ -> false
    end
  end

  @spec remove_pass_code(tournament_id(), String.t()) :: :ok | {:error, term()}
  def remove_pass_code(id, pass_code) do
    Tournament.Server.handle_event(id, :remove_pass_code, %{pass_code: pass_code})
  end

  @spec get_from_db(tournament_id()) :: Tournament.t() | nil
  def get_from_db(id) do
    get_from_db!(id)
  rescue
    Ecto.NoResultsError ->
      nil
  end

  @spec list_live_and_finished(User.t()) :: list(Tournament.t())
  def list_live_and_finished(user) do
    (get_live_tournaments() ++ get_db_tournaments(["finished"]))
    |> Enum.filter(fn tournament ->
      Tournament.Helpers.can_access?(tournament, user, %{})
    end)
    |> Enum.uniq_by(& &1.id)
    |> Enum.sort_by(& &1.id, :desc)
  end

  @spec get_db_tournaments(nonempty_list(String.t())) :: list(Tournament.t())
  def get_db_tournaments(states) do
    Repo.all(
      from(t in Tournament,
        order_by: [desc: t.id],
        where: t.state in ^states,
        limit: 15,
        preload: [:creator]
      )
    )
  end

  @spec get_all_by_event_id!(event_id()) :: Event.t() | no_return()
  def get_all_by_event_id!(event_id) do
    Repo.all(
      from(t in Tournament,
        order_by: t.starts_at,
        where: t.event_id == ^event_id and t.state in ["waiting_participants", "active", "finished"]
      )
    )
  end

  @spec get_waiting_participants_to_start_candidates() :: list(Tournament.t())
  def get_waiting_participants_to_start_candidates do
    Enum.filter(get_live_tournaments(), fn tournament ->
      tournament.state == "waiting_participants" &&
        tournament.grade != "open" &&
        tournament.starts_at

      # &&
      # DateTime.compare(tournament.starts_at, DateTime.utc_now()) == :lt
    end)
  end

  @spec get_upcoming_to_live_candidate(non_neg_integer()) :: Tournament.t() | nil
  def get_upcoming_to_live_candidate(starts_at_delay_mins) do
    delay_time = DateTime.add(DateTime.utc_now(), starts_at_delay_mins, :minute)

    Repo.one(
      from(t in Tournament,
        limit: 1,
        order_by: t.id,
        where:
          t.state == "upcoming" and
            t.starts_at < ^delay_time
      )
    )
  end

  @spec get_upcoming_tournaments(%{
          from: DateTime.t(),
          to: DateTime.t(),
          user_id: non_neg_integer() | nil
        }) :: list(Tournament.t())
  def get_upcoming_tournaments(filter) do
    %{from: datetime_from, to: datetime_to} = filter

    Repo.all(
      from(t in Tournament,
        order_by: t.id,
        where:
          t.starts_at >= ^datetime_from and
            t.starts_at <= ^datetime_to and
            t.grade != "open" and
            t.state == "upcoming"
      )
    )
  end

  @spec get_user_tournaments(%{
          from: DateTime.t(),
          to: DateTime.t(),
          user_id: non_neg_integer() | nil
        }) :: list(Tournament.t())
  def get_user_tournaments(%{user_id: nil}), do: []

  def get_user_tournaments(filter) do
    %{from: datetime_from, to: datetime_to, user_id: user_id} = filter

    Repo.all(
      from(t in Tournament,
        order_by: t.id,
        where:
          t.starts_at >= ^datetime_from and
            t.starts_at <= ^datetime_to and
            t.grade == "open" and
            (t.creator_id == ^user_id or fragment("? = ANY(?)", ^user_id, t.winner_ids))
      )
    )
  end

  @spec get_live_tournaments_for_user(User.t()) :: list(Tournament.t())
  def get_live_tournaments_for_user(user) do
    get_live_tournaments()
    |> Enum.filter(fn tournament ->
      tournament.grade != "open" ||
        Tournament.Helpers.can_access?(tournament, user, %{})
    end)
    |> Enum.uniq_by(& &1.id)
    |> Enum.sort_by(& &1.id, :desc)
  end

  @spec get_live_tournaments() :: list(Tournament.t())
  def get_live_tournaments do
    Tournament.GlobalSupervisor
    |> Supervisor.which_children()
    |> Enum.filter(fn
      {_, :undefined, _, _} -> false
      {_, _pid, _, _} -> true
    end)
    |> Enum.map(fn {id, _, _, _} -> Tournament.Context.get(id) end)
    |> Enum.filter(fn
      nil -> false
      tournament -> tournament.state in ["waiting_participants", "active", "finished"]
    end)
  end

  @spec get_live_tournaments_count() :: non_neg_integer()
  def get_live_tournaments_count, do: Enum.count(get_live_tournaments())

  @spec validate(map(), Tournament.t()) :: Ecto.Changeset.t()
  def validate(params, tournament \\ %Tournament{}) do
    tournament
    |> Tournament.changeset(params)
    |> Map.put(:action, :validate)
  end

  @spec create(map()) :: {:ok, Tournament.t()} | {:error, Ecto.Changeset.t()}
  def create(params) do
    changeset = Tournament.changeset(%Tournament{}, prepare_tournament_params(params))

    changeset
    |> Repo.insert()
    |> case do
      {:ok, tournament} ->
        {:ok, _pid} =
          tournament
          |> add_module()
          |> mark_as_live()
          |> Tournament.GlobalSupervisor.start_tournament()

        Codebattle.PubSub.broadcast("tournament:created", %{tournament: tournament})

        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @spec handle_event(Tournament.t() | tournament_id(), atom(), map()) :: :ok
  def handle_event(%Tournament{id: id}, event_type, params) do
    handle_event(id, event_type, params)
  end

  def handle_event(tournament_id, event_type, params) do
    Tournament.Server.handle_event(tournament_id, event_type, params)
  end

  @spec get_live_tournament_players(Tournament.t()) :: [Tournament.Player.t()]
  def get_live_tournament_players(tournament) do
    Tournament.Players.get_players(tournament)
  end

  @spec update(Tournament.t(), map()) :: {:ok, Tournament.t()} | {:error, Ecto.Changeset.t()}
  def update(tournament, params) do
    tournament
    |> Tournament.changeset(prepare_tournament_params(params))
    |> Repo.update()
    |> case do
      {:ok, tournament} ->
        Tournament.Server.update_tournament(tournament)
        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @spec upsert!(Tournament.t(), nil | :with_ets) :: Tournament.t()
  def upsert!(tournament, type \\ nil)

  def upsert!(tournament, nil) do
    tournament
    |> Map.put(:updated_at, TimeHelper.utc_now())
    |> Repo.insert!(
      conflict_target: :id,
      on_conflict: {:replace_all_except, [:id, :inserted_at]}
    )
  end

  def upsert!(tournament, :with_ets) do
    players =
      tournament |> Tournament.Players.get_players() |> Map.new(&{&1.id, &1})

    matches =
      tournament |> Tournament.Matches.get_matches() |> Map.new(&{&1.id, &1})

    tournament
    |> Map.put(:updated_at, TimeHelper.utc_now())
    |> Map.put(:players, players)
    |> Map.put(:matches, matches)
    |> Repo.insert!(
      conflict_target: :id,
      on_conflict: {:replace_all_except, [:id, :inserted_at]}
    )
  end

  @spec restart(Tournament.t()) :: :ok
  def restart(tournament) do
    tournament
    |> Tournament.Helpers.get_matches("playing")
    |> Enum.each(&Game.Context.terminate_game(&1.game_id))

    :timer.sleep(59)

    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
    Tournament.GlobalSupervisor.start_tournament(tournament)
    :ok
  end

  @spec move_upcoming_to_live(Tournament.t()) :: :ok
  def move_upcoming_to_live(tournament) do
    tournament
    |> Tournament.changeset(%{state: "waiting_participants"})
    |> Repo.update!()

    :timer.sleep(1000)

    Tournament.GlobalSupervisor.start_tournament(tournament)
    :ok
  end

  defp prepare_tournament_params(params) do
    params =
      params
      |> Map.delete("creator")
      |> AtomizedMap.atomize()
      |> Map.put(:creator, params["creator"] || %{})

    cond_result =
      if params[:starts_at] do
        params[:starts_at] <> ":00"
      else
        NaiveDateTime.utc_now()
        |> NaiveDateTime.add(60 * 60, :second)
        |> NaiveDateTime.to_iso8601()
      end

    starts_at =
      cond_result
      |> NaiveDateTime.from_iso8601!()
      |> DateTime.from_naive!(params[:user_timezone] || "Etc/UTC")

    match_timeout_seconds = params[:match_timeout_seconds] || "180"

    access_token =
      case params[:access_type] do
        "token" -> generate_access_token()
        _ -> nil
      end

    show_results = params[:show_results] || true

    Map.merge(params, %{
      access_token: access_token,
      match_timeout_seconds: match_timeout_seconds,
      starts_at: starts_at,
      meta: %{},
      show_results: show_results
    })
  end

  def get_tournament_for_restore do
    @states_from_restore
    |> get_db_tournaments()
    |> Enum.map(fn tournament ->
      tournament
      |> add_module()
      |> mark_as_live()
    end)
  end

  def mark_as_live(tournament), do: Map.put(tournament, :is_live, true)

  def get_waiting_room_name(%{id: id, type: "arena"}), do: "t_#{id}"
  def get_waiting_room_name(_tournament), do: nil

  defp get_module(%{type: "arena"}), do: Tournament.Arena
  defp get_module(%{type: "top200"}), do: Tournament.Top200
  defp get_module(%{type: "individual"}), do: Tournament.Individual
  defp get_module(%{type: "show"}), do: Tournament.Show
  defp get_module(%{type: "swiss"}), do: Tournament.Swiss
  defp get_module(%{type: "versus"}), do: Tournament.Versus

  defp add_module(tournament), do: Map.put(tournament, :module, get_module(tournament))

  defp generate_access_token do
    17 |> :crypto.strong_rand_bytes() |> Base.url_encode64() |> binary_part(0, 17)
  end
end
