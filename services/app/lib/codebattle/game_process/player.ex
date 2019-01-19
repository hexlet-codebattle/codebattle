defmodule Codebattle.GameProcess.Player do
  @moduledoc "Struct for player"
  alias Codebattle.Languages
  # @game_result [:undefined, :gave_up, :won, :lost]

  defstruct id: "",
            editor_text: "module.exports = () => {\n\n};",
            editor_lang: "",
            game_result: :undefined,
            output: "",
            result: "{}",
            creator: false,
            bot: false,
            github_id: "",
            public_id: "",
            name: "",
            rating: ""

  def from_user(user, params \\ %{}) do
    player =
      case user.id do
        nil ->
          %__MODULE__{}

        _ ->
          editor_lang = user.lang || "js"
          editor_text = Languages.get_solution(editor_lang)

          %__MODULE__{
            id: user.id,
            public_id: user.public_id,
            bot: user.bot,
            github_id: user.github_id,
            name: user.name,
            rating: user.rating,
            editor_lang: editor_lang,
            editor_text: editor_text
          }
      end

    Map.merge(player, params)
  end
end
