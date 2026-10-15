defmodule Codebattle.Cluster do
  @moduledoc false

  @default_wait_timeout_ms 15_000
  @retry_delay_ms 500

  def connected_nodes do
    Node.list(:connected)
  end

  def choose_target_node do
    env_target = System.get_env("CODEBATTLE_HANDOFF_TARGET_NODE")

    case parse_node(env_target) do
      nil ->
        connected_nodes()
        |> Enum.sort()
        |> List.first()

      target_node ->
        if target_node in connected_nodes(), do: target_node
    end
  end

  def wait_for_target_node(timeout_ms \\ @default_wait_timeout_ms) do
    if is_nil(parse_node(System.get_env("CODEBATTLE_HANDOFF_TARGET_NODE"))) and connected_nodes() == [] do
      nil
    else
      deadline = System.monotonic_time(:millisecond) + timeout_ms
      wait_for_target_node_until(deadline)
    end
  end

  defp wait_for_target_node_until(deadline) do
    case choose_target_node() do
      nil ->
        if System.monotonic_time(:millisecond) < deadline do
          Process.sleep(@retry_delay_ms)
          wait_for_target_node_until(deadline)
        end

      node ->
        node
    end
  end

  defp parse_node(nil), do: nil
  defp parse_node(""), do: nil

  defp parse_node(raw) when is_binary(raw) do
    raw
    |> String.trim()
    |> case do
      "" -> nil
      value -> String.to_atom(value)
    end
  end
end
