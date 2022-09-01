defmodule Codebattle.CodeCheck.CheckerGenerator.V2 do
  @moduledoc false

  require Logger

  def call(%{task: task, lang_meta: %{checker_version: 2, slug: slug}} = token) do
    source_dir = Application.app_dir(:codebattle, "priv/templates/")

    binding = [
      arguments: task.asserts |> Enum.map(& &1.arguments) |> Jason.encode!()
    ]

    :codebattle
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{slug}.eex")
    |> EEx.eval_file(binding)
  end
end
