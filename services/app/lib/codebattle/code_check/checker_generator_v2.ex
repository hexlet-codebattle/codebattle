defmodule Codebattle.CodeCheck.CheckerGenerator.V2 do
  @moduledoc false

  require Logger

  def call(slug, task) do
    source_dir = Application.app_dir(:codebattle, "priv/templates/")

    bindings = [
      arguments: task.asserts |> Enum.map(& &1.arguments) |> Jason.encode!()
    ]

    :codebattle
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{slug}.eex")
    |> EEx.eval_file(bindings)
  end
end
