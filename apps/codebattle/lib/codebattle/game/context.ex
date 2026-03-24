defmodule Codebattle.Game.Context do
  @moduledoc """
  The Game context.
  Public interface to interacting with games.
  """

  import Codebattle.Game.Auth
  import Codebattle.Game.Helpers
  import Ecto.Query

  alias Codebattle.Bot
  alias Codebattle.CodeCheck
  alias Codebattle.Game
  alias Codebattle.Game.EditorEventBatch
  alias Codebattle.Game.Engine
  alias Codebattle.Game.Player
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserGameReport

  require Logger

  @type raw_game_id :: String.t() | non_neg_integer()
  @type game_id :: non_neg_integer()
  @type tournament_id :: non_neg_integer()
  @type editor_summary :: map()

  @allowed_summary_integer_fields ~w(
    key_event_count
    printable_key_count
    modifier_shortcut_count
    copy_shortcut_count
    cut_shortcut_count
    paste_shortcut_attempt_count
    undo_shortcut_count
    redo_shortcut_count
    backspace_count
    delete_count
    enter_count
    tab_count
    arrow_key_count
    paste_blocked_count
    drop_blocked_count
    content_change_count
    chars_inserted
    chars_deleted
    net_text_delta
    max_single_insert_len
    max_single_delete_len
    multi_char_insert_count
    multi_char_delete_count
    multi_line_insert_count
    large_insert_count
    final_text_length
    key_delta_sample_count
    avg_key_delta_ms
    min_key_delta_ms
    max_key_delta_ms
    idle_pause_over_2s_count
  )

  @type game_params :: %{
          :players => nonempty_list(User.t()) | nonempty_list(Tournament.Player.t()),
          optional(:level) => String.t(),
          optional(:ref) => non_neg_integer(),
          optional(:state) => String.t(),
          optional(:tournament_id) => tournament_id,
          optional(:timeout_seconds) => non_neg_integer(),
          optional(:type) => String.t(),
          optional(:round_id) => pos_integer(),
          optional(:round_position) => non_neg_integer(),
          optional(:mode) => String.t(),
          optional(:visibility_type) => String.t(),
          optional(:use_chat) => boolean(),
          optional(:use_timer) => boolean(),
          optional(:task) => Codebattle.Task.t() | nil
        }

  @type active_games_params :: %{
          optional(:is_bot) => boolean,
          optional(:is_tournament) => boolean,
          optional(:state) => String.t(),
          optional(:level) => String.t()
        }

  defdelegate fetch_head_to_head_by_game_id(game_id), to: Game.Query
  defdelegate fetch_head_to_head_page_data(user_id, opponent_id), to: Game.Query

  defdelegate get_completed_games(
                filters,
                pagingation_params \\ %{page_number: 1, page_size: 20, total: false}
              ),
              to: Game.Query

  @spec get_active_games(active_games_params) :: [Game.t()]
  def get_active_games(params \\ %{})

  def get_active_games(params) do
    Game.GlobalSupervisor
    |> Supervisor.which_children()
    |> Enum.filter(fn
      {_, :undefined, _, _} -> false
      {_, _pid, _, _} -> true
    end)
    |> Enum.map(fn {id, _, _, _} -> Game.Context.fetch_game(id) end)
    |> Enum.filter(fn
      {:ok, game} ->
        active_game?(game) &&
          Enum.all?(Enum.map(params, fn {key, value} -> Map.get(game, key) == value end))

      _ ->
        false
    end)
    |> Enum.map(fn {:ok, game} -> game end)
  end

  @spec fetch_game(raw_game_id) :: {:ok, Game.t()} | {:error, atom()}
  def fetch_game(id) do
    {:ok, get_game!(id)}
  rescue
    _e in _ ->
      {:error, :not_found}
  end

  @spec get_game!(raw_game_id) :: Game.t() | no_return
  def get_game!(id) when is_binary(id) do
    id |> String.to_integer() |> get_game!()
  end

  def get_game!(id) do
    case Game.Server.get_game(id) do
      {:ok, game} ->
        game
        |> fill_virtual_fields()
        |> Repo.preload([:css_task, :sql_task])
        |> mark_as_live()

      {:error, :not_found} ->
        id
        |> get_from_db!()
        |> fill_virtual_fields()
    end
  end

  def create_empty_game(user_id, task) do
    current_player =
      user_id
      |> User.get!()
      |> Player.build()

    opponent_bot = Player.build(Bot.Context.build())

    players = [
      current_player,
      opponent_bot
    ]

    %Game{
      state: "builder",
      mode: "builder",
      type: "duo",
      task: task,
      level: task.level,
      timeout_seconds: 0,
      players: players,
      visibility_type: "hidden"
    }
  end

  @spec create_game(game_params) :: {:ok, Game.t()} | {:error, atom}
  def create_game(game_params) do
    if Codebattle.Deployment.draining?() do
      {:error, :draining}
    else
      case Engine.create_game(game_params) do
        {:ok, game} ->
          {:ok, game}

        {:error, reason} ->
          Logger.warning("#{__MODULE__} Cannot create a game reason: #{inspect(reason)}")
          {:error, reason}
      end
    end
  end

  @spec bulk_create_games(list(game_params)) :: list(Game.t())
  def bulk_create_games(games_params) do
    Engine.bulk_create_games(games_params)
  end

  @spec join_game(game_id, User.t()) :: {:ok, Game.t()} | {:error, atom}
  def join_game(id, user) do
    Engine.join_game(get_game!(id), user)
  end

  @spec cancel_game(game_id, User.t()) :: :ok | {:error, atom}
  def cancel_game(id, user) do
    Engine.cancel_game(get_game!(id), user)
  end

  @spec update_editor_data(game_id, User.t(), String.t(), String.t()) ::
          {:ok, Game.t()} | {:error, atom}
  def update_editor_data(game_id, user, editor_text, editor_lang) do
    case get_game!(game_id) do
      %{is_live: true} = game ->
        Engine.update_editor_data(game, %{
          id: user.id,
          editor_text: editor_text,
          editor_lang: editor_lang
        })

      _ ->
        {:error, :game_is_dead}
    end
  end

  @spec store_editor_summary(game_id, User.t(), editor_summary, String.t() | nil) ::
          {:ok, EditorEventBatch.t() | :skipped} | {:error, atom | Ecto.Changeset.t()}
  def store_editor_summary(game_id, user, summary, editor_lang \\ nil)

  def store_editor_summary(_game_id, _user, nil, _editor_lang), do: {:ok, :skipped}

  def store_editor_summary(game_id, user, summary, editor_lang) when is_map(summary) do
    case get_game!(game_id) do
      %{is_live: true} = game ->
        sanitized_summary = sanitize_editor_summary(summary)

        case sanitized_summary do
          nil ->
            {:ok, :skipped}

          sanitized_summary ->
            start_offset = Map.get(sanitized_summary, "window_start_offset_ms", 0)
            end_offset = Map.get(sanitized_summary, "window_end_offset_ms", start_offset)
            {batch_started_at, batch_ended_at} = get_editor_batch_bounds(game, start_offset, end_offset)

            lang =
              editor_lang ||
                Map.get(sanitized_summary, "lang_slug") ||
                "unknown"

            EditorEventBatch.create(%{
              user_id: user.id,
              game_id: game.id,
              tournament_id: game.tournament_id,
              lang: lang,
              event_count: Map.get(sanitized_summary, "event_count", 0),
              window_start_offset_ms: start_offset,
              window_end_offset_ms: end_offset,
              batch_started_at: batch_started_at,
              batch_ended_at: batch_ended_at,
              summary: Map.delete(sanitized_summary, "lang_slug")
            })
        end

      _ ->
        {:error, :game_is_dead}
    end
  end

  @spec check_result(game_id, %{
          required(:user) => %{required(:id) => pos_integer()} | User.t(),
          required(:editor_text) => String.t(),
          required(:editor_lang) => String.t(),
          optional(:duration_sec) => non_neg_integer()
        }) ::
          {:ok, Game.t(), %{check_result: CodeCheck.check_result(), solution_status: boolean}}
          | {:error, atom}
  def check_result(id, params) do
    case get_game!(id) do
      %{is_live: true} = game -> Engine.check_result(game, params)
      _ -> {:error, :game_is_dead}
    end
  end

  @spec give_up(game_id, User.t()) :: {:ok, Game.t()} | {:error, atom}
  def give_up(id, user) do
    case get_game!(id) do
      %{is_live: true} = game -> Engine.give_up(game, user)
      _ -> {:error, :game_is_dead}
    end
  end

  @spec rematch_send_offer(raw_game_id, User.t()) ::
          {:rematch_status_updated, Game.t()}
          | {:rematch_accepted, Game.t()}
          | {:error, atom}
  def rematch_send_offer(game_id, user) do
    with %{is_live: true} = game <- get_game!(game_id),
         :ok <- player_can_rematch?(game, user.id) do
      Engine.rematch_send_offer(game, user)
    end
  end

  @spec rematch_reject(game_id) :: {:rematch_status_updated, map()} | {:error, atom}
  def rematch_reject(game_id) do
    case get_game!(game_id) do
      %{is_live: true} = game -> Engine.rematch_reject(game)
      _ -> {:error, :game_is_dead}
    end
  end

  @spec toggle_ban_player(game_id(), %{player_id: pos_integer()}) :: {:ok, Game.t()} | {:error, atom}
  def toggle_ban_player(game_id, %{player_id: player_id}) do
    case get_game!(game_id) do
      %{is_live: true} = game -> Engine.toggle_ban_player(game, player_id)
      _ -> {:error, :game_is_dead}
    end
  end

  @spec unlock_game(game_id, String.t()) :: :ok | {:error, term()}
  def unlock_game(game_id, pass_code) do
    case get_game!(game_id) do
      %{tournament_id: t_id} = game when not is_nil(t_id) ->
        if Tournament.Context.check_pass_code(t_id, pass_code) do
          Tournament.Context.remove_pass_code(t_id, pass_code)
          Engine.unlock_game(game)
          :ok
        else
          {:error, :invalid_password}
        end

      _ ->
        {:error, :no_tournament}
    end
  end

  @spec trigger_timeout(game_id) :: {:ok, Game.t()} | {:error, atom()}
  def trigger_timeout(game_id) do
    game_id |> get_game!() |> Engine.trigger_timeout()
  end

  defp sanitize_editor_summary(summary) do
    event_count = summary |> map_get("event_count") |> normalize_non_negative_integer()
    start_offset = summary |> map_get("window_start_offset_ms") |> normalize_non_negative_integer()
    end_offset = summary |> map_get("window_end_offset_ms") |> normalize_non_negative_integer()

    cond do
      event_count <= 0 ->
        nil

      end_offset < start_offset ->
        nil

      true ->
        @allowed_summary_integer_fields
        |> Enum.reduce(
          %{
            "event_count" => event_count,
            "window_start_offset_ms" => start_offset,
            "window_end_offset_ms" => end_offset
          },
          fn key, acc ->
            Map.put(acc, key, summary |> map_get(key) |> normalize_non_negative_integer())
          end
        )
        |> maybe_put_string("lang_slug", map_get(summary, "lang_slug"), 32)
    end
  end

  defp get_editor_batch_bounds(game, start_offset_ms, end_offset_ms) do
    anchor = get_editor_batch_anchor(game)

    started_at = offset_ms_to_datetime(start_offset_ms, anchor)
    ended_at = offset_ms_to_datetime(end_offset_ms, anchor)

    {started_at, ended_at}
  end

  defp get_editor_batch_anchor(%{starts_at: %NaiveDateTime{} = starts_at}),
    do: starts_at |> DateTime.from_naive!("Etc/UTC") |> DateTime.truncate(:microsecond)

  defp get_editor_batch_anchor(_game), do: DateTime.truncate(DateTime.utc_now(), :microsecond)

  defp normalize_non_negative_integer(value) when is_integer(value) and value >= 0, do: value

  defp normalize_non_negative_integer(value) when is_binary(value) do
    case Integer.parse(value) do
      {integer, ""} when integer >= 0 -> integer
      _ -> 0
    end
  end

  defp normalize_non_negative_integer(_value), do: 0

  defp offset_ms_to_datetime(value, anchor) when is_integer(value) and value >= 0,
    do: anchor |> DateTime.add(value, :millisecond) |> DateTime.truncate(:microsecond)

  defp offset_ms_to_datetime(value, anchor) when is_binary(value) do
    value
    |> normalize_non_negative_integer()
    |> offset_ms_to_datetime(anchor)
  end

  defp offset_ms_to_datetime(_value, anchor), do: anchor

  defp maybe_put_string(data, key, value, max_length) do
    case sanitize_string(value, max_length) do
      nil -> data
      sanitized -> Map.put(data, key, sanitized)
    end
  end

  defp sanitize_string(value, max_length) when is_binary(value) do
    value
    |> String.trim()
    |> String.slice(0, max_length)
    |> case do
      "" -> nil
      sanitized -> sanitized
    end
  end

  defp sanitize_string(_value, _max_length), do: nil

  defp map_get(data, key) when is_map(data) do
    Map.get(data, key) ||
      case safe_to_existing_atom(key) do
        nil -> nil
        atom_key -> Map.get(data, atom_key)
      end
  end

  defp safe_to_existing_atom(key) when is_binary(key) do
    String.to_existing_atom(key)
  rescue
    ArgumentError -> nil
  end

  defp safe_to_existing_atom(_key), do: nil

  @spec terminate_tournament_games(tournament_id) :: :ok
  def terminate_tournament_games(tournament_id) do
    Game
    |> where([g], g.tournament_id == ^tournament_id)
    |> where([g], g.state == "playing")
    |> select([g], g.id)
    |> Repo.all()
    |> Enum.each(fn game_id -> Engine.terminate_game(game_id) end)
  end

  @spec terminate_game(game_id | Game.t()) :: :ok
  def terminate_game(%Game{} = game) do
    Engine.terminate_game(game)
  end

  def terminate_game(id), do: id |> get_game!() |> terminate_game()

  @spec get_active_game_id(integer() | String.t()) :: nil | integer()
  def get_active_game_id(nil), do: nil

  def get_active_game_id(user_id) when is_binary(user_id) do
    get_active_game_id(String.to_integer(user_id))
  end

  def get_active_game_id(user_id) do
    Game
    |> where([g], g.state == "playing")
    |> where([g], fragment("? = ANY(player_ids)", ^user_id))
    # |> where([g], g.inserted_at > fragment("now() - interval '30 minutes'"))
    |> order_by([g], desc: g.id)
    |> Repo.all()
    |> case do
      [%Game{id: id} | _] -> id
      _ -> nil
    end
  end

  def report_on_player(game_id, reporter, offender_id) do
    game = get_game!(game_id)

    with true <- User.admin?(reporter) || player?(game, reporter.id),
         true <- player?(game, offender_id),
         nil <-
           UserGameReport.get_by(%{
             game_id: game_id,
             offender_id: offender_id,
             reporter_id: reporter.id
           }),
         {:ok, report} <-
           UserGameReport.create(%{
             # TODO: add this to the FE if we want to user specific message
             comment: "Player found a cheater",
             game_id: game_id,
             tournament_id: game.tournament_id,
             offender_id: offender_id,
             reporter_id: reporter.id,
             reason: "cheater",
             state: "pending"
           }) do
      Codebattle.PubSub.broadcast("tournament:player:reported", %{
        tournament_id: game.tournament_id,
        report: report
      })

      {:ok, report}
    else
      {:error, reason} ->
        {:error, reason}

      %UserGameReport{} = report ->
        {:ok, report}

      _ ->
        {:error, :cannot_report}
    end
  end

  defp get_from_db!(id) do
    query = from(g in Game, where: g.id == ^id, preload: [:task, :users, :user_games])
    Repo.one!(query)
  end
end
