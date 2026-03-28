defmodule Codebattle.GroupTask.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.GroupTask
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTaskToken
  alias Codebattle.Repo

  @admin_recent_tokens_limit 100
  @admin_recent_solutions_limit 100

  @spec list_group_tasks() :: list(GroupTask.t())
  def list_group_tasks do
    GroupTask
    |> order_by([gt], asc: gt.slug)
    |> Repo.all()
  end

  @spec get_group_task!(String.t() | pos_integer()) :: GroupTask.t()
  def get_group_task!(id) do
    Repo.get!(GroupTask, id)
  end

  @spec create_group_task(map()) :: {:ok, GroupTask.t()} | {:error, Ecto.Changeset.t()}
  def create_group_task(attrs) do
    %GroupTask{}
    |> GroupTask.changeset(attrs)
    |> Repo.insert()
  end

  @spec update_group_task(GroupTask.t(), map()) :: {:ok, GroupTask.t()} | {:error, Ecto.Changeset.t()}
  def update_group_task(group_task, attrs) do
    group_task
    |> GroupTask.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_group_task(GroupTask.t()) :: {:ok, GroupTask.t()} | {:error, Ecto.Changeset.t()}
  def delete_group_task(group_task) do
    Repo.delete(group_task)
  end

  @spec change_group_task(GroupTask.t(), map()) :: Ecto.Changeset.t()
  def change_group_task(group_task, attrs \\ %{}) do
    GroupTask.changeset(group_task, attrs)
  end

  @spec list_tokens(GroupTask.t() | pos_integer(), keyword()) :: list(GroupTaskToken.t())
  def list_tokens(group_task_or_id, opts \\ [])
  def list_tokens(%GroupTask{id: group_task_id}, opts), do: list_tokens(group_task_id, opts)

  def list_tokens(group_task_id, opts) do
    limit = Keyword.get(opts, :limit, @admin_recent_tokens_limit)

    GroupTaskToken
    |> where([token], token.group_task_id == ^group_task_id)
    |> preload(:user)
    |> order_by([token], desc: token.updated_at, desc: token.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec list_solutions(GroupTask.t() | pos_integer(), keyword()) :: list(GroupTaskSolution.t())
  def list_solutions(group_task_or_id, opts \\ [])
  def list_solutions(%GroupTask{id: group_task_id}, opts), do: list_solutions(group_task_id, opts)

  def list_solutions(group_task_id, opts) do
    limit = Keyword.get(opts, :limit, @admin_recent_solutions_limit)

    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id)
    |> preload(:user)
    |> order_by([solution], desc: solution.inserted_at, desc: solution.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec create_or_rotate_token(GroupTask.t() | pos_integer(), pos_integer()) ::
          {:ok, GroupTaskToken.t()} | {:error, Ecto.Changeset.t()}
  def create_or_rotate_token(%GroupTask{id: group_task_id}, user_id), do: create_or_rotate_token(group_task_id, user_id)

  def create_or_rotate_token(group_task_id, user_id) do
    token_value = generate_token()

    case Repo.get_by(GroupTaskToken, group_task_id: group_task_id, user_id: user_id) do
      nil ->
        %GroupTaskToken{}
        |> GroupTaskToken.changeset(%{
          group_task_id: group_task_id,
          user_id: user_id,
          token: token_value
        })
        |> Repo.insert()

      group_task_token ->
        group_task_token
        |> GroupTaskToken.changeset(%{token: token_value})
        |> Repo.update()
    end
  end

  @spec get_token_by_value(String.t()) :: GroupTaskToken.t() | nil
  def get_token_by_value(token) when is_binary(token) do
    token = String.trim(token)

    GroupTaskToken
    |> preload(:group_task)
    |> Repo.get_by(token: token)
  end

  def get_token_by_value(_token), do: nil

  @spec create_solution_from_token(String.t(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, :invalid_token | Ecto.Changeset.t()}
  def create_solution_from_token(token, attrs) do
    case get_token_by_value(token) do
      nil ->
        {:error, :invalid_token}

      group_task_token ->
        %GroupTaskSolution{}
        |> GroupTaskSolution.changeset(%{
          user_id: group_task_token.user_id,
          group_task_id: group_task_token.group_task_id,
          solution: Map.get(attrs, "solution") || Map.get(attrs, :solution),
          lang: Map.get(attrs, "lang") || Map.get(attrs, :lang)
        })
        |> Repo.insert()
    end
  end

  defp generate_token do
    32
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end
end
