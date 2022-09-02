defmodule Codebattle.CodeCheck.CheckerGenerator.V2 do
  @moduledoc false

  require Logger

  def call(%{task: task, lang_meta: %{checker_version: 2, slug: slug}}) do
    binding = [
      arguments: task.asserts |> Enum.map(& &1.arguments) |> Jason.encode!()
    ]

    :codebattle
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{slug}.eex")
    |> EEx.eval_file(binding)
  end
end
