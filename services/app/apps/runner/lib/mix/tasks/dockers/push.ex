defmodule Mix.Tasks.Dockers.Push do
  @moduledoc false

  use Mix.Task

  @shortdoc "Push dockers to docker hub"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:porcelain)
    slug |> Runner.Languages.meta() |> push()
  end

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:porcelain)
    Runner.Languages.meta() |> Map.values() |> Enum.each(&push/1)
  end

  defp push(%{slug: "ts"}), do: :noop

  defp push(meta) do
    IO.puts("Start pushing image for #{meta.slug}")
    result = Porcelain.shell("docker push #{meta.docker_image}", err: :string)
    IO.puts(result.out)
  end
end
