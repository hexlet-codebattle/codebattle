defmodule Codebattle.GameProcess.Context do
  @moduledoc """
  The GameProcess context.
  Public interface to interacting with games.
  """

  import Ecto.Query
  import Codebattle.GameProcess.Auth

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.User

  alias Codebattle.GameProcess.{
    Server,
    Engine,
    FsmHelpers,
    ActiveGames,
    GlobalSupervisor
  }

  @type game_id :: integer

  @type game_params :: %{
          level: String.t(),
          type: String.t(),
          visibility_type: String.t()
        }

  defdelegate get_active_games(params), to: ActiveGames

  @spec get_completed_games() :: [Game.t()]
  def get_completed_games do
    query =
      from(
        games in Game,
        order_by: [desc_nulls_last: games.finishes_at],
        where: [state: "game_over"],
        limit: 30,
        preload: [:users, :user_games]
      )

    Repo.all(query)
  end

  @spec get(game_id) :: Game.t() | nil
  def get(id) do
    case Server.get_game(id) do
      nil -> get_from_db(id)
      game -> game
    end
  end

  @spec get!(game_id) :: Game.t()
  def get!(id) do
    case get(id) do
      nil -> raise Ecto.NoResultsError
      game -> game
    end
  end

  @spec create_game(User.t(), game_params) :: {:ok, Game.t()} | {:error, atom}
  def create_game(user, params) do
    Engine.create_game(user, params)
  end

  @spec join_game(game_id, User.t()) :: {:ok, Game.t()} | {:error, atom}
  def join_game(id, user) do
    id
    |> get()
    |> Engine.join_game(user)
  end

  @spec cancel_game(game_id, User.t()) :: {:ok, Game.t()} | {:error, atom}
  def cancel_game(id, user) do
    case get(id) do
      {:ok, game} -> FsmHelpers.get_module(game).cancel_game(game, user)
      {:error, reason} -> {:error, reason}
    end
  end

  @spec update_editor_data(game_id, User.t(), String.t(), String.t()) ::
          {:ok, Game.t()} | {:error, atom}
  def update_editor_data(id, user, editor_text, editor_lang) do
    case get(id) do
      {:ok, game} ->
        FsmHelpers.get_module(game).update_editor_data(game, %{
          id: user.id,
          editor_text: editor_text,
          editor_lang: editor_lang
        })

      {:error, reason} ->
        {:error, reason}
    end
  end

  @spec check_game(game_id, User.t(), String.t(), String.t()) :: {:ok, Game.t()} | {:error, atom}
  def check_game(id, user, editor_text, editor_lang) do
    Server.update_playbook(id, :start_check, %{
      id: user.id,
      editor_text: editor_text,
      editor_lang: editor_lang
    })

    case get_fsm(id) do
      {:ok, game} ->
        check_result =
          checker_adapter().call(
            FsmHelpers.get_task(game),
            editor_text,
            editor_lang
          )

        {:ok, new_fsm} =
          Server.call_transition(id, :check_complete, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        winner = FsmHelpers.get_winner(new_fsm) || %{id: nil}

        if {game.state, new_fsm.state, winner.id} == {:playing, :game_over, user.id} do
          Server.update_playbook(id, :game_over, %{id: user.id, lang: editor_lang})

          player = FsmHelpers.get_player(new_fsm, user.id)
          FsmHelpers.get_module(game).handle_won_game(id, player, new_fsm)
          {:ok, game, new_fsm, %{solution_status: true, check_result: check_result}}
        else
          {:ok, game, new_fsm, %{solution_status: false, check_result: check_result}}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  @spec give_up(game_id, User.t()) :: {:ok, Game.t()} | {:error, atom}
  def give_up(id, user) do
    case Server.call_transition(id, :give_up, %{id: user.id}) do
      {:ok, game} ->
        FsmHelpers.get_module(game).handle_give_up(id, user.id, game)

        {:ok, game}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @spec rematch_send_offer(game_id, User.t()) ::
          {:ok, {:rematch_status_updated, Game.t()}}
          | {:ok, {:rematch_accepted, Game.t()}}
          | {:error, atom}
  def rematch_send_offer(game_id, user) do
    with game <- get(game_id),
         :ok <- player_can_rematch?(game, user_id) do
     Engine.rematch_send_offer(game_id, user_id)
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  @spec rematch_reject(game_id) :: {:ok, Game.t()} | {:error, atom}
  def rematch_reject(game_id) do
    case Server.call_transition(game_id, :rematch_reject, %{}) do
      {:ok, game} ->
        {:rematch_update_status,
         %{
           rematch_initiator_id: FsmHelpers.get_rematch_initiator_id(game),
           rematch_state: FsmHelpers.get_rematch_state(game)
         }}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def timeout_game(id) do
    {:ok, game} = get_fsm(id)

    case {FsmHelpers.get_state(game), FsmHelpers.get_tournament_id(game)} do
      {:game_over, nil} ->
        {:terminate_after, 15}

      {:game_over, _tournament_id} ->
        {:terminate_after, 20}

      {_, nil} ->
        terminate_game(id)

      {_, _tournament_id} ->
        # TODO: terminate now after auto redirect to next tournament game
        ActiveGames.terminate_game(id)
        {:terminate_after, 20}
    end
  end

  def terminate_game(id) do
    {:ok, game} = get_fsm(id)

    case FsmHelpers.get_state(game) do
      :game_over ->
        GlobalSupervisor.terminate_game(id)

      _ ->
        Server.call_transition(id, :timeout, %{})
        ActiveGames.terminate_game(id)
        FsmHelpers.get_module(game).store_playbook(game)
        GlobalSupervisor.terminate_game(id)

        id
        |> get_game
        |> Game.changeset(%{state: "timeout"})
        |> Repo.update!()

        :ok
    end
  end

  defp set_random_level(params) do
    level = Enum.random(["elementary", "easy", "medium", "hard"])
    Map.put(params, :level, level)
  end

  defp checker_adapter, do: Application.get_env(:codebattle, :checker_adapter)

  defp get_from_db(id) do
    query = from(g in Game, where: g.id == ^id, preload: [:users, :user_games])
    Repo.one(query)
  end
end
