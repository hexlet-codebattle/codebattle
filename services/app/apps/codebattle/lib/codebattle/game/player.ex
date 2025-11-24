defmodule Codebattle.Game.Player do
  @moduledoc "Struct for player"

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.CodeCheck
  alias Codebattle.Game.Player
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserGame
  alias CodebattleWeb.Api.GameView
  alias Runner.AtomizedMap
  alias Runner.Languages

  @primary_key false
  @default_editor_text ~s|const _ = require("lodash");\nconst R = require("rambda");\n\nconst solution = () => {\n\n};\n\nmodule.exports = solution;|

  @derive {Jason.Encoder,
           only: [
             :achievements,
             :avatar_url,
             :check_result,
             :creator,
             :clan_id,
             :editor_lang,
             :editor_text,
             :id,
             :is_banned,
             :is_bot,
             :is_guest,
             :lang,
             :style_lang,
             :name,
             :rank,
             :rating,
             :rating_diff,
             :result,
             :result_percent
           ]}

  @results ~w(undefined won lost gave_up timeout)

  embedded_schema do
    field(:achievements, {:array, :string}, default: [])
    field(:avatar_url, :string)
    # CodeCheck.Result.t() | CodeCheck.Result.V2.t()
    field(:check_result, AtomizedMap,
      default: %{
        exit_code: 0,
        success_count: 0,
        asserts_count: 1,
        status: "initial",
        output_error: "",
        version: 2,
        asserts: []
      }
    )

    field(:creator, :boolean, default: false)
    field(:editor_lang, :string, default: "js")
    field(:editor_text, :string, default: @default_editor_text)
    field(:id, :integer)
    field(:clan_id, :integer)
    field(:is_banned, :boolean, default: false)
    field(:is_bot, :boolean, default: false)
    field(:is_guest, :boolean, default: false)
    field(:lang, :string, default: "js")
    field(:style_lang, :string, default: "css")
    field(:db_type, :string, default: "sql")
    field(:name, :string, default: "Ada Lovelace")
    field(:playbook_id, :integer, default: nil)
    field(:rank, :integer, default: -1)
    field(:rating, :integer, default: 0)
    field(:rating_diff, :integer, default: 0)
    field(:result, :string, default: "undefined")
    field(:result_percent, :float, default: 0.0)
  end

  def changeset(%Player{} = player, attrs) do
    player
    |> cast(attrs, [
      :id,
      :avatar_url,
      :name,
      :is_banned,
      :is_bot,
      :is_guest,
      :lang,
      :style_lang,
      :db_type,
      :clan_id,
      :editor_text,
      :editor_lang,
      :creator,
      :result,
      :check_result,
      :achievements,
      :rating,
      :rating_diff,
      :rank,
      :playbook_id
    ])
    |> validate_inclusion(:result, @results)
  end

  def build(struct, params \\ %{})

  def build(%UserGame{} = user_game, params) do
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
            clan_id: user.clan_id,
            name: user.name,
            achievements: user.achievements,
            avatar_url: user.avatar_url,
            rating: user_game.rating,
            rating_diff: user_game.rating_diff,
            editor_lang: get_editor_lang(user, params),
            lang: user.lang || Application.get_env(:codebattle, :default_lang_slug),
            style_lang: user.style_lang || Application.get_env(:codebattle, :default_style_lang_slug),
            db_type: user.db_type || Application.get_env(:codebattle, :default_db_type_slug),
            creator: user_game.creator,
            result: user_game.result
          }
      end

    Map.merge(player, Map.delete(params, :task))
  end

  def build(%Tournament.Player{} = player, params) do
    init_player = %__MODULE__{
      id: player.id,
      is_banned: player.state == "banned",
      is_bot: player.is_bot,
      is_guest: false,
      clan_id: player.clan_id,
      name: player.name,
      rating: player.rating,
      rank: player.rank,
      avatar_url: player.avatar_url,
      editor_lang: get_editor_lang(player, params),
      lang: player.lang || Application.get_env(:codebattle, :default_lang_slug),
      style_lang: player.style_lang || Application.get_env(:codebattle, :default_style_lang_slug),
      db_type: player.db_type || Application.get_env(:codebattle, :default_db_type_slug)
    }

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, task)
      end

    Map.merge(player, Map.delete(params, :task))
  end

  def build(%Player{} = player, params) do
    init_player = %__MODULE__{
      id: player.id,
      is_banned: player.is_banned,
      is_bot: player.is_bot,
      is_guest: player.is_guest,
      clan_id: player.clan_id,
      name: player.name,
      rating: player.rating,
      rank: player.rank,
      editor_lang: get_editor_lang(player, params),
      lang: player.lang || Application.get_env(:codebattle, :default_lang_slug),
      style_lang: player.style_lang || Application.get_env(:codebattle, :default_style_lang_slug),
      db_type: player.db_type || Application.get_env(:codebattle, :default_db_type_slug),
      playbook_id: player.playbook_id
    }

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, task)
      end

    Map.merge(player, Map.delete(params, :task))
  end

  def build(%User{} = user, params) do
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
            clan_id: user.clan_id,
            rating: user.rating,
            rank: user.rank,
            editor_lang: get_editor_lang(user, params),
            lang: user.lang || Application.get_env(:codebattle, :default_lang_slug),
            style_lang: user.style_lang || Application.get_env(:codebattle, :default_style_lang_slug),
            db_type: user.db_type || Application.get_env(:codebattle, :default_db_type_slug),
            achievements: user.achievements,
            avatar_url: user.avatar_url
          }
      end

    player =
      case params[:task] do
        nil -> init_player
        task -> setup_editor_params(init_player, task)
      end

    Map.merge(player, Map.delete(params, :task))
  end

  def setup_editor_params(%__MODULE__{} = player, %{type: "sql"} = task) do
    editor_lang = player.db_type

    editor_text =
      %{sql_task: task}
      |> GameView.get_langs_with_templates()
      |> Enum.find(fn t -> t.slug == editor_lang end)
      |> Map.get(:solution_template)

    params = %{
      editor_lang: editor_lang,
      editor_text: editor_text,
      result: "undefined",
      check_result: %CodeCheck.SqlResult{}
    }

    Map.merge(player, params)
  end

  def setup_editor_params(%__MODULE__{} = player, %{type: "css"} = task) do
    editor_lang = player.style_lang

    editor_text =
      %{css_task: task}
      |> GameView.get_langs_with_templates()
      |> Enum.find(fn t -> t.slug == editor_lang end)
      |> Map.get(:solution_template)

    params = %{
      editor_lang: editor_lang,
      editor_text: editor_text,
      result: "undefined",
      check_result: %CodeCheck.CssResult{}
    }

    Map.merge(player, params)
  end

  def setup_editor_params(%__MODULE__{} = player, task) do
    editor_lang = player.lang

    editor_text = CodeCheck.generate_solution_template(task, Languages.meta(editor_lang))

    params = %{
      editor_lang: editor_lang,
      editor_text: editor_text,
      result: "undefined",
      check_result: %CodeCheck.Result{}
    }

    Map.merge(player, params)
  end

  defp get_editor_lang(user, %{task: %{type: "sql"}}),
    do: user.db_type || Application.get_env(:codebattle, :default_db_type_slug)

  defp get_editor_lang(user, %{task: %{type: "css"}}),
    do: user.style_lang || Application.get_env(:codebattle, :default_style_lang_slug)

  defp get_editor_lang(user, _params), do: user.lang || Application.get_env(:codebattle, :default_lang_slug)
end
