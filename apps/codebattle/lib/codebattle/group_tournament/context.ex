defmodule Codebattle.GroupTournament.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTaskRun
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.GlobalSupervisor
  alias Codebattle.GroupTournament.Server
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.GroupTournamentToken
  alias Codebattle.Repo

  @spec list_group_tournaments() :: list(GroupTournament.t())
  def list_group_tournaments do
    GroupTournament
    |> order_by([gt], desc: gt.id)
    |> preload([:creator, :group_task, :players])
    |> Repo.all()
    |> Enum.map(&enrich/1)
  end

  @spec get_group_tournament!(String.t() | pos_integer()) :: GroupTournament.t()
  def get_group_tournament!(id) do
    GroupTournament
    |> Repo.get!(id)
    |> Repo.preload([:creator, :group_task, players: [:user]])
    |> enrich()
  end

  @spec get_group_tournament(String.t() | pos_integer()) :: GroupTournament.t() | nil
  def get_group_tournament(id) do
    get_group_tournament!(id)
  rescue
    Ecto.NoResultsError -> nil
  end

  @spec create_group_tournament(map()) :: {:ok, GroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def create_group_tournament(attrs) do
    case %GroupTournament{} |> GroupTournament.changeset(attrs) |> Repo.insert() do
      {:ok, group_tournament} ->
        enriched = get_group_tournament!(group_tournament.id)
        :ok = ensure_server_started(enriched)
        {:ok, enriched}

      error ->
        error
    end
  end

  @spec update_group_tournament(GroupTournament.t(), map()) ::
          {:ok, GroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def update_group_tournament(group_tournament, attrs) do
    case group_tournament |> GroupTournament.changeset(attrs) |> Repo.update() do
      {:ok, updated} ->
        enriched = get_group_tournament!(updated.id)
        :ok = ensure_server_started(enriched)
        Server.update_group_tournament(enriched)
        {:ok, enriched}

      error ->
        error
    end
  end

  @spec change_group_tournament(GroupTournament.t(), map()) :: Ecto.Changeset.t()
  def change_group_tournament(group_tournament, attrs \\ %{}) do
    GroupTournament.changeset(group_tournament, attrs)
  end

  @spec confirm_invitation(pos_integer(), map()) ::
          {:ok, GroupTournament.t()} | {:error, atom()}
  def confirm_invitation(group_tournament_id, user) do
    :ok = ensure_server_started(group_tournament_id)
    Server.confirm_invitation(group_tournament_id, user)
  end

  @spec delete_group_tournament(GroupTournament.t()) ::
          {:ok, GroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def delete_group_tournament(group_tournament) do
    GlobalSupervisor.terminate_group_tournament(group_tournament.id)
    Repo.delete(group_tournament)
  end

  @spec reset_group_tournament(GroupTournament.t()) ::
          {:ok, GroupTournament.t()} | {:error, term()}
  def reset_group_tournament(%GroupTournament{} = group_tournament) do
    result =
      Repo.transaction(fn ->
        player_ids = Enum.map(group_tournament.players, & &1.user_id)

        GroupTournamentToken
        |> where([token], token.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        GroupTaskRun
        |> where([run], run.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        if player_ids != [] do
          GroupTaskSolution
          |> where(
            [solution],
            solution.group_task_id == ^group_tournament.group_task_id and solution.user_id in ^player_ids
          )
          |> Repo.delete_all()
        end

        GroupTournamentPlayer
        |> where([player], player.group_tournament_id == ^group_tournament.id)
        |> Repo.delete_all()

        group_tournament
        |> GroupTournament.changeset(%{
          state: "waiting_participants",
          starts_at: reset_starts_at(group_tournament.starts_at),
          started_at: nil,
          finished_at: nil,
          current_round_position: 0,
          last_round_started_at: nil,
          last_round_ended_at: nil,
          meta: %{}
        })
        |> Repo.update!()
      end)

    case result do
      {:ok, updated} ->
        enriched = get_group_tournament!(updated.id)
        :ok = ensure_server_started(enriched)
        Server.update_group_tournament(enriched)
        {:ok, enriched}

      error ->
        error
    end
  end

  @spec create_or_update_player(GroupTournament.t(), pos_integer(), map()) ::
          {:ok, GroupTournamentPlayer.t()} | {:error, Ecto.Changeset.t()}
  def create_or_update_player(%GroupTournament{id: group_tournament_id}, user_id, attrs) do
    params =
      attrs
      |> Map.new()
      |> Map.put(:group_tournament_id, group_tournament_id)
      |> Map.put(:user_id, user_id)

    case Repo.get_by(GroupTournamentPlayer, group_tournament_id: group_tournament_id, user_id: user_id) do
      nil ->
        %GroupTournamentPlayer{}
        |> GroupTournamentPlayer.changeset(params)
        |> Repo.insert()

      player ->
        player
        |> GroupTournamentPlayer.changeset(params)
        |> Repo.update()
    end
  end

  @spec list_runs(GroupTournament.t() | pos_integer(), keyword()) :: list(GroupTaskRun.t())
  def list_runs(group_tournament_or_id, opts \\ [])

  def list_runs(%GroupTournament{id: id}, opts), do: list_runs(id, opts)

  def list_runs(group_tournament_id, opts) do
    limit = Keyword.get(opts, :limit, 50)

    GroupTaskRun
    |> where([run], run.group_tournament_id == ^group_tournament_id)
    |> order_by([run], desc: run.inserted_at, desc: run.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec list_tokens(GroupTournament.t() | pos_integer(), keyword()) :: list(GroupTournamentToken.t())
  def list_tokens(group_tournament_or_id, opts \\ [])

  def list_tokens(%GroupTournament{id: id}, opts), do: list_tokens(id, opts)

  def list_tokens(group_tournament_id, opts) do
    limit = Keyword.get(opts, :limit, 100)

    GroupTournamentToken
    |> where([token], token.group_tournament_id == ^group_tournament_id)
    |> preload(:user)
    |> order_by([token], desc: token.updated_at, desc: token.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec create_or_rotate_token(GroupTournament.t() | pos_integer(), pos_integer()) ::
          {:ok, GroupTournamentToken.t()} | {:error, Ecto.Changeset.t()}
  def create_or_rotate_token(%GroupTournament{id: id}, user_id), do: create_or_rotate_token(id, user_id)

  def create_or_rotate_token(group_tournament_id, user_id) do
    token_value = generate_token()

    case Repo.get_by(GroupTournamentToken, group_tournament_id: group_tournament_id, user_id: user_id) do
      nil ->
        %GroupTournamentToken{}
        |> GroupTournamentToken.changeset(%{
          group_tournament_id: group_tournament_id,
          user_id: user_id,
          token: token_value
        })
        |> Repo.insert()

      token ->
        token
        |> GroupTournamentToken.changeset(%{token: token_value})
        |> Repo.update()
    end
  end

  @spec get_token_by_value(String.t()) :: GroupTournamentToken.t() | nil
  def get_token_by_value(token) when is_binary(token) do
    token = String.trim(token)

    GroupTournamentToken
    |> preload(group_tournament: :group_task)
    |> Repo.get_by(token: token)
  end

  def get_token_by_value(_token), do: nil

  @spec create_solution_from_token(String.t(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, :invalid_token | Ecto.Changeset.t()}
  def create_solution_from_token(token, attrs) do
    case get_token_by_value(token) do
      nil ->
        {:error, :invalid_token}

      %{group_tournament: %{group_task_id: group_task_id}} = token_record ->
        GroupTaskContext.create_solution(group_task_id, token_record.user_id, attrs)
    end
  end

  @spec get_current(pos_integer()) :: GroupTournament.t() | nil
  def get_current(id) do
    case Server.get_group_tournament(id) do
      nil -> get_group_tournament(id)
      group_tournament -> enrich(group_tournament)
    end
  end

  @spec ensure_server_started(GroupTournament.t() | pos_integer() | String.t()) :: :ok
  def ensure_server_started(%GroupTournament{id: id} = group_tournament) do
    case Server.get_group_tournament(id) do
      nil ->
        case GlobalSupervisor.start_group_tournament(group_tournament) do
          {:ok, _pid} -> :ok
          {:error, {:already_started, _pid}} -> :ok
          {:error, :already_present} -> :ok
          {:error, {:already_present, _pid}} -> :ok
          _ -> :ok
        end

      _group_tournament ->
        :ok
    end
  end

  def ensure_server_started(id) do
    id
    |> get_group_tournament!()
    |> ensure_server_started()
  end

  defp enrich(%GroupTournament{} = group_tournament) do
    Map.put(group_tournament, :players_count, length(group_tournament.players || []))
  end

  defp reset_starts_at(%DateTime{} = starts_at) do
    now = DateTime.utc_now()

    case DateTime.compare(starts_at, now) do
      :gt -> starts_at
      _ -> DateTime.add(now, 5 * 60, :second)
    end
  end

  defp generate_token do
    32
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end
end
