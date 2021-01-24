defmodule Codebattle.CodeCheck.DockerChecker do
  @moduledoc false

  require Logger

  alias Codebattle.Languages
  alias Codebattle.CodeCheck.CheckResult

  def call(task, editor_text, editor_lang) do
    case Languages.meta() |> Map.get(editor_lang) do
      nil ->
        %CheckResult{status: :error, result: "Lang #{editor_lang} is undefined", output: ""}

      # %{checker_version: 2} = lang ->
      #   Codebattle.CodeCheck.CheckerV2.call(task, editor_text, lang)

      lang ->
        Codebattle.CodeCheck.Checker.call(task, editor_text, lang)
    end
  end
end
