defmodule CodebattleWeb.Live.TournamentView do
  use Phoenix.LiveView
  use Timex

  @update_frequency 100
  @starts_at "2019-08-22 15:00:00Z"

  def render(assigns) do
    CodebattleWeb.TournamentView.render("index.html", assigns)
  end

  def mount(_session, socket) do
    players_count = 16

    tournament = %{
      name: "Codebattle Hexlet summer tournament 2019",
      players_count: players_count,
      matches: [
        %{
          players: [
            %{name: "Andrey", game_result: :won},
            %{name: "Diman", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Valya", game_result: :won},
            %{name: "Vadim", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Abbath", game_result: :won},
            %{name: "Dima", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Igor", game_result: :won},
            %{name: "Vtm", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Kirill", game_result: :won},
            %{name: "Nikita", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Ruslan", game_result: :won},
            %{name: "Kostya", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Shuhrat", game_result: :won},
            %{name: "Ula", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Sasha", game_result: :won},
            %{name: "Igor", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Andrey", game_result: :won},
            %{name: "Valya", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Abbath", game_result: :won},
            %{name: "Igor", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Kirill", game_result: :won},
            %{name: "Ruslan", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Shuhrat", game_result: :won},
            %{name: "Sasha", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Andrey", game_result: :won},
            %{name: "Abbath", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Kirill", game_result: :won},
            %{name: "Shuhrat", game_result: :lost}
          ],
          state: :finished
        },
        %{
          players: [
            %{name: "Andrey", game_result: :won},
            %{name: "Kirill", game_result: :lost}
          ],
          state: :finished
        }
      ]
    }

    if connected?(socket) do
      :timer.send_interval(@update_frequency, self(), :update)
    end

    {:ok, assign(socket, tournament: tournament, time: updated_time)}
  end

  def handle_info(:update, socket) do
    {:noreply, assign(socket, time: updated_time)}
  end

  defp updated_time do
    starts_at = Timex.parse!(@starts_at, "{ISO:Extended}")
    diff = Time.diff(starts_at, Timex.now(), :second)
    days = round(Timex.diff(starts_at, Timex.now(), :days))
    hours = round(Timex.diff(starts_at, Timex.now(), :hours) - days * 24)
    minutes = round(Timex.diff(starts_at, Timex.now(), :minutes) - days * 24 * 60 - hours * 60)

    seconds =
      round(
        Timex.diff(starts_at, Timex.now(), :seconds) - days * 24 * 60 * 60 - hours * 60 * 60 -
          minutes * 60
      )

    %{
      days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds
    }
  end
end
