defmodule CodebattleWeb.TournamentView do
  use CodebattleWeb, :view
  alias HrWeb.Router.Helpers, as: Routes

  @default_timezone "Europe/Moscow"

  import Codebattle.Tournament.Helpers

  def render_datetime(nil), do: "none"

  def render_datetime(utc_datetime) do
    utc_datetime
    |> Timex.Timezone.convert(@default_timezone)
    |> Timex.format!("%d.%m.%Y %H:%M", :strftime)
  end
end
