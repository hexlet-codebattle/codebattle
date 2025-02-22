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

  action_fallback(CodebattleWeb.FallbackController)

  def show(conn, %{"id" => id}) do
    user = conn.assigns.current_user
    Context.get_game!(id)

    case Context.get_game!(id) do
      %Game{is_live: true} = game ->
        score = Context.fetch_score_by_game_id(game.id)
        game_params = GameView.render_game(game, score)

        conn =
          put_gon(conn,
            jitsi_api_key: jitsi_api_key(),
            reports: maybe_get_reports(conn.assigns.current_user, game.id),
            game: game_params,
            game_id: id,
            tournament_id: Helpers.get_tournament_id(game),
            players: present_users_for_gon(Helpers.get_players(game))
          )

        is_player = Helpers.player?(game, user.id)

        case {game.state, is_player} do
          {"waiting_opponent", false} ->
            player = Helpers.get_first_player(game)

            conn
            |> put_meta_tags(%{
              title: "Hexlet Codebattle • Join game",
              description: "Game against #{player_info(player, game)}",
              url: Routes.game_url(conn, :show, id, level: Helpers.get_level(game)),
              image: Routes.game_image_url(conn, :show, id),
              twitter: get_twitter_labels_meta([player])
            })
            |> render("join.html", %{game: game, user: user})

          _ ->
            first = Helpers.get_first_player(game)
            second = Helpers.get_second_player(game)

            conn
            |> put_meta_tags(%{
              title: "Hexlet Codebattle • Cool game",
              description: "#{player_info(first, game)} vs #{player_info(second, game)}",
              url: Routes.game_url(conn, :show, id),
              image: Routes.game_image_url(conn, :show, id),
              twitter: get_twitter_labels_meta([first, second])
            })
            |> render("show.html", %{game: game, user: user})
        end

      game ->
        if Playbook.Context.exists?(game.id) && can_see_game(user, game) do
          [first, second] = get_users(game)

          score = Context.fetch_score_by_game_id(game.id)

          game_params =
            game
            |> GameView.render_game(score)
            |> Map.put(:mode, "history")

          conn
          |> put_gon(
            jitsi_api_key: jitsi_api_key(),
            is_record: true,
            game_id: id,
            game: game_params,
            tournament_id: game.tournament_id,
            langs: Languages.get_langs(),
            players: present_users_for_gon(game.users)
          )
          |> put_meta_tags(%{
            title: "Hexlet Codebattle • Cool archived game",
            description: "#{user_info(first)} vs #{user_info(second)}",
            url: Routes.game_url(conn, :show, id),
            image: Routes.game_image_url(conn, :show, id),
            twitter: get_twitter_labels_meta(game.users)
          })
          |> render("show.html", %{game: game, user: user})
        else
          conn
          |> put_meta_tags(%{
            title: "Hexlet Codebattle • Game Result",
            description: "Game is over",
            image: Routes.game_image_url(conn, :show, id),
            url: Routes.game_url(conn, :show, id)
          })
          |> render("game_result.html", %{game: game, user: user})
        end
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
    game_params = %{
      level: "elementary",
      mode: "training",
      visibility_type: "hidden",
      players: [conn.assigns.current_user, Codebattle.Bot.Context.build()]
    }

    case Context.create_game(game_params) do
      {:ok, game} -> redirect(conn, to: Routes.game_path(conn, :show, game.id))
      {:error, reason} -> {:error, reason}
    end
  end

  defp user_info(user), do: "@#{user.name}(#{user.lang})-#{user.rating}"

  defp player_info(nil, _game), do: ""

  defp player_info(player, game) do
    "@#{player.name}(#{player.lang})-#{player.rating} level:#{Helpers.get_level(game)}"
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

  defp get_users(game) do
    case Enum.count(game.users) do
      0 -> [User.build_guest(), User.build_guest()]
      1 -> game.users ++ [User.build_guest()]
      _ -> game.users
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

  defp can_see_game(%{subscription_type: :admin}, _game), do: true

  defp can_see_game(%{subscription_type: :premium} = user, game) do
    [first, second] = get_users(game)
    user.id == first.id || user.id == second.id
  end

  defp can_see_game(_user, _game), do: false

  defp maybe_get_reports(user, game_id) do
    if User.admin?(user) do
      UserGameReport.list_by_game(game_id)
    else
      []
    end
  end

  defp jitsi_api_key do
    Application.get_env(:codebattle, :jitsi_api_key)
  end
end
