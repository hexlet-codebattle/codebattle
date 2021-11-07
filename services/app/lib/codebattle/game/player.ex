defmodule Codebattle.Game.Player do
  @moduledoc "Struct for player"

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @derive Jason.Encoder

  alias Codebattle.CodeCheck.CheckResult
  alias Codebattle.CodeCheck.CheckResultV2
  alias Codebattle.Languages
  alias Codebattle.Tournament
  alias Codebattle.UserGame

  @derive {Jason.Encoder,
           only: [
             :id,
             :name,
             :is_bot,
             :lang,
             :editor_text,
             :editor_lang,
             :creator,
             :game_result,
             :check_result,
             :achievements,
             :rating,
             :rating_diff,
             :rank
           ]}

  embedded_schema do
    field(:id, :integer)
    field(:editor_text, :string, default: "module.exports = () => {\n\n};")
    field(:editor_lang, :string, default: "js")
    field(:lang, :string, default: "js")
    field(:game_result, :string, default: "undefined")
    # CheckResult.t() | CheckResultV2.t()
    field(:check_result, :map, default: %CheckResult{})
    field(:creator, :boolean, default: false)
    field(:is_bot, :boolean, default: false)
    field(:name, :string, default: "Ada Lovelace")
    field(:rating, :integer, default: 0)
    field(:rating_diff, :integer, default: 0)
    field(:rank, :integer, default: -1)
    field(:achievements, {:array, :string}, default: [])
  end

  def build(struct, params \\ %{})

  def build(%UserGame{} = user_game, params) do
    new_player =
      case user_game.user do
        nil ->
          %__MODULE__{}

        user ->
          %__MODULE__{
            id: user.id,
            is_bot: user.is_bot,
            rank: user.rank,
            name: user.name,
            achievements: user.achievements,
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
      is_bot: player.is_bot,
      name: player.name,
      rating: player.rating,
      rank: player.rank,
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
            is_bot: user.is_bot,
            name: user.name,
            rating: user.rating,
            rank: user.rank,
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
      check_result: %CheckResult{}
    }

    Map.merge(player, params)
  end
end
