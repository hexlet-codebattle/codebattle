defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias __MODULE__
  alias Tournament.Types

  @derive {Poison.Encoder, only: [:id, :type, :name, :state, :starts_at, :players_count, :data]}

  @types ~w(individual team)
  @states ~w(waiting_participants canceled active finished)
  @starts_at_types ~w(1_min 5_min 10_min 30_min)

  schema "tournaments" do
    field(:name, :string)
    field(:type, :string, default: "individual")
    field(:state, :string, default: "waiting_participants")
    field(:players_count, :integer, default: 16)
    field(:step, :integer, default: 0)
    field(:starts_at, :naive_datetime)
    field(:starts_at_type, :string, virtual: true, default: "5_min")
    field(:meta, :map, default: %{})
    field(:module, :any, virtual: true, default: Tournament.Individual)
    embeds_one(:data, Types.Data, on_replace: :delete)

    belongs_to(:creator, Codebattle.User)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :type, :step, :state, :starts_at, :players_count, :creator_id, :meta])
    |> cast_embed(:data)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:starts_at_type, @starts_at_types)
    |> validate_required([:name, :players_count, :creator_id, :starts_at])
  end

  def add_module(tournament) do
    Map.put(tournament, :module, get_module(tournament))
  end

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
    query =
      from(
        t in Tournament,
        order_by: [desc: t.inserted_at],
        preload: :creator
      )

    Codebattle.Repo.all(query)
  end

  def types, do: @types
  def starts_at_types, do: @starts_at_types

  def get_live_tournaments do
    query =
      from(
        t in Tournament,
        order_by: [desc: t.id],
        where: t.state in ["waiting_participants", "active"],
        preload: :creator,
        limit: 5
      )

    Codebattle.Repo.all(query)
  end

  def create(params) do
    now = NaiveDateTime.utc_now()

    starts_at =
      case params["starts_at_type"] do
        "1_min" -> NaiveDateTime.add(now, 1 * 60)
        "5_min" -> NaiveDateTime.add(now, 5 * 60)
        "10_min" -> NaiveDateTime.add(now, 10 * 60)
        "30_min" -> NaiveDateTime.add(now, 30 * 60)
        _ -> NaiveDateTime.add(now, 60 * 60)
      end

    meta =
      case params["type"] do
        "team" ->
          %{
            teams: [
              %{id: 0, title: "frontend"},
              %{id: 1, title: "backend"}
            ]
          }

        _ ->
          %{}
      end

    result =
      %Tournament{}
      |> Tournament.changeset(
        Map.merge(params, %{"starts_at" => starts_at, "step" => 0, "meta" => meta, "data" => %{}})
      )
      |> Codebattle.Repo.insert()

    case result do
      {:ok, tournament} ->
        {:ok, _pid} =
          tournament
          |> add_module
          |> Tournament.Supervisor.start_tournament()

        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp get_module(%{type: "team"}), do: Tournament.Team
  defp get_module(%{"type" => "team"}), do: Tournament.Team
  defp get_module(_), do: Tournament.Individual
end
