defmodule CodebattleWeb.OnboardingController do
  use CodebattleWeb, :controller

  alias Codebattle.Runner.Languages
  alias Codebattle.Task
  alias CodebattleWeb.Frontend
  alias CodebattleWeb.OnboardingTracking

  def show(conn, _params) do
    langs = Enum.map(Languages.get_langs(), &Map.take(&1, [:slug, :name]))
    task = Task.get_onboarding_task(get_session(conn, :practice_task_id))
    preferred = get_session(conn, :practice_lang) || conn.assigns.current_user.lang
    selected = Enum.find(langs, &(&1.slug == preferred)) || List.first(langs)

    conn
    |> OnboardingTracking.setup()
    |> Frontend.put_layout()
    |> render_inertia("Onboarding", %{
      "practice_langs" => langs,
      "practice_lang" => selected && selected.slug,
      "practice_task" => task && Map.take(task, [:name, :description_en, :description_ru, :examples])
    })
  end
end
