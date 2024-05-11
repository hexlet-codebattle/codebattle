defmodule Mix.Tasks.Dockers.Pull do
  @moduledoc false

  require Logger
  use Mix.Task

  @shortdoc "Pull dockers from docker hub"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:porcelain)
    slug |> Runner.Languages.meta() |> pull()
  end

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:porcelain)
    Runner.Languages.meta() |> Map.values() |> Enum.each(&pull/1)
  end

  defp pull(%{slug: "ts"}), do: :noop

  defp pull(meta) do
    IO.puts("Start pulling image for #{meta.slug}")
    result = Porcelain.shell("docker pull #{meta.docker_image}", err: :string)
    IO.puts(result.out)
  end
end
