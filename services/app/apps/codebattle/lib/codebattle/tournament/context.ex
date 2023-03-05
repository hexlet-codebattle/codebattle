defmodule Codebattle.Tournament.Context do
  # alias Codebattle.TaskPack

  alias Codebattle.Tournament

  import Ecto.Query

  @states_from_restore ["waiting_participants"]

  def get(id) do
    case Tournament.Server.get_tournament(id) do
      nil -> get_from_db(id)
      tournament -> {:ok, tournament}
    end
  end

  def get!(id) do
    case Tournament.Server.get_tournament(id) do
      nil -> get_from_db!(id)
      tournament -> tournament
    end
  end

  def get_from_db!(id) do
    Tournament
    |> Codebattle.Repo.get!(id)
    |> Codebattle.Repo.preload([:creator])
    |> add_module()
  end

  defp get_from_db(id) do
    q = tournament_query(id)

    case Codebattle.Repo.one(q) do
      nil -> {:error, :not_found}
      t -> {:ok, add_module(t)}
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
      {:ok, tournament} ->
        tournament.state in ["waiting_participants", "active"]

      _ ->
        false
    end)
    |> Enum.map(fn {:ok, tournament} -> tournament end)
  end

  def get_live_tournaments_count, do: get_live_tournaments() |> Enum.count()

  def validate(params) do
    %Tournament{}
    |> Tournament.changeset(params)
    |> Map.put(:action, :insert)
  end

  def create(params) do
    %Tournament{}
    |> Tournament.changeset(prepare_tournament_params(params))
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
  end

  def restart(tournament) do
    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
    Tournament.GlobalSupervisor.start_tournament(tournament)
  end

  defp prepare_tournament_params(params) do
    starts_at = NaiveDateTime.from_iso8601!(params["starts_at"] <> ":00")
    match_timeout_seconds = params["match_timeout_seconds"] || "180"

    meta = get_meta_from_params(params)

    access_token =
      case params["access_type"] do
        "token" -> generate_access_token()
        _ -> nil
      end

    # task_pack =
    #   case params["task_pack_name"] do
    #     x when x in [nil, ""] -> nil
    #     task_pack_name -> TaskPack.get_by!(name: task_pack_name)
    #   end

    Map.merge(params, %{
      # "task_pack_id" => task_pack && task_pack.id,
      # "task_pack" => task_pack,
      "access_token" => access_token,
      "alive_count" => get_live_tournaments_count(),
      "match_timeout_seconds" => match_timeout_seconds,
      "starts_at" => starts_at,
      "current_round" => 0,
      "meta" => meta,
      "players" => %{},
      "matches" => %{}
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

  defp tournament_query(id) do
    from(
      t in Tournament,
      where: t.id == ^id,
      preload: [:creator]
    )
  end

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
