defmodule Codebattle.GameProcess.Player do
  @moduledoc "Struct for player"

  alias Codebattle.CodeCheck.CheckResult
  alias Codebattle.Languages
  alias Codebattle.Tournament
  alias Codebattle.UserGame

  # @game_result [:undefined, :gave_up, :won, :lost]
  @derive {Poison.Encoder,
           only: [
             :id,
             :name,
             :guest,
             :is_bot,
             :github_id,
             :lang,
             :editor_mode,
             :editor_theme,
             :editor_text,
             :editor_lang,
             :creator,
             :game_result,
             :check_result,
             :achievements,
             :rating,
             :rating_diff
           ]}

  defstruct id: nil,
            editor_text: "module.exports = () => {\n\n};",
            editor_lang: "js",
            lang: "",
            game_result: :undefined,
            check_result: CheckResult.new(),
            creator: false,
            is_bot: false,
            github_id: "",
            public_id: "",
            name: "",
            rating: 0,
            rating_diff: 0,
            achievements: []

  def build(userable, params \\ %{})

  def build(%UserGame{} = user_game, params) do
    new_player =
      case user_game.user do
        nil ->
          %__MODULE__{}

        user ->
          %__MODULE__{
            id: user.id,
            public_id: user.public_id,
            is_bot: user.is_bot,
            github_id: user.github_id,
            name: user.name,
            achievements: user_game.user.achievements,
            rating: user_game.rating,
            rating_diff: user_game.rating_diff,
            editor_lang: user_game.lang,
            lang: user_game.lang,
            creator: user_game.creator,
            game_result: user_game.result
          }
      end

    Map.merge(new_player, params)
  end

  def build(%Tournament.Types.Player{} = player, params) do
    init_player = %__MODULE__{
      id: player.id,
      public_id: player.public_id,
      is_bot: player.is_bot,
      github_id: player.github_id,
      name: player.name,
      rating: player.rating,
      editor_lang: player.lang || "js",
      lang: player.lang || "js"
    }

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, %{task: task})
      end

    Map.merge(player, params)
  end

  def build(user, params) do
    init_player =
      case user.id do
        nil ->
          %__MODULE__{}

        _ ->
          %__MODULE__{
            id: user.id,
            public_id: user.public_id,
            is_bot: user.is_bot,
            github_id: user.github_id,
            name: user.name,
            rating: user.rating,
            editor_lang: user.lang || "js",
            lang: user.lang || "js",
            achievements: user.achievements
          }
      end

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, %{task: task})
      end

    Map.merge(player, params)
  end

  def setup_editor_params(%__MODULE__{} = player, %{task: task}) do
    editor_lang = player.editor_lang
    editor_text = Languages.get_solution(editor_lang, task)

    params = %{
      editor_lang: editor_lang,
      editor_text: editor_text,
      game_result: :undefined,
      check_result: CheckResult.new()
    }

    Map.merge(player, params)
  end
end
