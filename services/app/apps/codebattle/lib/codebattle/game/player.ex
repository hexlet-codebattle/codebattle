defmodule Codebattle.Game.Player do
  @moduledoc "Struct for player"

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.AtomizedMap
  alias Codebattle.CodeCheck
  alias Codebattle.Game.Player
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserGame
  alias Runner.Languages

  @primary_key false
  @derive {Jason.Encoder,
   only: [
     :achievements,
     :check_result,
     :creator,
     :avatar_url,
     # :github_id,
     # :discord_avatar,
     # :discord_id,
     :editor_lang,
     :editor_text,
     :id,
     :is_bot,
     :is_guest,
     :lang,
     :name,
     :rank,
     :rating,
     :rating_diff,
     :result
   ]}

  @results ~w(undefined won lost gave_up timeout)

  embedded_schema do
    field(:id, :integer)

    field(:editor_text, :string,
      default:
        "const _ = require(\"lodash\");\nconst R = require(\"rambda\");\n\nconst solution = () => {\n\n};\n\nmodule.exports = solution;"
    )

    field(:editor_lang, :string, default: "js")
    field(:lang, :string, default: "js")
    field(:result, :string, default: "undefined")
    # CodeCheck.Result.t() | CodeCheck.Result.V2.t()
    field(:check_result, AtomizedMap, default: %CodeCheck.Result{})
    field(:creator, :boolean, default: false)
    field(:is_bot, :boolean, default: false)
    field(:is_guest, :boolean, default: false)
    field(:name, :string, default: "Ada Lovelace")
    field(:rating, :integer, default: 0)
    field(:rating_diff, :integer, default: 0)
    field(:rank, :integer, default: -1)
    field(:achievements, {:array, :string}, default: [])
    # field(:github_id, :integer)
    # field(:discord_id, :integer)
    # field(:discord_avatar, :string)
    field(:avatar_url, :string)
  end

  def changeset(player = %Player{}, attrs) do
    player
    |> cast(attrs, [
      :id,
      # :github_id,
      # :discord_id,
      # :discord_avatar,
      :avatar_url,
      :name,
      :is_bot,
      :is_guest,
      :lang,
      :editor_text,
      :editor_lang,
      :creator,
      :result,
      :check_result,
      :achievements,
      :rating,
      :rating_diff,
      :rank
    ])
    |> validate_inclusion(:result, @results)
  end

  def build(struct, params \\ %{})

  def build(user_game = %UserGame{}, params) do
    player =
      case user_game.user do
        nil ->
          %__MODULE__{}

        user ->
          %__MODULE__{
            id: user.id,
            is_bot: user.is_bot,
            is_guest: user.is_guest,
            rank: user.rank,
            name: user.name,
            achievements: user.achievements,
            # github_id: user.github_id,
            # discord_id: user.discord_id,
            # discord_avatar: user.discord_avatar,
            avatar_url: user.avatar_url,
            rating: user_game.rating,
            rating_diff: user_game.rating_diff,
            editor_lang: user_game.lang,
            lang: user_game.lang,
            creator: user_game.creator,
            result: user_game.result
          }
      end

    Map.merge(player, Map.drop(params, [:task]))
  end

  def build(player = %Tournament.Player{}, params) do
    init_player = %__MODULE__{
      id: player.id,
      is_bot: player.is_bot,
      is_guest: false,
      name: player.name,
      rating: player.rating,
      rank: player.rank,
      avatar_url: player.avatar_url,
      editor_lang: player.lang || "js",
      lang: player.lang || "js"
    }

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, task)
      end

    Map.merge(player, Map.drop(params, [:task]))
  end

  def build(player = %Player{}, params) do
    init_player = %__MODULE__{
      id: player.id,
      is_bot: player.is_bot,
      is_guest: player.is_guest,
      name: player.name,
      rating: player.rating,
      rank: player.rank,
      editor_lang: player.lang || "js",
      lang: player.lang || "js"
    }

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, task)
      end

    Map.merge(player, Map.drop(params, [:task]))
  end

  def build(user = %User{}, params) do
    init_player =
      case user.id do
        nil ->
          %__MODULE__{}

        _ ->
          %__MODULE__{
            id: user.id,
            is_bot: user.is_bot,
            is_guest: user.is_guest,
            name: user.name,
            rating: user.rating,
            rank: user.rank,
            editor_lang: user.lang || "js",
            lang: user.lang || "js",
            achievements: user.achievements,
            avatar_url: user.avatar_url
            # github_id: user.github_id,
            # discord_id: user.discord_id,
            # discord_avatar: user.discord_avatar
          }
      end

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, task)
      end

    Map.merge(player, Map.drop(params, [:task]))
  end

  def setup_editor_params(player = %__MODULE__{}, task) do
    editor_lang = player.editor_lang

    editor_text = CodeCheck.generate_solution_template(task, Languages.meta(editor_lang))

    params = %{
      editor_lang: editor_lang,
      editor_text: editor_text,
      result: "undefined",
      check_result: %CodeCheck.Result{}
    }

    Map.merge(player, params)
  end
end
