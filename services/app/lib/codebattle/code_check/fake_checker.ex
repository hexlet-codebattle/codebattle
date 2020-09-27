defmodule Codebattle.CodeCheck.FakeChecker do
  @moduledoc false

  alias Codebattle.CodeCheck.CheckResult

  def call(_task, _editor_text, _editor_lang, _game_id) do
    %CheckResult{status: :ok, result: "asdf", output: "asdf"}
  end
end
