defmodule Codebattle.GameProcess.Player do
  @moduledoc "Struct for player"
  alias Codebattle.User
  # @game_result [:undefined, :gave_up, :won, :lost]

  defstruct [
    :id,
    editor_text: "module.exports = () => {\n\n};",
    editor_lang: "js",
    game_result: :undefined,
    output: "",
    result: "{}",
    creator: false,
    user_id: "",
    user_github_id: "",
    user_name: "",
    user_rating: "",
    user_lang: ""
  ]

  def from_user(user) do
    %__MODULE__{
      user_id: user.id,
      user_github_id: user.github_id,
      user_name: user.name,
      user_rating: user.rating,
      user_lang: user.lang
    }
  end
end
