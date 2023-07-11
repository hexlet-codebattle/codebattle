defmodule CodebattleWeb.Api.V1.UserGameReportControllerTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Repo
  alias Codebattle.Game
  alias Codebattle.Bot
  alias Codebattle.UserGameReport

  describe ".create" do
    test "player can report opponent", %{conn: conn} do
      user = insert(:user)
      bot = Bot.Context.build()

      task = insert(:task)

      game_params = %{state: "playing", players: [user, bot], task: task}

      {:ok, game} = Game.Context.create_game(game_params)

      params = %{
        "user_id" => bot.id,
        "reason" => "cheating",
        "comment" => "Bot is cheating"
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
                 "reported_user_id" => reported_user_id,
                 "state" => "pending",
                 "reason" => "cheating",
                 "comment" => "Bot is cheating"
               }
             } = response

      assert reporter_id == user.id
      assert reported_user_id == bot.id

      user_game_report =
        UserGameReport.get!(user_game_report_id) |> Repo.preload([:reporter, :reported_user])

      assert user_game_report.state == "pending"
      assert user_game_report.reporter.id == user.id
      assert user_game_report.reported_user.id == bot.id
    end

    test "player cannot report himself" do
    end

    test "player cannot report when game does not exists" do
    end
  end
end
