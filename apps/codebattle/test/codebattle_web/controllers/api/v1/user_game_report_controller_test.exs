defmodule CodebattleWeb.Api.V1.UserGameReportControllerTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Bot
  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.UserGameReport

  describe "create/1" do
    test "player can report opponent", %{conn: conn} do
      user = insert(:user, lang: "js")
      bot = Bot.Context.build(%{lang: "js"})

      task = insert(:task)

      game_params = %{state: "playing", players: [user, bot], task: task}

      {:ok, game} = Game.Context.create_game(game_params)

      reason = "cheater"
      comment = "Bot is cheating"

      params = %{
        "offender_id" => bot.id,
        "reason" => reason,
        "comment" => comment
      }

      response =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.api_v1_user_game_report_path(conn, :create, game.id), params)
        |> json_response(201)

      assert %{
               "user_game_report" => %{
                 "id" => user_game_report_id,
                 "reporter_id" => reporter_id,
                 "offender_id" => offender_id,
                 "state" => "pending",
                 "reason" => ^reason,
                 "comment" => ^comment
               }
             } = response

      assert reporter_id == user.id
      assert offender_id == bot.id

      user_game_report =
        user_game_report_id |> UserGameReport.get!() |> Repo.preload([:reporter, :offender])

      assert user_game_report.state == :pending
      assert user_game_report.reporter.id == user.id
      assert user_game_report.offender.id == bot.id
    end

    test "player cannot report himself", %{conn: conn} do
      user = insert(:user, lang: "js")
      bot = Bot.Context.build(%{lang: "js"})

      task = insert(:task)

      game_params = %{state: "playing", players: [user, bot], task: task}

      {:ok, game} = Game.Context.create_game(game_params)

      params = %{
        "offender_id" => user.id,
        "reason" => "copypaste",
        "comment" => "User are cheating"
      }

      response =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.api_v1_user_game_report_path(conn, :create, game.id), params)
        |> json_response(422)

      assert %{"errors" => ["cannot_report_himself"]} = response
    end

    test "player cannot report other player which is not game player", %{conn: conn} do
      user = insert(:user, lang: "js")
      other_user = insert(:user, lang: "js")
      bot = Bot.Context.build(%{lang: "js"})

      task = insert(:task)

      game_params = %{state: "playing", players: [user, bot], task: task}

      {:ok, game} = Game.Context.create_game(game_params)

      params = %{
        "offender_id" => other_user.id,
        "reason" => "cheater",
        "comment" => "Bot is cheating"
      }

      response =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.api_v1_user_game_report_path(conn, :create, game.id), params)
        |> json_response(422)

      assert %{"errors" => ["offender_not_a_player_of_game"]} = response
    end

    test "player which is not game player cannot report player of the game", %{conn: conn} do
      other_user = insert(:user, lang: "js")
      user = insert(:user, lang: "js")
      bot = Bot.Context.build(%{lang: "js"})

      task = insert(:task)

      game_params = %{state: "playing", players: [user, bot], task: task}

      {:ok, game} = Game.Context.create_game(game_params)

      params = %{
        "offender_id" => user.id,
        "reason" => "cheater",
        "comment" => "Bot is cheating"
      }

      response =
        conn
        |> put_session(:user_id, other_user.id)
        |> post(Routes.api_v1_user_game_report_path(conn, :create, game.id), params)
        |> json_response(403)

      assert %{"errors" => ["not_a_player_of_game"]} = response
    end

    test "unprocessable entity with bad request", %{conn: conn} do
      user = insert(:user, lang: "js")
      bot = Bot.Context.build(%{lang: "js"})

      task = insert(:task)

      game_params = %{state: "playing", players: [user, bot], task: task}

      {:ok, game} = Game.Context.create_game(game_params)

      params = %{
        "offender_id" => bot.id,
        "reason" => "wrong_solution"
      }

      response =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.api_v1_user_game_report_path(conn, :create, game.id), params)
        |> json_response(422)

      assert %{"errors" => ["invalid_params"]} = response
    end

    test "unprocessable entity with incorrect reason", %{conn: conn} do
      user = insert(:user, lang: "js")
      bot = Bot.Context.build(%{lang: "js"})

      task = insert(:task)

      game_params = %{state: "playing", players: [user, bot], task: task}

      {:ok, game} = Game.Context.create_game(game_params)

      params = %{
        "offender_id" => bot.id,
        "reason" => "not_existed_reason",
        "comment" => "Some comment"
      }

      response =
        conn
        |> put_session(:user_id, user.id)
        |> post(Routes.api_v1_user_game_report_path(conn, :create, game.id), params)
        |> json_response(422)

      assert %{"errors" => %{"reason" => ["is invalid"]}} = response
    end
  end
end
