defmodule CodebattleWeb.ExtApi.LoadTestControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User

  setup do
    FunWithFlags.disable(:allow_load_tests_ext_api)

    on_exit(fn ->
      FunWithFlags.disable(:allow_load_tests_ext_api)
    end)

    :ok
  end

  describe "create_scenario/2" do
    test "checks auth", %{conn: conn} do
      assert conn
             |> post("/ext_api/load_tests/scenarios", %{})
             |> json_response(401)
    end

    test "returns forbidden when load tests are disabled", %{conn: conn} do
      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post("/ext_api/load_tests/scenarios", %{})
        |> json_response(403)

      assert response["error"] == "load_tests_disabled"
    end

    test "creates tournament and synthetic users", %{conn: conn} do
      FunWithFlags.enable(:allow_load_tests_ext_api)

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post("/ext_api/load_tests/scenarios", %{
          "users_count" => 3,
          "languages" => ["python", "cpp"],
          "tournament" => %{
            "name" => "Scenario tournament",
            "type" => "swiss"
          }
        })
        |> json_response(200)

      assert %{"tournament" => %{"id" => tournament_id, "access_token" => access_token}} = response
      assert is_integer(tournament_id)
      assert is_binary(access_token)
      assert length(response["users"]) == 3
      assert Enum.all?(response["users"], &is_binary(&1["user_token"]))

      tournament = Repo.get(Tournament, tournament_id)
      assert tournament.name == "Scenario tournament"
      assert tournament.players_limit == 26_000

      langs = Enum.map(response["users"], & &1["lang"])
      assert langs == ["python", "cpp", "python"]

      created_users = Enum.map(response["users"], &Repo.get(User, &1["user_id"]))

      assert Enum.all?(created_users, &String.starts_with?(&1.name, "loadtest-user-"))
    end
  end

  describe "create_group_scenario/2" do
    test "checks auth", %{conn: conn} do
      assert conn
             |> post("/ext_api/load_tests/group_scenarios", %{})
             |> json_response(401)
    end

    test "returns forbidden when load tests are disabled", %{conn: conn} do
      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post("/ext_api/load_tests/group_scenarios", %{})
        |> json_response(403)

      assert response["error"] == "load_tests_disabled"
    end

    test "creates group tournament with players and tokens", %{conn: conn} do
      FunWithFlags.enable(:allow_load_tests_ext_api)
      group_task = insert(:group_task)

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> post("/ext_api/load_tests/group_scenarios", %{
          "users_count" => 4,
          "languages" => ["python", "cpp"],
          "tournament" => %{
            "group_task_id" => group_task.id,
            "name" => "Scenario group tournament",
            "slice_size" => 2
          }
        })
        |> json_response(200)

      assert %{
               "group_tournament" => %{
                 "id" => group_tournament_id,
                 "group_task_id" => returned_group_task_id,
                 "slice_size" => 2,
                 "slice_strategy" => "random",
                 "state" => "waiting_participants"
               },
               "users" => users
             } = response

      assert is_integer(group_tournament_id)
      assert returned_group_task_id == group_task.id
      assert length(users) == 4
      assert Enum.all?(users, &is_binary(&1["token"]))
      assert Enum.all?(users, &is_binary(&1["user_token"]))

      langs = Enum.map(users, & &1["lang"])
      assert langs == ["python", "cpp", "python", "cpp"]

      assert Enum.all?(users, fn user ->
               String.starts_with?(user["name"], "loadtest-user-")
             end)
    end
  end

  describe "task_solutions/2" do
    test "returns forbidden when load tests are disabled", %{conn: conn} do
      task = insert(:task, solutions: %{"python" => "pass", "cpp" => "return 0;"})

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> get("/ext_api/load_tests/tasks/#{task.id}/solutions")
        |> json_response(403)

      assert response["error"] == "load_tests_disabled"
    end

    test "returns language-specific task solutions", %{conn: conn} do
      FunWithFlags.enable(:allow_load_tests_ext_api)

      task =
        insert(:task,
          solutions: %{
            "python" => "def solution(a, b):\n    return a + b\n",
            "cpp" => "int solution(int a, int b) { return a + b; }"
          }
        )

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> get("/ext_api/load_tests/tasks/#{task.id}/solutions")
        |> json_response(200)

      assert response["task_id"] == task.id
      assert response["solutions"]["python"] =~ "def solution"
      assert response["solutions"]["cpp"] =~ "int solution"
    end

    test "returns error when task solution cannot be resolved", %{conn: conn} do
      FunWithFlags.enable(:allow_load_tests_ext_api)

      task = insert(:task, solutions: %{"python" => "def solution(a, b):\n    return a + b\n"})

      response =
        conn
        |> put_req_header("x-auth-key", "x-key")
        |> get("/ext_api/load_tests/tasks/#{task.id}/solutions")
        |> json_response(422)

      assert response["error"] == "task_solutions_unavailable"
    end
  end
end
