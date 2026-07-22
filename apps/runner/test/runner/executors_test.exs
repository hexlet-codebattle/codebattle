defmodule Runner.ExecutorsTest do
  use ExUnit.Case, async: false

  alias Runner.AssertsExecutor
  alias Runner.Executor
  alias Runner.Languages

  setup do
    env = [
      fake_container_run: Application.get_env(:runner, :fake_container_run),
      command_runner: Application.get_env(:runner, :command_runner),
      command_stub_test_pid: Application.get_env(:runner, :command_stub_test_pid),
      runner_tmp: System.get_env("CODEBATTLE_RUNNER_TMP"),
      xdg_cache_home: System.get_env("XDG_CACHE_HOME"),
      user_home: System.get_env("HOME"),
      platform: System.get_env("RUNNER_PLATFORM"),
      volume_label: System.get_env("RUNNER_VOLUME_LABEL")
    ]

    tmp_dir = Path.join(System.tmp_dir!(), "codebattle-runner-tests")
    Application.put_env(:runner, :fake_container_run, true)
    Application.put_env(:runner, :command_stub_test_pid, self())
    System.put_env("CODEBATTLE_RUNNER_TMP", tmp_dir)
    System.put_env("RUNNER_PLATFORM", "linux/amd64")
    System.put_env("RUNNER_VOLUME_LABEL", ":z")

    on_exit(fn ->
      restore_app_env(:fake_container_run, env[:fake_container_run])
      restore_app_env(:command_runner, env[:command_runner])
      restore_app_env(:command_stub_test_pid, env[:command_stub_test_pid])
      restore_system_env("CODEBATTLE_RUNNER_TMP", env[:runner_tmp])
      restore_system_env("XDG_CACHE_HOME", env[:xdg_cache_home])
      restore_system_env("HOME", env[:user_home])
      restore_system_env("RUNNER_PLATFORM", env[:platform])
      restore_system_env("RUNNER_VOLUME_LABEL", env[:volume_label])
    end)
  end

  test "executes an algorithm task through the fake container boundary" do
    task = %Runner.Task{
      asserts: [%{arguments: [1], expected: 2}],
      input_signature: [%{argument_name: "value", type: %{name: "integer"}}],
      output_signature: %{type: %{name: "integer"}}
    }

    assert Executor.call(task, Languages.meta("cpp"), "int solution(int value) { return value + 1; }", "run") == %{
             container_output: "oi",
             container_stderr: "blz",
             exit_code: 0,
             seed: "blz"
           }
  end

  test "delegates a real container command to the configured command runner" do
    Application.put_env(:runner, :fake_container_run, false)
    Application.put_env(:runner, :command_runner, Runner.CommandStub)

    task = %Runner.Task{type: "sql"}
    result = Executor.call(task, Languages.meta("postgresql"), "select 1", "run")

    assert result.container_output == "command output"
    assert result.container_stderr == ""
    assert result.exit_code == 0
    assert result.seed =~ ~r/^\d+$/
    assert_receive {:command, "docker", _args, [stderr_to_stdout: true]}
  end

  test "uses XDG_CACHE_HOME when no explicit runner directory is configured" do
    System.delete_env("CODEBATTLE_RUNNER_TMP")
    System.put_env("XDG_CACHE_HOME", System.tmp_dir!())

    task = %Runner.Task{type: "sql"}
    assert %{exit_code: 0} = Executor.call(task, Languages.meta("postgresql"), "select 1", "run")
  end

  test "uses the user cache directory when no runner directory is configured" do
    home_dir = Path.join(System.tmp_dir!(), "codebattle-runner-home")
    System.delete_env("CODEBATTLE_RUNNER_TMP")
    System.delete_env("XDG_CACHE_HOME")
    System.put_env("HOME", home_dir)

    on_exit(fn -> File.rm_rf(home_dir) end)

    task = %Runner.Task{type: "sql"}
    assert %{exit_code: 0} = Executor.call(task, Languages.meta("postgresql"), "select 1", "run")
  end

  test "executes an SQL experiment without generating checker data" do
    task = %Runner.Task{type: "sql"}

    assert Executor.call(task, Languages.meta("postgresql"), "select 1", "run") == %{
             container_output: "oi",
             container_stderr: "blz",
             exit_code: 0,
             seed: "blz"
           }
  end

  test "generates asserts through the fake container boundary" do
    task = %Runner.Task{asserts_examples: [%{arguments: [1], expected: 2}]}
    meta = Languages.meta("js")

    assert AssertsExecutor.call(task, meta, "solution", "generator") == %{
             container_output: "oi",
             container_stderr: "",
             exit_code: 0,
             seed: "blz"
           }
  end

  test "delegates assert generation to the configured command runner" do
    Application.put_env(:runner, :fake_container_run, false)
    Application.put_env(:runner, :command_runner, Runner.CommandStub)

    task = %Runner.Task{asserts_examples: [%{arguments: [1], expected: 2}]}
    result = AssertsExecutor.call(task, Languages.meta("js"), "solution", "generator")

    assert result.container_output == "command output"
    assert result.container_stderr == ""
    assert result.exit_code == 0
    assert result.seed =~ ~r/^\d+$/
    assert_receive {:command, "docker", _args, [stderr_to_stdout: true]}
  end

  defp restore_app_env(key, nil), do: Application.delete_env(:runner, key)
  defp restore_app_env(key, value), do: Application.put_env(:runner, key, value)

  defp restore_system_env(key, nil), do: System.delete_env(key)
  defp restore_system_env(key, value), do: System.put_env(key, value)
end

defmodule Runner.CommandStub do
  @moduledoc false
  def cmd(command, args, options) do
    send(Application.fetch_env!(:runner, :command_stub_test_pid), {:command, command, args, options})
    {"command output", 0}
  end

  def cmd("podman", ["ps" | _args]) do
    send(Application.fetch_env!(:runner, :command_stub_test_pid), :listed_containers)

    stale = NaiveDateTime.utc_now() |> NaiveDateTime.add(-60) |> NaiveDateTime.to_iso8601()
    fresh = NaiveDateTime.to_iso8601(NaiveDateTime.utc_now())
    {"stale-id:::#{stale} +0000 UTC\nfresh-id:::#{fresh} +0000 UTC\n", 0}
  end

  def cmd("podman", ["rm", "-f", container_id]) do
    send(Application.fetch_env!(:runner, :command_stub_test_pid), {:removed_container, container_id})
    {"", 0}
  end
end
