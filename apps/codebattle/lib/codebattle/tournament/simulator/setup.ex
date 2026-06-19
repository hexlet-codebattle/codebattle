defmodule Codebattle.Tournament.Simulator.Setup do
  @moduledoc """
  Selects the Top200 simulator players (ids 100_001..100_200) and joins them
  into a simulation tournament.

  These users are seeded once via `Codebattle.Tournament.Simulator.Names.insert_all/0`
  (run from a remote iex). The simulator only ever selects them by id range — it
  never creates them.
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Server, as: TournamentServer
  alias Codebattle.User

  require Logger

  @first_id 100_001
  @last_id 100_200

  @doc """
  Select the seeded simulator players (ids #{@first_id}..#{@last_id}).
  Returns `{:ok, users}` or `{:error, :no_simulator_users}`.
  """
  @spec create(map()) :: {:ok, [User.t()]} | {:error, term()}
  def create(_opts \\ %{}) do
    select_users()
  end

  @doc """
  Ensure the simulation tournament has all simulator users joined.
  Joins any that are missing. Tournament must be in `waiting_participants`.
  """
  @spec top_up_players(integer()) :: :ok | {:error, term()}
  def top_up_players(tournament_id) when is_integer(tournament_id) do
    with {:ok, users} <- select_users(),
         %{} = tournament <- Tournament.Context.get(tournament_id) do
      existing_ids = tournament |> Tournament.Helpers.get_players() |> MapSet.new(& &1.id)
      missing = Enum.reject(users, &MapSet.member?(existing_ids, &1.id))

      Logger.info(
        "simulator: top_up_players tournament=#{tournament_id} existing=#{MapSet.size(existing_ids)} missing=#{length(missing)}"
      )

      if missing == [] do
        :ok
      else
        join_users(tournament, missing)
      end
    end
  end

  defp select_users do
    case Repo.all(from(u in User, where: u.id >= @first_id and u.id <= @last_id, order_by: u.id)) do
      [] -> {:error, :no_simulator_users}
      users -> {:ok, users}
    end
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
