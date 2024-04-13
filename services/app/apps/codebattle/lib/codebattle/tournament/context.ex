defmodule Codebattle.Tournament.Context do
  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Runner.AtomizedMap

  import Ecto.Query
  import Ecto.Changeset

  @type tournament_id :: pos_integer() | String.t()

  @states_from_restore ["waiting_participants"]
  @max_alive_tournaments Application.compile_env(:codebattle, :max_alive_tournaments)

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
    |> Enum.sort_by(& &1.id)
  end

  @spec get_db_tournaments(nonempty_list(String.t())) :: list(Tournament.t())
  def get_db_tournaments(states) do
    from(
      t in Tournament,
      order_by: [desc: t.id],
      where: t.state in ^states,
      limit: 15,
      preload: [:creator]
    )
    |> Repo.all()
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
      tournament -> tournament.state in ["waiting_participants", "active"]
    end)
  end

  @spec get_live_tournaments_count() :: non_neg_integer()
  def get_live_tournaments_count, do: get_live_tournaments() |> Enum.count()

  @spec validate(map(), Tournament.t()) :: Ecto.Changeset.t()
  def validate(params, tournament \\ %Tournament{}) do
    tournament
    |> Tournament.changeset(params)
    |> Map.put(:action, :validate)
  end

  @spec create(map()) :: {:ok, Tournament.t()} | {:error, Ecto.Changeset.t()}
  def create(params) do
    changeset =
      %Tournament{} |> Tournament.changeset(prepare_tournament_params(params))

    alive_count = get_live_tournaments_count()

    if alive_count < @max_alive_tournaments do
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
    else
      add_error(
        changeset,
        :base,
        "Too many live tournaments: #{alive_count}, maximum allowed: #{@max_alive_tournaments}"
      )
    end
  end

  @spec handle_event(Tournament.t() | tournament_id(), atom(), map()) :: :ok
  def handle_event(%Tournament{id: id}, event_type, params) do
    handle_event(id, event_type, params)
  end

  def handle_event(tournament_id, event_type, params) do
    Tournament.Server.handle_event(tournament_id, event_type, params)
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
      tournament |> Tournament.Players.get_players() |> Enum.map(&{&1.id, &1}) |> Enum.into(%{})

    matches =
      tournament |> Tournament.Matches.get_matches() |> Enum.map(&{&1.id, &1}) |> Enum.into(%{})

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

  defp prepare_tournament_params(params) do
    starts_at =
      (params["starts_at"] <> ":00")
      |> NaiveDateTime.from_iso8601!()
      |> DateTime.from_naive!(params["user_timezone"])

    match_timeout_seconds = params["match_timeout_seconds"] || "180"

    access_token =
      case params["access_type"] do
        "token" -> generate_access_token()
        _ -> nil
      end

    show_results = params["show_results"] || true

    Map.merge(params, %{
      "access_token" => access_token,
      "match_timeout_seconds" => match_timeout_seconds,
      "starts_at" => starts_at,
      "meta" => get_meta_from_params(params),
      "show_results" => show_results
    })
  end

  defp get_meta_from_params(%{"meta_json" => meta_json}) do
    meta_json
    |> Jason.decode!()
    |> AtomizedMap.atomize()
  end

  defp get_meta_from_params(params) do
    case params["type"] do
      "team" ->
        team_1_name = Utils.presence(params["team_1_name"]) || "Backend"
        team_2_name = Utils.presence(params["team_2_name"]) || "Frontend"
        rounds_to_win = params |> Map.get("rounds_to_win", "3") |> String.to_integer()

        %{
          rounds_to_win: rounds_to_win,
          round_results: %{},
          teams: %{
            Tournament.Helpers.to_id(0) => %{id: 0, title: team_1_name, score: 0.0},
            Tournament.Helpers.to_id(1) => %{id: 1, title: team_2_name, score: 0.0}
          }
        }

      "show" ->
        rounds_config =
          params
          |> Map.get("rounds_config_json")
          |> cast_json_value()

        game_passwords =
          params
          |> Map.get("game_passwords_json")
          |> cast_json_value()

        %{
          game_passwords: game_passwords,
          rounds_config: rounds_config
        }

      "versus" ->
        %{rounds_limit: 1000}

      type when type in ["arena", "swiss"] ->
        rounds_limit = params |> Map.get("rounds_limit", "3") |> String.to_integer()
        use_clan = Map.get(params, "use_clan", "false") == "true"

        %{use_clan: use_clan, rounds_limit: rounds_limit}

      _ ->
        %{}
    end
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
  defp get_module(%{type: "swiss"}), do: Tournament.Swiss
  defp get_module(%{type: "show"}), do: Tournament.Show
  defp get_module(%{type: "team"}), do: Tournament.Team
  defp get_module(%{type: "versus"}), do: Tournament.Versus
  defp get_module(%{type: "individual"}), do: Tournament.Individual

  defp add_module(tournament), do: Map.put(tournament, :module, get_module(tournament))

  defp generate_access_token() do
    :crypto.strong_rand_bytes(17) |> Base.url_encode64() |> binary_part(0, 17)
  end

  defp cast_json_value(value) do
    case value do
      nil -> nil
      "" -> nil
      value -> value |> Jason.decode!() |> AtomizedMap.atomize()
    end
  end
end
