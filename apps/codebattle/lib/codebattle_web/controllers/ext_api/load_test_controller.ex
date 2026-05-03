defmodule CodebattleWeb.ExtApi.LoadTestController do
  use CodebattleWeb, :controller

  import Ecto.Query
  import Plug.Conn

  alias Codebattle.GroupTask
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.GroupTournament.Server, as: GroupTournamentServer
  alias Codebattle.Repo
  alias Codebattle.Task
  alias Codebattle.Tournament
  alias Codebattle.User

  # plug(CodebattleWeb.Plugs.TokenAuth)

  @default_user_count 10
  @default_user_lang "python"
  @ars_tournament_players_limit 26_000

  def create_scenario(conn, params) do
    with :ok <- ensure_load_tests_enabled(conn) do
      tournament_params = scenario_tournament_params(params)
      users_count = parse_positive_int(params["users_count"], @default_user_count)
      lang_mix = normalize_lang_mix(params["lang_mix"] || params["languages"])

      with {:ok, creator} <- find_or_create_creator(),
           {:ok, tournament} <- create_tournament(creator, tournament_params),
           {:ok, users} <- create_users(users_count, lang_mix) do
        json(conn, %{
          creator: %{
            id: creator.id,
            name: creator.name,
            user_token: sign_user_token(creator.id)
          },
          tournament: %{
            id: tournament.id,
            access_token: tournament.access_token,
            type: tournament.type,
            state: tournament.state
          },
          users:
            Enum.map(users, fn user ->
              %{
                user_id: user.id,
                name: user.name,
                lang: user.lang,
                user_token: sign_user_token(user.id)
              }
            end)
        })
      else
        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{errors: format_errors(changeset)})

        {:error, reason} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{error: inspect(reason)})
      end
    end
  end

  def create_group_scenario(conn, params) do
    with :ok <- ensure_load_tests_enabled(conn) do
      users_count = parse_positive_int(params["users_count"], @default_user_count)
      lang_mix = normalize_lang_mix(params["lang_mix"] || params["languages"])
      tournament_params = scenario_tournament_params(params)

      with {:ok, creator} <- find_or_create_creator(),
           {:ok, group_task} <- find_group_task(tournament_params["group_task_id"]),
           {:ok, group_task} <- maybe_update_runner_url(group_task, params["runner_url"]),
           {:ok, group_tournament} <- create_group_tournament(creator, group_task, tournament_params),
           {:ok, users} <- create_users(users_count, lang_mix),
           {:ok, users_with_tokens} <- transfer_and_issue_tokens(group_tournament, users) do
        json(conn, %{
          creator: %{
            id: creator.id,
            name: creator.name,
            user_token: sign_user_token(creator.id)
          },
          group_tournament: %{
            id: group_tournament.id,
            slug: group_tournament.slug,
            state: group_tournament.state,
            group_task_id: group_tournament.group_task_id,
            slice_size: group_tournament.slice_size,
            slice_strategy: group_tournament.slice_strategy
          },
          users: users_with_tokens
        })
      else
        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{errors: format_errors(changeset)})

        {:error, reason} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{error: inspect(reason)})
      end
    end
  end

  def start_group_scenario(conn, %{"id" => id}) do
    with :ok <- ensure_load_tests_enabled(conn),
         {:ok, group_tournament_id} <- parse_id(id),
         :ok <- GroupTournamentContext.ensure_server_started(group_tournament_id),
         {:ok, group_tournament} <- GroupTournamentServer.start_now(group_tournament_id) do
      json(conn, %{
        group_tournament: %{
          id: group_tournament.id,
          slug: group_tournament.slug,
          state: group_tournament.state
        }
      })
    else
      {:error, :invalid_id} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "invalid_id"})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: inspect(reason)})
    end
  end

  def task_solutions(conn, %{"id" => id}) do
    with :ok <- ensure_load_tests_enabled(conn) do
      Task
      |> Repo.get(id)
      |> render_task_solutions(conn)
    end
  end

  defp render_task_solutions(nil, conn) do
    conn
    |> put_status(:not_found)
    |> json(%{error: "task_not_found"})
  end

  defp render_task_solutions(task, conn) do
    case resolve_task_solutions(task.solutions) do
      {:ok, solutions} ->
        json(conn, %{
          task_id: task.id,
          task_name: task.name,
          solutions: solutions
        })

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: "task_solutions_unavailable",
          reason: reason,
          task_id: task.id
        })
    end
  end

  defp parse_id(id) when is_integer(id) and id > 0, do: {:ok, id}

  defp parse_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {parsed, ""} when parsed > 0 -> {:ok, parsed}
      _ -> {:error, :invalid_id}
    end
  end

  defp parse_id(_), do: {:error, :invalid_id}

  defp ensure_load_tests_enabled(conn) do
    if FunWithFlags.enabled?(:allow_load_tests_ext_api) do
      :ok
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "load_tests_disabled"})
      |> halt()
    end
  end

  defp find_or_create_creator do
    case Repo.one(from(u in User, where: u.subscription_type == :admin, limit: 1)) do
      nil ->
        %User{}
        |> User.changeset(%{
          name: "loadtest-admin",
          lang: "python",
          locale: "en",
          subscription_type: :admin
        })
        |> Repo.insert()

      user ->
        {:ok, user}
    end
  end

  defp create_tournament(creator, tournament_params) do
    params =
      %{
        "name" => "Load test swiss #{System.unique_integer([:positive])}",
        "description" => "Load test tournament",
        "type" => "swiss",
        "state" => "waiting_participants",
        "user_timezone" => "Etc/UTC",
        "starts_at" => default_starts_at(),
        "creator" => creator,
        "break_duration_seconds" => 0,
        "access_type" => "token"
      }
      |> Map.merge(tournament_params)
      |> Map.put("players_limit", @ars_tournament_players_limit)

    Tournament.Context.create(params)
  end

  defp create_users(users_count, lang_mix) do
    users =
      Enum.map(1..users_count, fn idx ->
        lang = Enum.at(lang_mix, rem(idx - 1, length(lang_mix)))

        attrs = %{
          name: "loadtest-user-#{System.unique_integer([:positive])}",
          external_oauth_id: "loadtest-#{System.unique_integer([:positive])}",
          lang: lang,
          locale: "en",
          subscription_type: :premium
        }

        %User{}
        |> User.changeset(attrs)
        |> Repo.insert()
      end)

    case Enum.split_with(users, &match?({:ok, _}, &1)) do
      {ok_users, []} ->
        {:ok, Enum.map(ok_users, fn {:ok, user} -> user end)}

      {_ok_users, errors} ->
        {:error, errors}
    end
  end

  defp maybe_update_runner_url(group_task, runner_url) when is_binary(runner_url) and runner_url != "" do
    if group_task.runner_url == runner_url do
      {:ok, group_task}
    else
      group_task
      |> Ecto.Changeset.change(runner_url: runner_url)
      |> Repo.update()
    end
  end

  defp maybe_update_runner_url(group_task, _runner_url), do: {:ok, group_task}

  defp find_group_task(nil) do
    case Repo.one(from(gt in GroupTask, order_by: [asc: gt.id], limit: 1)) do
      nil -> {:error, :no_group_task_available}
      group_task -> {:ok, group_task}
    end
  end

  defp find_group_task(id) do
    case Repo.get(GroupTask, id) do
      nil -> {:error, :group_task_not_found}
      group_task -> {:ok, group_task}
    end
  end

  defp create_group_tournament(creator, group_task, tournament_params) do
    params =
      Map.merge(
        %{
          "creator_id" => creator.id,
          "group_task_id" => group_task.id,
          "name" => "Load test group #{System.unique_integer([:positive])}",
          "slug" => "load-test-group-#{System.unique_integer([:positive])}",
          "description" => "Load test group tournament",
          "starts_at" => default_starts_at(),
          "rounds_count" => 1,
          "round_timeout_seconds" => 1200,
          "include_bots" => true
        },
        Map.delete(tournament_params, "group_task_id")
      )

    GroupTournamentContext.create_group_tournament(params)
  end

  defp transfer_and_issue_tokens(group_tournament, users) do
    transfer_payload =
      Enum.map(users, fn user ->
        %{id: user.id, lang: user.lang}
      end)

    :ok = GroupTournamentContext.bulk_transfer_players(group_tournament.id, transfer_payload)

    tokens =
      Enum.reduce_while(users, [], fn user, acc ->
        case GroupTournamentContext.create_or_rotate_token(group_tournament.id, user.id) do
          {:ok, record} ->
            entry = %{
              user_id: user.id,
              name: user.name,
              lang: user.lang,
              token: record.token,
              user_token: sign_user_token(user.id)
            }

            {:cont, [entry | acc]}

          {:error, changeset} ->
            {:halt, {:error, changeset}}
        end
      end)

    case tokens do
      {:error, _} = err -> err
      list -> {:ok, Enum.reverse(list)}
    end
  end

  defp resolve_task_solutions(nil), do: {:error, "empty_solution"}
  defp resolve_task_solutions(%{} = solutions) when map_size(solutions) == 0, do: {:error, "empty_solution"}

  defp resolve_task_solutions(%{} = solutions) do
    with {:ok, python} <- fetch_lang_solution(solutions, ["python", "py"]),
         {:ok, cpp} <- fetch_lang_solution(solutions, ["cpp", "c++"]) do
      {:ok,
       %{
         python: python,
         cpp: cpp
       }}
    else
      _ -> {:error, "expected_json_with_python_and_cpp"}
    end
  end

  defp resolve_task_solutions(_), do: {:error, "expected_json_with_python_and_cpp"}

  defp fetch_lang_solution(map, keys) do
    Enum.find_value(keys, {:error, :not_found}, fn key ->
      case Map.get(map, key) do
        text when is_binary(text) and text != "" -> {:ok, text}
        _ -> false
      end
    end)
  end

  defp sign_user_token(user_id) do
    Phoenix.Token.sign(%Phoenix.Socket{endpoint: CodebattleWeb.Endpoint}, "user_token", user_id)
  end

  defp scenario_tournament_params(params) do
    params
    |> Map.get("tournament", %{})
    |> Map.delete("creator")
  end

  defp parse_positive_int(nil, default), do: default
  defp parse_positive_int(value, _default) when is_integer(value) and value > 0, do: value

  defp parse_positive_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {result, ""} when result > 0 -> result
      _ -> default
    end
  end

  defp parse_positive_int(_value, default), do: default

  defp normalize_lang_mix(value) when is_list(value) and value != [] do
    value
    |> Enum.map(&normalize_lang/1)
    |> Enum.reject(&is_nil/1)
    |> case do
      [] -> [@default_user_lang]
      langs -> langs
    end
  end

  defp normalize_lang_mix(value) when is_binary(value) do
    value
    |> String.split(",", trim: true)
    |> normalize_lang_mix()
  end

  defp normalize_lang_mix(_value), do: [@default_user_lang]

  defp normalize_lang(value) when is_binary(value) do
    case String.downcase(String.trim(value)) do
      "" -> nil
      lang -> lang
    end
  end

  defp normalize_lang(_value), do: nil

  defp default_starts_at do
    DateTime.utc_now()
    |> DateTime.add(3600, :second)
    |> DateTime.to_naive()
    |> NaiveDateTime.truncate(:second)
    |> NaiveDateTime.to_iso8601()
    |> binary_part(0, 16)
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
