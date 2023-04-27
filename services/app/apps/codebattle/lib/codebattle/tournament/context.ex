defmodule Codebattle.Tournament.Context do
  # alias Codebattle.TaskPack

  alias Codebattle.Tournament

  import Ecto.Query
  import Ecto.Changeset

  @states_from_restore ["waiting_participants"]
  @max_alive_tournaments 7

  @spec get(pos_integer()) :: Tournament.t() | nil
  def get(id) do
    case Tournament.Server.get_tournament(id) do
      nil -> get_from_db(id)
      tournament -> tournament
    end
  end

  @spec get!(pos_integer()) :: Tournament.t() | no_return()
  def get!(id) do
    case Tournament.Server.get_tournament(id) do
      nil -> get_from_db!(id)
      tournament -> tournament
    end
  end

  @spec get_from_db(pos_integer()) :: Tournament.t() | nil
  defp get_from_db(id) do
    Tournament
    |> Codebattle.Repo.get(id)
    |> Codebattle.Repo.preload([:creator])
    |> case do
      nil -> nil
      t -> add_module(t)
    end
  end

  @spec get_from_db!(pos_integer()) :: Tournament.t() | no_return()
  def get_from_db!(id) do
    case get_from_db(id) do
      nil -> raise Ecto.NoResultsError
      tournament -> tournament
    end
  end

  def list_live_and_finished(user) do
    (get_live_tournaments() ++ get_db_tournaments(["finished"]))
    |> Enum.filter(fn tournament ->
      Tournament.Helpers.can_access?(tournament, user, %{})
    end)
  end

  def get_db_tournaments(states) do
    from(
      t in Tournament,
      order_by: [desc: t.id],
      where: t.state in ^states,
      limit: 7,
      preload: [:creator]
    )
    |> Codebattle.Repo.all()
  end

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

  def get_live_tournaments_count, do: get_live_tournaments() |> Enum.count()

  def validate(params, tournament \\ %Tournament{}) do
    tournament
    |> Tournament.changeset(params)
    |> Map.put(:action, :validate)
  end

  def create(params) do
    changeset = %Tournament{} |> Tournament.changeset(prepare_tournament_params(params))
    alive_count = get_live_tournaments_count()

    if alive_count < @max_alive_tournaments do
      changeset
      |> Codebattle.Repo.insert()
      |> case do
        {:ok, tournament} ->
          {:ok, _pid} =
            tournament
            |> add_module
            |> mark_as_live
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

  @spec send_event(Tournament.t() | pos_integer(), atom(), map()) :: :ok
  def send_event(%Tournament{id: id}, event_type, params) do
    send_event(id, event_type, params)
  end

  def send_event(tournament_id, event_type, params) do
    Tournament.Server.handle_event(tournament_id, event_type, params)
  end

  @spec update(Tournament.t(), map()) :: {:ok, Tournament.t()} | {:error, Ecto.Changeset.t()}
  def update(tournament, params) do
    tournament
    |> Tournament.changeset(prepare_tournament_params(params))
    |> Codebattle.Repo.update()
    |> case do
      {:ok, tournament} ->
        Tournament.Server.update_tournament(tournament)
        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def restart(tournament) do
    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
    Tournament.GlobalSupervisor.start_tournament(tournament)
  end

  defp prepare_tournament_params(params) do
    starts_at = params["starts_at"] && NaiveDateTime.from_iso8601!(params["starts_at"] <> ":00")
    match_timeout_seconds = params["match_timeout_seconds"] || "180"

    meta = get_meta_from_params(params)

    access_token =
      case params["access_type"] do
        "token" -> generate_access_token()
        _ -> nil
      end

    Map.merge(params, %{
      "access_token" => access_token,
      "match_timeout_seconds" => match_timeout_seconds,
      "starts_at" => starts_at,
      "meta" => meta
    })
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

      "stairway" ->
        rounds = params |> Map.get("rounds_limit", "3") |> String.to_integer()
        %{rounds_limit: rounds}

      _ ->
        %{}
    end
  end

  def get_tournament_for_restore() do
    @states_from_restore
    |> get_db_tournaments()
    |> Enum.map(fn tournament ->
      tournament
      |> add_module
      |> mark_as_live
    end)
  end

  def mark_as_live(tournament), do: Map.put(tournament, :is_live, true)

  defp get_module(%{type: "team"}), do: Tournament.Team
  defp get_module(%{"type" => "team"}), do: Tournament.Team
  defp get_module(%{type: "stairway"}), do: Tournament.Stairway
  defp get_module(%{"type" => "stairway"}), do: Tournament.Stairway
  defp get_module(_), do: Tournament.Individual

  defp add_module(tournament), do: Map.put(tournament, :module, get_module(tournament))

  defp generate_access_token() do
    :crypto.strong_rand_bytes(17) |> Base.url_encode64() |> binary_part(0, 17)
  end
end
