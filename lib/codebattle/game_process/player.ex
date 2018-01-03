defmodule Codebattle.GameProcess.Player do
  @moduledoc "Struct for player"
  alias Codebattle.User

  defstruct [:id, user: %User{}, editor_text: "", editor_lang: :js, winner: nil]
  # winner: nil -> default value
  # winner: true -> player won the game
  # winner: false -> player loose the game
end
