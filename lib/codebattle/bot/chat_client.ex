defmodule Codebattle.Bot.ChatClient do
  @moduledoc """
  What the bot says in a game chat, in the opponent's locale.

  The bot can't read the chat, so it speaks only at the start and at the end of a
  game: anything said in between lands next to people's messages and reads like a
  confused reply.
  """
  use Gettext, backend: CodebattleWeb.Gettext

  alias Codebattle.Bot.Socket

  @type message ::
          :greet_opponent
          | :excuse
          | :congratulate_opponent
          | :advice_on_give_up
          | :invite_to_tournament

  @spec send(Socket.channel(), message(), String.t(), map()) :: :ok
  def send(chat_channel, type, locale, params \\ %{}) do
    text = Gettext.with_locale(CodebattleWeb.Gettext, locale, fn -> text(type, params) end)
    Socket.push_async(chat_channel, "chat:add_msg", %{"text" => text})
  end

  @doc false
  @spec text(message(), map()) :: String.t()
  def text(:greet_opponent, %{total_time_min: minutes}) do
    Enum.random([
      gettext("Hi! I'll solve this in about %{minutes} min. Think you can beat me?", minutes: minutes),
      gettext("Hey! My solution will be ready in about %{minutes} min. Good luck!", minutes: minutes),
      gettext("Let's go! I need about %{minutes} min for this one. Race you!", minutes: minutes)
    ])
  end

  def text(:excuse, _params) do
    Enum.random([
      gettext("This one is too tough for me. It's all yours!"),
      gettext("I have no idea how to solve this one. Show me how it's done!")
    ])
  end

  def text(:congratulate_opponent, %{game_mode: "training"}) do
    gettext("Congratulations, you won the training game! Sign up to fight for a place in the ranking.")
  end

  def text(:congratulate_opponent, _params) do
    Enum.random([
      gettext("GG WP!"),
      gettext("Well played! I'll get my revenge next time."),
      gettext("You got me this time. Good job!")
    ])
  end

  def text(:advice_on_give_up, _params) do
    Enum.random([
      gettext("Tough one? Give it another try, practice makes perfect!"),
      gettext("No worries, the next task will be yours.")
    ])
  end

  def text(:invite_to_tournament, %{tournament_id: id, starts_at: starts_at} = params) do
    url = "/tournaments/#{id}"
    starts_in = starts_in(starts_at)

    if params[:opponent_won] do
      Enum.random([
        gettext("GG! Beating a bot is a nice warm-up, now try real people. The next tournament starts %{when}: %{url}",
          when: starts_in,
          url: url
        ),
        gettext("You beat me! I bet you'd do great in a tournament too. The next one starts %{when}: %{url}",
          when: starts_in,
          url: url
        )
      ])
    else
      Enum.random([
        gettext("Bots are fun, but people are more fun 😉 The next tournament starts %{when}: %{url}",
          when: starts_in,
          url: url
        ),
        gettext("Want a real challenge? Join the next tournament, it starts %{when}: %{url}",
          when: starts_in,
          url: url
        )
      ])
    end
  end

  defp starts_in(starts_at) do
    minutes = max(DateTime.diff(starts_at, DateTime.utc_now(), :minute), 1)

    case {div(minutes, 60), rem(minutes, 60)} do
      {0, minutes} -> gettext("in %{minutes} min", minutes: minutes)
      {hours, 0} -> gettext("in %{hours} h", hours: hours)
      {hours, minutes} -> gettext("in %{hours} h %{minutes} min", hours: hours, minutes: minutes)
    end
  end
end
