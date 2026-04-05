defmodule Codebattle.GroupTask.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.GroupTask
  alias Codebattle.GroupTaskRun
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTaskToken
  alias Codebattle.Repo

  require Logger

  @group_task_runner_receive_timeout_ms 180_000
  @group_task_runner_connect_timeout_ms 30_000

  @admin_recent_tokens_limit 100
  @admin_recent_runs_limit 50
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

  @spec get_group_task(String.t() | pos_integer()) :: GroupTask.t() | nil
  def get_group_task(id) do
    Repo.get(GroupTask, id)
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

  @spec get_solution!(String.t() | pos_integer()) :: GroupTaskSolution.t()
  def get_solution!(id) do
    Repo.get!(GroupTaskSolution, id)
  end

  @spec get_latest_solution(pos_integer(), pos_integer()) :: GroupTaskSolution.t() | nil
  def get_latest_solution(group_task_id, user_id) do
    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id and solution.user_id == ^user_id)
    |> preload(:user)
    |> order_by([solution], desc: solution.id)
    |> limit(1)
    |> Repo.one()
  end

  @spec list_user_solutions(pos_integer(), pos_integer(), keyword()) :: list(GroupTaskSolution.t())
  def list_user_solutions(group_task_id, user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, @admin_recent_solutions_limit)

    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id and solution.user_id == ^user_id)
    |> preload(:user)
    |> order_by([solution], desc: solution.inserted_at, desc: solution.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec create_solution(pos_integer(), pos_integer(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, Ecto.Changeset.t()}
  def create_solution(group_task_id, user_id, attrs) do
    params = %{
      user_id: user_id,
      group_task_id: group_task_id,
      lang: Map.get(attrs, "lang") || Map.get(attrs, :lang),
      solution: Map.get(attrs, "solution") || Map.get(attrs, :solution)
    }

    %GroupTaskSolution{}
    |> GroupTaskSolution.changeset(params)
    |> Repo.insert()
  end

  @spec list_latest_solutions(pos_integer(), list(pos_integer())) :: list(GroupTaskSolution.t())
  def list_latest_solutions(group_task_id, player_ids) do
    do_list_latest_solutions(group_task_id, player_ids)
  end

  @spec change_solution(GroupTaskSolution.t(), map()) :: Ecto.Changeset.t()
  def change_solution(solution, attrs \\ %{}) do
    GroupTaskSolution.changeset(solution, attrs)
  end

  @spec update_solution(GroupTaskSolution.t(), map()) ::
          {:ok, GroupTaskSolution.t()} | {:error, Ecto.Changeset.t()}
  def update_solution(solution, attrs) do
    solution
    |> GroupTaskSolution.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_solution(GroupTaskSolution.t()) ::
          {:ok, GroupTaskSolution.t()} | {:error, Ecto.Changeset.t()}
  def delete_solution(solution) do
    Repo.delete(solution)
  end

  @spec list_runs(GroupTask.t() | pos_integer(), keyword()) :: list(GroupTaskRun.t())
  def list_runs(group_task_or_id, opts \\ [])
  def list_runs(%GroupTask{id: group_task_id}, opts), do: list_runs(group_task_id, opts)

  def list_runs(group_task_id, opts) do
    limit = Keyword.get(opts, :limit, @admin_recent_runs_limit)

    GroupTaskRun
    |> where([run], run.group_task_id == ^group_task_id)
    |> order_by([run], desc: run.inserted_at, desc: run.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec get_run!(String.t() | pos_integer()) :: GroupTaskRun.t()
  def get_run!(id) do
    Repo.get!(GroupTaskRun, id)
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
        create_solution(group_task_token, attrs)
    end
  end

  @spec run_group_task(GroupTask.t(), list(pos_integer()), map()) ::
          {:ok, GroupTaskRun.t()} | {:error, Ecto.Changeset.t()}
  def run_group_task(%GroupTask{} = group_task, player_ids, attrs \\ %{}) do
    normalized_player_ids = normalize_player_ids(player_ids)

    case create_pending_run(group_task, normalized_player_ids, attrs) do
      {:ok, group_task_run} ->
        case build_run_payload(group_task, normalized_player_ids, attrs) do
          {:ok, payload} ->
            run_result = execute_run(group_task.runner_url, payload)
            persist_group_task_run_result(group_task_run, run_result)

          {:run_error, result} ->
            persist_group_task_run_result(group_task_run, {:run_error, result})
        end

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}
    end
  end

  defp create_solution(group_task_token, attrs) do
    params = %{
      user_id: group_task_token.user_id,
      group_task_id: group_task_token.group_task_id,
      lang: Map.get(attrs, "lang") || Map.get(attrs, :lang)
    }

    case decode_solution(Map.get(attrs, "solution") || Map.get(attrs, :solution)) do
      {:ok, decoded_solution} ->
        %GroupTaskSolution{}
        |> GroupTaskSolution.changeset(Map.put(params, :solution, decoded_solution))
        |> Repo.insert()

      :error ->
        {:error, invalid_solution_encoding_changeset(params)}
    end
  end

  defp decode_solution(solution) when is_binary(solution) do
    case Base.decode64(String.trim(solution)) do
      {:ok, decoded_solution} -> {:ok, decoded_solution}
      :error -> :error
    end
  end

  defp decode_solution(_solution), do: :error

  defp invalid_solution_encoding_changeset(params) do
    %GroupTaskSolution{}
    |> GroupTaskSolution.changeset(Map.put(params, :solution, "placeholder"))
    |> Ecto.Changeset.delete_change(:solution)
    |> Ecto.Changeset.add_error(:solution, "is invalid base64")
  end

  defp generate_token do
    32
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end

  defp create_pending_run(group_task, player_ids, attrs) do
    %GroupTaskRun{}
    |> GroupTaskRun.changeset(%{
      group_task_id: group_task.id,
      group_tournament_id: Map.get(attrs, :group_tournament_id) || Map.get(attrs, "group_tournament_id"),
      player_ids: player_ids,
      status: "pending",
      result: %{}
    })
    |> Repo.insert()
  end

  defp build_run_payload(%GroupTask{} = group_task, player_ids, attrs) do
    latest_solutions = do_list_latest_solutions(group_task.id, player_ids)
    solution_user_ids = MapSet.new(Enum.map(latest_solutions, & &1.user_id))
    missing_player_ids = Enum.reject(player_ids, &MapSet.member?(solution_user_ids, &1))

    if missing_player_ids == [] do
      {:ok,
       %{
         include_bots: Map.get(attrs, :include_bots) || Map.get(attrs, "include_bots") || false,
         include_viewer_html: true,
         solutions:
           Enum.map(latest_solutions, fn solution ->
             %{
               lang: solution.lang,
               name: solution.user && solution.user.name,
               player_id: solution.user_id,
               solution: solution.solution
             }
           end)
       }}
    else
      {:run_error,
       %{
         "error" => "solutions_not_found",
         "missing_player_ids" => missing_player_ids
       }}
    end
  end

  defp execute_run(nil, _payload), do: {:run_error, %{"error" => "runner_url_not_configured"}}
  defp execute_run("", _payload), do: {:run_error, %{"error" => "runner_url_not_configured"}}

  defp execute_run(runner_url, payload) do
    request_url = build_runner_run_url(runner_url)

    Logger.debug(fn ->
      "GroupTask runner request url=#{request_url} payload=#{inspect(payload, pretty: true, limit: :infinity)}"
    end)

    case runner_http_client().post(request_url,
           json: payload,
           headers: [{"content-type", "application/json"}],
           receive_timeout: @group_task_runner_receive_timeout_ms,
           connect_options: [timeout: @group_task_runner_connect_timeout_ms]
         ) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        result = normalize_result_body(body)

        Logger.debug(fn ->
          "GroupTask runner success url=#{request_url} result=#{inspect(result, pretty: true, limit: :infinity)}"
        end)

        {:ok, result}

      {:ok, %Req.Response{status: status, body: body}} ->
        result = %{
          "error" => "runner_request_failed",
          "status" => status,
          "body" => normalize_result_body(body)
        }

        Logger.debug(fn ->
          "GroupTask runner failure url=#{request_url} result=#{inspect(result, pretty: true, limit: :infinity)}"
        end)

        {:run_error, result}

      {:error, reason} ->
        result = %{
          "error" => "runner_request_failed",
          "reason" => inspect(reason)
        }

        Logger.debug(fn ->
          "GroupTask runner transport failure url=#{request_url} result=#{inspect(result, pretty: true, limit: :infinity)}"
        end)

        {:run_error, result}
    end
  end

  defp do_list_latest_solutions(group_task_id, player_ids) do
    GroupTaskSolution
    |> where([solution], solution.group_task_id == ^group_task_id and solution.user_id in ^player_ids)
    |> preload(:user)
    |> distinct([solution], solution.user_id)
    |> order_by([solution], asc: solution.user_id, desc: solution.id)
    |> Repo.all()
  end

  defp normalize_player_ids(player_ids) do
    player_ids
    |> Enum.filter(&(is_integer(&1) and &1 > 0))
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp persist_group_task_run_result(group_task_run, {:ok, result}) do
    group_task_run
    |> GroupTaskRun.changeset(%{status: "success", result: result})
    |> Repo.update()
  end

  defp persist_group_task_run_result(group_task_run, {:run_error, result}) do
    group_task_run
    |> GroupTaskRun.changeset(%{status: "error", result: result})
    |> Repo.update()
  end

  defp normalize_result_body(body) when is_map(body), do: body
  defp normalize_result_body(body), do: %{"body" => body}

  defp build_runner_run_url(runner_url) do
    trimmed_runner_url =
      runner_url
      |> String.trim()
      |> String.trim_trailing("/")

    if String.ends_with?(trimmed_runner_url, "/run") do
      trimmed_runner_url
    else
      trimmed_runner_url <> "/run"
    end
  end

  defp runner_http_client do
    Application.get_env(:codebattle, :group_task_runner_http_client, Req)
  end
end
