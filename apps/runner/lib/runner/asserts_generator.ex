defmodule Runner.AssertsGenerator do
  @moduledoc false

  require Logger

  @max_asserts 30

  @spec call(Runner.Task.t(), Runner.LanguageMeta.t()) :: String.t()
  def call(_task, %{name: "ruby"} = _lang_meta) do
    :runner
  end

  def call(task, lang_meta) do
    binding = [
      arguments: Jason.encode!(task.asserts_examples),
      count: to_string(@max_asserts - length(task.asserts_examples))
    ]

    :runner
    |> Application.app_dir("priv/templates/")
    |> Path.join("#{lang_meta.slug}_asserts.eex")
    |> EEx.eval_file(binding)
  end
end
