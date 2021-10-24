defmodule Codebattle.Tournament.Context do
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.TaskPack

  import Ecto.Query

  @states_from_restore ["upcoming", "waiting_participants"]

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

  defp get_from_db!(id) do
    id
    |> tournament_query()
    |> Codebattle.Repo.one!()
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
      preload: [:creator, :task_pack]
    )
    |> Codebattle.Repo.all()
  end

  def get_live_tournaments do
    Tournament.GlobalSupervisor
    |> Supervisor.which_children()
    |> Enum.map(fn {id, _, _, _} -> id end)
    |> Enum.map(fn id -> Tournament.Server.get_tournament(id) end)
    |> Enum.filter(&Function.identity/1)
    |> Enum.filter(fn tournament ->
      tournament.state in ["upcoming", "waiting_participants", "active"]
    end)
  end

  def get_live_tournaments_count, do: get_live_tournaments() |> Enum.count()

  def validate(params) do
    %Tournament{}
    |> Tournament.changeset(params)
    |> Map.put(:action, :insert)
  end

  def create(params) do
    starts_at = NaiveDateTime.from_iso8601!(params["starts_at"] <> ":00")
    match_timeout_seconds = params["match_timeout_seconds"] || "180"

    meta =
      case params["type"] do
        "team" ->
          team_1_name = Utils.presence(params["team_1_name"]) || "Backend"
          team_2_name = Utils.presence(params["team_2_name"]) || "Frontend"

          %{
            teams: [
              %{id: 0, title: team_1_name},
              %{id: 1, title: team_2_name}
            ]
          }

        _ ->
          %{}
      end

    access_token =
      case params["access_type"] do
        "token" -> generate_access_token()
        _ -> nil
      end

    task_pack =
      case params["task_pack_id"] do
        x when x in [nil, ""] -> nil
        task_pack_id -> TaskPack.get!(task_pack_id)
      end

    result =
      %Tournament{}
      |> Tournament.changeset(
        Map.merge(params, %{
          "task_pack_id" => params["task_pack_id"],
          "task_pack" => task_pack,
          "access_token" => access_token,
          "alive_count" => get_live_tournaments_count(),
          "match_timeout_seconds" => match_timeout_seconds,
          "starts_at" => starts_at,
          "step" => 0,
          "meta" => meta,
          "data" => %{}
        })
      )
      |> Codebattle.Repo.insert()

    case result do
      {:ok, tournament} ->
        {:ok, _pid} =
          tournament
          |> add_module
          |> mark_as_live
          |> Tournament.GlobalSupervisor.start_tournament()

        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
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

  defp tournament_query(id) do
    from(
      t in Tournament,
      where: t.id == ^id,
      preload: [:creator, :task_pack]
    )
  end

  defp get_module(%{type: "team"}), do: Tournament.Team
  defp get_module(%{"type" => "team"}), do: Tournament.Team
  defp get_module(%{type: "stairway"}), do: Tournament.Stairway
  defp get_module(%{"type" => "stairway"}), do: Tournament.Stairway
  defp get_module(_), do: Tournament.Individual

  defp add_module(tournament), do: Map.put(tournament, :module, get_module(tournament))

  defp mark_as_live(tournament), do: Map.put(tournament, :is_live, true)

  defp generate_access_token() do
    :crypto.strong_rand_bytes(17) |> Base.url_encode64() |> binary_part(0, 17)
  end
end
