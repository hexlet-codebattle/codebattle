defmodule Codebattle.GameProcess.Play do
  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.{Repo, Game, User, UserGame}
  alias Codebattle.GameProcess.{Server, Supervisor, Fsm, Player, FsmHelpers}
  alias Codebattle.CodeCheck.Checker
  alias Codebattle.Bot.RecorderServer

  def list_games do
    Repo.all from p in Game,
      preload: [:users]
  end

  def list_fsms do
    Supervisor.current_games
  end

  def get_game(id) do
    Repo.get(Game, id)
  end

  def get_fsm(id) do
    Server.fsm(id)
  end

  def create_game(user, level) do
    game = Repo.insert!(%Game{state: "waiting_opponent"})

    task = get_random_task(level)

    fsm = Fsm.new |> Fsm.create(%{user: user, game_id: game.id, task: task})

    Supervisor.start_game(game.id, fsm)
    RecorderServer.start(game.id, task.id, user.id)
    Codebattle.Chat.Supervisor.start_chat(game.id)
    CodebattleWeb.Endpoint.broadcast("lobby", "new:game", %{game: fsm})
    params = %{game_id: game.id, task_id: task.id}
    Task.start(Codebattle.Bot.PlaybookPlayerTask, :run, [params])
    game.id
  end

  def join_game(id, user) do
    fsm = get_fsm(id)
    RecorderServer.start(id, fsm.data.task.id, user.id)
    Server.call_transition(id, :join, %{user: user})
  end

  def game_info(id) do
    #TODO: change first and second atoms to user ids, or list
    fsm = get_fsm(id)
    %{
      status: fsm.state, # :playing
      winner: FsmHelpers.get_winner(fsm),
      first_player: fsm |> FsmHelpers.get_first_player |> Map.get(:user),
      second_player: fsm |> FsmHelpers.get_second_player |> Map.get(:user, %User{}),
      first_player_editor_text: fsm |> FsmHelpers.get_first_player |> Map.get(:editor_text),
      second_player_editor_text: fsm |> FsmHelpers.get_second_player |> Map.get(:editor_text),
      first_player_editor_lang: fsm |> FsmHelpers.get_first_player |> Map.get(:editor_lang),
      second_player_editor_lang: fsm |> FsmHelpers.get_second_player |> Map.get(:editor_lang),
      task: fsm.data.task,
    }
  end

  def update_editor_text(id, user_id, editor_text) do
    RecorderServer.update_text(id, user_id, editor_text)
    Server.call_transition(id, :update_editor_params, %{id: user_id, editor_text: editor_text})
  end

  def update_editor_lang(id, user_id, editor_lang) do
    RecorderServer.update_lang(id, user_id, editor_lang)
    Server.call_transition(id, :update_editor_params, %{id: user_id, editor_lang: editor_lang})
  end

  def check_game(id, user, editor_text, editor_lang) do
    fsm = get_fsm(id)
    RecorderServer.update_text(id, user.id, editor_text)
    RecorderServer.update_lang(id, user.id, editor_lang)
    check = check_code(fsm.data.task, editor_text, editor_lang)
    case {fsm.state, check}  do
      {:playing, {:ok, true}} ->
        {_response, fsm} = Server.call_transition(id, :complete, %{id: user.id})
        handle_won_game(id, user, fsm)
        {:ok, fsm}
      {:playing, {:error, output}} ->
        {:error, output}
      {:player_won, {:error, output}} ->
        {:error, output}
      {:player_won, {:ok, true}} ->
        case FsmHelpers.is_winner?(fsm.data, user.id) do
          true ->
            {:ok, fsm}
          _ ->
            {_response, fsm} = Server.call_transition(id, :complete, %{id: user.id})
            handle_game_over(id, user, fsm)
            {:ok, fsm}
        end
    end
  end

  defp check_code(task, editor_text, lang_slug) do
    Checker.check(task, editor_text, lang_slug)
  end

  defp handle_won_game(id, user, fsm) do
    RecorderServer.store(id, user.id)
    # TODO: make async
    game_id = id |> Integer.parse |> elem(0)
    loser = FsmHelpers.get_opponent(fsm, user.id)

    game_id
      |> get_game
      |> Game.changeset(%{state: to_string(fsm.state)})
      |> Repo.update!
    Repo.insert!(%UserGame{game_id: game_id, user_id: user.id, result: "win"})
    Repo.insert!(%UserGame{game_id: game_id, user_id: loser.id, result: "lose"})

    # TODO: update users rating by Elo
      if user.id != 0 do
        user
          |> User.changeset(%{raiting: (user.raiting + 10)})
          |> Repo.update!
      end

      if loser.id != 0 do
        loser
          |> User.changeset(%{raiting: (loser.raiting - 10)})
          |> Repo.update!
      end
  end

  defp handle_game_over(id, loser, fsm) do
    id
      |> get_game
      |> Game.changeset(%{state: to_string(fsm.state)})
      |> Repo.update!
    loser
      |> User.changeset(%{raiting: (loser.raiting + 5)})
      |> Repo.update!
  end

  defp get_random_task(level) do
    new_level = if Enum.member?(Game.level_difficulties |> Map.keys, level) do
                  level
                else
                  "easy"
                end

    query = from t in Codebattle.Task, order_by: fragment("RANDOM()"), limit: 1, where: ^[level: new_level]
    query |> Repo.all |> Enum.at(0)
  end
end
