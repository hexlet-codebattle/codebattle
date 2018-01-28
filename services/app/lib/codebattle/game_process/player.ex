defmodule Codebattle.GameProcess.Player do
  @moduledoc "Struct for player"
  alias Codebattle.User
  # @game_result [:undefined, :gave_up, :won, :lost]

  defstruct [:id, user: %User{}, editor_text: "", editor_lang: :js, game_result: :undefined]
end
