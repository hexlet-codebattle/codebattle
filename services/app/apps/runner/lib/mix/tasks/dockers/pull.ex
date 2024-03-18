defmodule Mix.Tasks.Dockers.Pull do
  @moduledoc false

  require Logger
  use Mix.Task

  @shortdoc "Pull dockers from docker hub"

  def run([slug]) do
    slug |> Runner.Languages.meta() |> pull()
  end

  def run(_) do
    Runner.Languages.meta() |> Map.values() |> Enum.each(&pull/1)
  end

  defp pull(%{slug: "ts"}), do: :noop

  defp pull(meta) do
    IO.puts("Start pulling image for #{meta.slug}")
    Rambo.run("docker", ["pull", meta.docker_image], log: :stdout)
    IO.puts("End pulling image for #{meta.slug}")
  end
end
