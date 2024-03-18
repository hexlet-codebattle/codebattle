defmodule Mix.Tasks.Dockers.Push do
  @moduledoc false

  use Mix.Task

  @shortdoc "Push dockers to docker hub"

  def run([slug]) do
    slug |> Runner.Languages.meta() |> push()
  end

  def run(_) do
    Runner.Languages.meta() |> Map.values() |> Enum.each(&push/1)
  end

  defp push(%{slug: "ts"}), do: :noop

  defp push(meta) do
    IO.puts("Start pushing image for #{meta.slug}")
    Rambo.run("docker", ["push", meta.docker_image], log: :stdout)
    IO.puts("End pushing image for #{meta.slug}")
  end
end
