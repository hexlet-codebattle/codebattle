defmodule Codebattle.Tournament.Context do
  alias Codebattle.Tournament

  import Ecto.Query

  def get!(id) do
    case Tournament.Server.get_tournament(id) do
      nil -> get_from_db!(id)
      tournament -> tournament
    end
  end

  def get_from_db!(id) do
    tournament = Codebattle.Repo.get!(Tournament, id)
    add_module(tournament)
  end

  def all() do
    get_live_tournaments() ++ get_db_tournaments()
  end

  def get_db_tournaments do
    from(
      t in Tournament,
      order_by: [desc: t.inserted_at],
      where: t.state in ["finished"],
      limit: 7,
      preload: :creator
    )
    |> Codebattle.Repo.all()
  end

  def get_live_tournaments do
    Tournament.GlobalSupervisor
    |> DynamicSupervisor.which_children()
    |> Enum.map(fn {_, pid, _, _} -> Supervisor.which_children(pid) end)
    |> Enum.map(fn x ->
      Enum.filter(x, fn {module, _, _, _} -> module == Codebattle.Tournament.Server end)
    end)
    |> List.flatten()
    |> Enum.map(fn {_, pid, _, _} -> Tournament.Server.get_tournament(pid) end)
    |> Enum.filter(&Function.identity/1)
  end

  def get_live_tournaments_count do
    get_live_tournaments() |> Enum.count()
  end

  def create(params) do
    starts_after_in_minutes =
      params
      |> Map.get("starts_after_in_minutes", "5")
      |> String.to_integer()

    starts_at = NaiveDateTime.add(NaiveDateTime.utc_now(), starts_after_in_minutes * 60)
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

    result =
      %Tournament{}
      |> Tournament.changeset(
        Map.merge(params, %{
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
          |> Tournament.GlobalSupervisor.start_tournament()

        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp get_module(%{type: "team"}), do: Tournament.Team
  defp get_module(%{"type" => "team"}), do: Tournament.Team
  defp get_module(_), do: Tournament.Individual

  defp add_module(tournament) do
    Map.put(tournament, :module, get_module(tournament))
  end
end
