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
  alias Codebattle.UserGameReport
  alias Codebattle.Game.Engine
  alias Codebattle.Game.Player
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User

  require Logger

  @type raw_game_id :: String.t() | non_neg_integer()
  @type game_id :: non_neg_integer()
  @type tournament_id :: non_neg_integer()

  @type game_params :: %{
          :players => nonempty_list(User.t()) | nonempty_list(Tournament.Player.t()),
          optional(:level) => String.t(),
          optional(:ref) => non_neg_integer(),
          optional(:state) => String.t(),
          optional(:tournament_id) => tournament_id,
          optional(:timeout_seconds) => non_neg_integer(),
          optional(:type) => String.t(),
          optional(:round_id) => pos_integer(),
          optional(:mode) => String.t(),
          optional(:visibility_type) => String.t(),
          optional(:use_chat) => boolean(),
          optional(:use_timer) => boolean(),
          optional(:waiting_room_name) => String.t(),
          optional(:task) => Codebattle.Task.t() | nil
        }

  @type active_games_params :: %{
          optional(:is_bot) => boolean,
          optional(:is_tournament) => boolean,
          optional(:state) => String.t(),
          optional(:level) => String.t()
        }

  defdelegate fetch_score_by_game_id(game_id), to: Game.Query

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
    case Engine.create_game(game_params) do
      {:ok, game} ->
        {:ok, game}

      {:error, reason} ->
        Logger.warning("#{__MODULE__} Cannot create a game reason: #{inspect(reason)}")
        {:error, reason}
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

  @spec check_result(game_id, %{
          user: User.t(),
          editor_text: String.t(),
          editor_lang: String.t()
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

  @spec trigger_timeout(game_id) :: :ok
  def trigger_timeout(game_id) do
    game_id |> get_game!() |> Engine.trigger_timeout()
  end

  @spec terminate_tournament_games(tournament_id) :: :ok
  def terminate_tournament_games(tournament_id) do
    Game
    |> where([g], g.tournament_id == ^tournament_id)
    |> where([g], g.state == "playing")
    |> select([g], g.id)
    |> Repo.all()
    |> Enum.each(fn game_id -> Engine.terminate_game(game_id) end)
    |> dbg()
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

  def report_on_player(game_id, offender_id, reporter_id) do
    game = get_game!(game_id)
    old_report = UserGameReport.get_by!(%{game_id: game_id, offender_id: offender_id, reporter_id: reporter_id})

    case {old_report, game} do
      {_, nil} -> {:error, :game_not_fouded}
      {nil, game} ->
        case UserGameReport.create(%{
          comment: "",
          game_id: game_id,
          tournament_id: game.tournament_id,
          offender_id: offender_id,
          reporter_id: reporter_id,
          reason: "cheater",
          state: "pending"
        }) do
          {:ok, report} ->
            Codebattle.PubSub.broadcast("tournament:player:reported", %{
              tournament_id: game.tournament_id,
              report: report,
            })

            {:ok, report}
          reason ->
            {:error, reason}
        end
      _ ->
        {:error, :already_have_report}
    end
  end

  defp get_from_db!(id) do
    query = from(g in Game, where: g.id == ^id, preload: [:task, :users, :user_games])
    Repo.one!(query)
  end
end
