defmodule Codebattle.Bot.ChatClientRunner do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  require Logger

  def call(params) do
    :timer.sleep(500)
    opponent = get_opponent(params.game_state, params.bot_id)

    PhoenixClient.Channel.push_async(params.chat_channel, "new:message", %{
      "message" => greet_opponent(opponent),
      "user" => "test_bot"
    })

    :timer.sleep(2 * 60 * 1000)

    unless :rand.uniform(16) > 8 do
      PhoenixClient.Channel.push_async(params.chat_channel, "new:message", %{
        "message" => say_announcement(opponent),
        "user" => "test_bot"
      })
    end

    :timer.sleep(10 * 60 * 1000)

    unless :rand.uniform(20) > 5 do
      PhoenixClient.Channel.push_async(params.chat_channel, "new:message", %{
        "message" => say_about_code(opponent),
        "user" => "test_bot"
      })
    end
  end

  defp greet_opponent(opponent) do
    "Hi, #{opponent["name"]}!"
  end

  defp say_announcement(opponent) do
    "I have some great news))) You may choose #{pick_language(opponent["lang"])} for this task"
  end

  defp say_about_code(_opponent) do
    "Your code looks very strange..."
  end

  defp get_opponent(game_state, bot_id) do
    Enum.find(game_state["players"], &(&1["id"] !== bot_id))
  end

  defp pick_language("golang"), do: "TypeScript"
  defp pick_language(_), do: "Golang"

  #defp default_user do
  #  %{"name" => "dude", "lang" => "php"}
  #end

  # Chat state
  #   %{
  #     "messages" => [],
  #     "users" => [
  #       %{
  #         "achievements" => ["bot"],
  #         "editor_mode" => nil,
  #         "editor_theme" => nil,
  #         "github_id" => 35_539_033,
  #         "guest" => false,
  #         "id" => -7,
  #         "is_bot" => true,
  #         "lang" => "js",
  #         "name" => "VadimFront",
  #         "rating" => 1300
  #       },
  #       %{
  #         "achievements" => [],
  #         "editor_mode" => nil,
  #         "editor_theme" => nil,
  #         "github_id" => 35_539_033,
  #         "guest" => false,
  #         "id" => 2,
  #         "is_bot" => false,
  #         "lang" => "ruby",
  #         "name" => "Diman-8699",
  #         "rating" => 1202
  #       }
  #     ]
  #   }, '#PID<0.994.0>}'}}
end
