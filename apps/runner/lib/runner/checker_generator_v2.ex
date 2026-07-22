defmodule Runner.CheckerGenerator.V2 do
  @moduledoc false

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t()) :: String.t()
  def call(_task, %{generate_checker?: false} = _lang_meta) do
    :runner
  end

  # Version 2 language images currently execute assertions without a generated
  # checker. Keep the future template path out of coverage until one is enabled.
  # coveralls-ignore-start
  def call(task, lang_meta) do
    binding = [
      arguments: task.asserts |> Enum.map(& &1.arguments) |> Jason.encode!()
    ]

    :runner
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{lang_meta.slug}.eex")
    |> EEx.eval_file(binding)
  end

  # coveralls-ignore-stop
end
