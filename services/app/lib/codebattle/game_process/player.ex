defmodule Codebattle.GameProcess.Player do
  @moduledoc "Struct for player"
  alias Codebattle.User
  # @game_result [:undefined, :gave_up, :won, :lost]

  defstruct id: "",
            editor_text: "module.exports = () => {\n\n};",
            editor_lang: "js",
            game_result: :undefined,
            output: "",
            result: "{}",
            creator: false,
            github_id: "",
            name: "",
            rating: "",
            lang: ""

  def from_user(user, params \\ %{}) do
    player = case user.id do
      nil ->
        %__MODULE__{}

      id ->
        %__MODULE__{
          id: user.id,
          github_id: user.github_id,
          name: user.name,
          rating: user.rating,
          lang: user.lang
        }
    end
    Map.merge(player, params)
  end
end
