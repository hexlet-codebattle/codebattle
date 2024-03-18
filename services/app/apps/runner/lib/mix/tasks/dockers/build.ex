defmodule Mix.Tasks.Dockers.Build do
  @moduledoc false

  use Mix.Task

  @shortdoc "Build docker runner image"

  def run([slug]) do
    slug |> Runner.Languages.meta() |> build()
  end

  def run(_) do
    Runner.Languages.meta() |> Map.values() |> Enum.each(&build/1)
  end

  defp build(%{slug: "ts"}), do: :noop

  defp build(meta) do
    command =
      "docker build -t #{meta.docker_image} --file #{root()}/apps/runner/dockers/#{meta.slug}/Dockerfile #{root()}/apps/runner/dockers/#{meta.slug}/"

    [cmd | opts] = command |> String.split()
    IO.puts("Start building image for #{meta.slug}")
    Rambo.run(cmd, opts, log: :stdout)
    IO.puts("End building image for #{meta.slug}")
  end

  defp root do
    File.cwd!()
  end
end
