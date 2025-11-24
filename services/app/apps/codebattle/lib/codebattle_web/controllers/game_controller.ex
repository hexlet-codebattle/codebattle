defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Game
  alias Codebattle.Game.Context
  alias Codebattle.Game.Helpers
  alias Codebattle.Playbook
  alias Codebattle.User
  alias Codebattle.UserGameReport
  alias CodebattleWeb.Api.GameView
  alias Runner.Languages

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:join, :delete])
  plug(:put_view, CodebattleWeb.GameView)
  plug(:put_layout, {CodebattleWeb.LayoutView, "app.html"})

  action_fallback(CodebattleWeb.FallbackController)

  def show(conn, %{"id" => id}) do
    user = conn.assigns.current_user
    game = Context.get_game!(id)

    if can_access_game?(game, user) do
      show_game(game, user, conn)
    else
      conn
      |> put_flash(:danger, gettext("You don't have access to this game"))
      |> redirect(to: Routes.root_path(conn, :index))
    end
  end

  def join(conn, %{"id" => id}) do
    case Context.join_game(id, conn.assigns.current_user) do
      {:ok, _game} -> redirect(conn, to: Routes.game_path(conn, :show, id))
      {:error, reason} -> {:error, reason}
    end
  end

  def delete(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Context.cancel_game(id, user) do
      :ok -> redirect(conn, to: Routes.root_path(conn, :index))
      {:error, reason} -> {:error, reason}
    end
  end

  def create_training(conn, _params) do
    task = Codebattle.Task.get_random_training_task()

    game_params = %{
      level: "elementary",
      task: task,
      mode: "training",
      use_chat: false,
      visibility_type: "hidden",
      players: [conn.assigns.current_user, Codebattle.Bot.Context.build()]
    }

    case Context.create_game(game_params) do
      {:ok, game} -> redirect(conn, to: Routes.game_path(conn, :show, game.id))
      {:error, reason} -> {:error, reason}
    end
  end

  defp show_game(game, user, conn) do
    case game do
      %Game{is_live: true} = game ->
        score = Context.fetch_score_by_game_id(game.id)
        game_params = GameView.render_game(game, score)

        conn =
          put_gon(conn,
            reports: maybe_get_reports(conn.assigns.current_user, game.id),
            game: game_params,
            game_id: game.id,
            tournament_id: Helpers.get_tournament_id(game),
            players: present_users_for_gon(Helpers.get_players(game))
          )

        is_player = Helpers.player?(game, user.id)

        case {game.state, is_player} do
          {"waiting_opponent", false} ->
            conn
            |> put_game_meta_tags(game)
            |> render("join.html", %{game: game, user: user})

          _ ->
            conn
            |> put_game_meta_tags(game)
            |> render("show.html", %{game: game, user: user})
        end

      game ->
        if Playbook.Context.exists?(game.id) && can_access_game?(game, user) do
          score = Context.fetch_score_by_game_id(game.id)

          game_params =
            game
            |> GameView.render_game(score)
            |> Map.put(:mode, "history")

          conn
          |> put_gon(
            is_record: true,
            game_id: game.id,
            game: game_params,
            tournament_id: game.tournament_id,
            langs: Languages.get_langs(),
            players: present_users_for_gon(game.users)
          )
          |> put_game_meta_tags(game)
          |> render("show.html", %{game: game, user: user})
        else
          conn
          |> put_game_meta_tags(game)
          |> render("game_result.html", %{game: game, user: user})
        end
    end
  end

  defp present_users_for_gon(users) do
    Enum.map(
      users,
      &Map.take(&1, [
        :id,
        :is_guest,
        :is_bot,
        :rating,
        :rank,
        :lang,
        :name,
        :achievements,
        :avatar_url
      ])
    )
  end

  defp can_access_game?(_game, %{subscription_type: :admin}), do: true

  # defp can_see_game?(%{subscription_type: :premium} = user, game) do
  defp can_access_game?(game, user) do
    if FunWithFlags.enabled?(:user_only_see_own_games) do
      Enum.any?(game.players, &(&1.id == user.id))
    else
      true
    end
  end

  # defp can_see_history_game?(_user, _game), do: false

  defp maybe_get_reports(user, game_id) do
    if User.admin?(user) do
      UserGameReport.list_by_game(game_id)
    else
      []
    end
  end

  defp put_game_meta_tags(conn, game) do
    put_meta_tags(conn, %{
      description: game_meta_description(game),
      url: Routes.game_url(conn, :show, game.id, level: Helpers.get_level(game)),
      image: Routes.game_image_url(conn, :show, game.id),
      twitter: get_twitter_labels_meta(game.players)
    })
  end

  defp get_twitter_labels_meta(players) do
    players
    |> Enum.with_index(1)
    |> Enum.reduce(%{}, fn
      {nil, _i}, acc ->
        acc

      {player, i}, acc ->
        label = player.name
        data = "#{player.rating} - #{player.lang}"

        acc |> Map.put("label#{i}", label) |> Map.put("data#{i}", data)
    end)
  end

  defp game_meta_description(%{state: "waiting_opponent", players: [player]} = game) do
    level = Gettext.gettext(CodebattleWeb.Gettext, "Level: #{game.level}")

    gettext("Play with") <>
      ": " <>
      "@#{player.name}(#{player.rating})-#{player.lang}" <>
      ". " <>
      gettext("Waiting for an opponent") <> ". " <> level
  end

  defp game_meta_description(%{players: [player1, player2]} = game) do
    level = Gettext.gettext(CodebattleWeb.Gettext, "Level: #{game.level}")
    state = Gettext.gettext(CodebattleWeb.Gettext, "Game state: #{game.state}")

    gettext("Game between") <>
      ": " <>
      "@#{player1.name}(#{player1.rating})-#{player1.lang}" <>
      " VS " <>
      "@#{player2.name}(#{player2.rating})-#{player2.lang}" <>
      ". " <> level <> ". " <> state
  end

  defp game_meta_description(_game), do: "Unknown game"
end
