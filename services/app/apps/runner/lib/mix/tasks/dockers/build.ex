defmodule Mix.Tasks.Dockers.Build do
  @moduledoc false

  use Mix.Task

  @shortdoc "Build docker runner image"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:porcelain) |> dbg()
    slug |> Runner.Languages.meta() |> build()
  end

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:porcelain) |> dbg()
    Runner.Languages.meta() |> Map.values() |> Enum.each(&build/1)
  end

  defp build(%{slug: "ts"}), do: :noop

  defp build(meta) do
    command =
      "docker build -t #{meta.docker_image} --file #{root()}/apps/runner/dockers/#{meta.slug}/Dockerfile #{root()}/apps/runner/dockers/#{meta.slug}/"

    IO.puts("Start building image for #{meta.slug}")
    result = Porcelain.shell(command, err: :string)
    IO.puts(result.out)
  end

  defp root do
    File.cwd!()
  end
end
