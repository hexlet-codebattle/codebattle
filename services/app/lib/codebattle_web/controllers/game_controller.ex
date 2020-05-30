defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller
  require Logger

  alias Codebattle.GameProcess.{Play, ActiveGames, FsmHelpers}
  alias Codebattle.{User, Languages, UsersActivityServer}
  alias Codebattle.Bot.Playbook

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:join])

  action_fallback(CodebattleWeb.FallbackController)

  def create(conn, params) do
    type =
      case params["type"] do
        "withFriend" -> "private"
        "withRandomPlayer" -> "public"
        type -> type
      end

    level =
      case params["type"] do
        "training" -> "elementary"
        _ -> params["level"]
      end

    user = conn.assigns.current_user

    game_params = %{
      level: level,
      type: type,
      timeout_seconds: params["timeout_seconds"],
      user: user
    }

    case Play.create_game(game_params) do
      {:ok, fsm} ->
        game_id = FsmHelpers.get_game_id(fsm)
        level = FsmHelpers.get_level(fsm)

        UsersActivityServer.add_event(%{
          event: "success_create_game",
          user_id: user.id,
          data: %{
            game_id: game_id,
            type: type,
            level: level
          }
        })

        redirect(conn, to: Routes.game_path(conn, :show, game_id, level: level))

      {:error, reason} ->
        UsersActivityServer.add_event(%{
          event: "failure_create_game",
          user_id: user.id,
          data: %{
            reason: reason
          }
        })

        conn
        |> put_flash(:danger, reason)
        |> redirect(to: Routes.page_path(conn, :index))
    end
  end

  def show(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Play.get_fsm(id) do
      {:ok, fsm} ->
        conn = put_gon(conn, game_id: id)
        is_participant = ActiveGames.participant?(id, user.id)

        case {fsm.state, is_participant} do
          {:waiting_opponent, false} ->
            player = FsmHelpers.get_first_player(fsm)

            UsersActivityServer.add_event(%{
              event: "show_waiting_game_page",
              user_id: user.id,
              data: %{
                game_id: id,
                type: FsmHelpers.get_type(fsm),
                level: FsmHelpers.get_level(fsm)
              }
            })

            conn
            |> put_meta_tags(%{
              title: "Hexlet Codebattle • Join game",
              description: "Game against #{player_info(player, fsm)}",
              url: Routes.game_path(conn, :show, id, level: FsmHelpers.get_level(fsm)),
              twitter: get_twitter_labels_meta([player])
            })
            |> render("join.html", %{fsm: fsm})

          _ ->
            first = FsmHelpers.get_first_player(fsm)
            second = FsmHelpers.get_second_player(fsm)

            UsersActivityServer.add_event(%{
              event: "show_playing_game_page",
              user_id: user.id,
              data: %{
                game_id: id,
                type: FsmHelpers.get_type(fsm),
                level: FsmHelpers.get_level(fsm)
              }
            })

            conn
            |> put_meta_tags(%{
              title: "Hexlet Codebattle • Cool game",
              description: "#{player_info(first, fsm)} vs #{player_info(second, fsm)}",
              url: Routes.game_path(conn, :show, id),
              twitter: get_twitter_labels_meta([first, second])
            })
            |> render("show.html", %{fsm: fsm, layout_template: "full_width.html"})
        end

      {:error, _reason} ->
        case Play.get_game(id) do
          nil ->
            UsersActivityServer.add_event(%{
              event: "show_not_exist_game_page",
              user_id: user.id,
              data: %{
                game_id: id
              }
            })

            conn
            |> put_status(:not_found)
            |> put_view(CodebattleWeb.ErrorView)
            |> render("404.html", %{msg: gettext("Game not found")})

          game ->
            if Playbook.exists?(id) do
              langs = Languages.meta() |> Map.values()
              [first, second] = get_users(game)

              UsersActivityServer.add_event(%{
                event: "show_archived_game_page",
                user_id: user.id,
                data: %{
                  game_id: id
                }
              })

              conn
              |> put_gon(is_record: true, game_id: id, langs: langs)
              |> put_meta_tags(%{
                title: "Hexlet Codebattle • Cool archived game",
                description: "#{user_info(first)} vs #{user_info(second)}",
                url: Routes.game_path(conn, :show, id),
                twitter: get_twitter_labels_meta(game.users)
              })
              |> render("show.html", %{layout_template: "full_width.html"})
            else
              UsersActivityServer.add_event(%{
                event: "show_game_result_page",
                user_id: user.id,
                data: %{
                  game_id: id
                }
              })

              conn
              |> put_meta_tags(%{
                title: "Hexlet Codebattle • Game Result",
                description: "Game is over",
                url: Routes.game_path(conn, :show, id)
              })
              |> render("game_result.html", %{game: game})
            end
        end
    end
  end

  def join(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Play.join_game(id, conn.assigns.current_user) do
      {:ok, fsm} ->
        UsersActivityServer.add_event(%{
          event: "join_created_game",
          user_id: user.id,
          data: %{
            game_id: id,
            type: FsmHelpers.get_type(fsm),
            level: FsmHelpers.get_level(fsm)
          }
        })

        conn
        |> redirect(to: Routes.game_path(conn, :show, id))

      {:error, reason} ->
        UsersActivityServer.add_event(%{
          event: "failure_join_game",
          user_id: user.id,
          data: %{
            game_id: id,
            reason: reason
          }
        })

        conn
        |> put_flash(:danger, reason)
        |> redirect(to: Routes.page_path(conn, :index))
    end
  end

  def delete(conn, %{"id" => id}) do
    user = conn.assigns.current_user
    {:ok, fsm} = Play.get_fsm(id)

    with :ok <- Play.cancel_game(id, user) do
      UsersActivityServer.add_event(%{
        event: "cancel_created_game",
        user_id: user.id,
        data: %{
          game_id: id,
          type: FsmHelpers.get_type(fsm),
          level: FsmHelpers.get_level(fsm)
        }
      })

      redirect(conn, to: Routes.page_path(conn, :index))
    end
  end

  defp user_info(user), do: "@#{user.name}(#{user.lang})-#{user.rating}"

  defp player_info(nil, _fsm), do: ""

  defp player_info(player, fsm) do
    "@#{player.name}(#{player.lang})-#{player.rating} level:#{FsmHelpers.get_level(fsm)}"
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
      1 ->
        [first] = game.users
        second = User.create_guest()

        [first, second]

      _ ->
        game.users
    end
  end
end
