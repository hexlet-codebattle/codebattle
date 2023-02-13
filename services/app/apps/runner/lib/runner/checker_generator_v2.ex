defmodule Runner.CheckerGenerator.V2 do
  @moduledoc false

  require Logger

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t()) :: String.t()
  def call(task, lang_meta) do
    binding = [
      arguments: task.asserts |> Enum.map(& &1.arguments) |> Jason.encode!()
    ]

    :runner
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{lang_meta.slug}.eex")
    |> EEx.eval_file(binding)
  end
end
