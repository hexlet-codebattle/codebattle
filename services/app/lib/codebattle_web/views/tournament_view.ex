defmodule CodebattleWeb.TournamentView do
  use CodebattleWeb, :view

  @default_timezone "Europe/Moscow"

  import Codebattle.Tournament.Helpers

  def render_datetime(nil), do: "none"

  def render_datetime(utc_datetime) do
    utc_datetime
    |> Timex.Timezone.convert(@default_timezone)
    |> Timex.format!("%d.%m.%Y %H:%M", :strftime)
  end

  def get_link_params(match, %{id: id}) do
    is_participant = Enum.map(match.players, & &1.id) |> Enum.any?(&(&1 == id))

    case {match.state, is_participant} do
      {"waiting", true} -> {"Wait", "bg-warning"}
      {"active", true} -> {"Join", "bg-warning"}
      {_, true} -> {"Show", "bg-light border border-warning"}
      _ -> {"Show", "bg-light"}
    end
  end
end
