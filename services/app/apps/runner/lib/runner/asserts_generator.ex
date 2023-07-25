defmodule Runner.AssertsGenerator do
  @moduledoc false

  require Logger

  @max_asserts 30

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t()) :: String.t()
  def call(_task, _lang_meta = %{name: "ruby"}) do
    :runner
  end

  def call(task, lang_meta) do
    binding = [
      arguments: task.asserts_examples |> Jason.encode!(),
      count: to_string(@max_asserts - length(task.asserts_examples))
    ]

    :runner
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{lang_meta.slug}_asserts.eex")
    |> EEx.eval_file(binding)
  end
end
