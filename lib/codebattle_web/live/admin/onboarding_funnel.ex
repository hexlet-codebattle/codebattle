defmodule CodebattleWeb.Live.Admin.OnboardingFunnel do
  @moduledoc false
  use CodebattleWeb, :live_component

  alias Codebattle.Onboarding

  @impl true
  def mount(socket), do: {:ok, assign(socket, days: 30, report: nil)}

  @impl true
  def update(assigns, socket) do
    socket = assign(socket, assigns)
    {:ok, if(socket.assigns.report, do: socket, else: load_report(socket))}
  end

  @impl true
  def handle_event("onboarding_window", %{"days" => days}, socket) do
    days = Map.get(%{"7" => 7, "30" => 30, "90" => 90}, days, 30)
    {:noreply, socket |> assign(:days, days) |> load_report()}
  end

  @impl true
  def handle_event("refresh_onboarding", _params, socket), do: {:noreply, load_report(socket)}

  defp load_report(socket), do: assign(socket, :report, Onboarding.report(socket.assigns.days))

  @impl true
  def render(assigns) do
    ~H"""
    <section
      id={@id}
      class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 my-3"
      aria-labelledby="onboarding-title"
    >
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-2" style="gap: 1rem;">
        <h2 id="onboarding-title" class="text-white mb-0">Onboarding funnel</h2>
        <div class="d-flex align-items-center" style="gap: .75rem;">
          <form id="onboarding-window-form" phx-change="onboarding_window" phx-target={@myself}>
            <label for="onboarding-days" class="cb-text mr-2">First landing</label>
            <select id="onboarding-days" name="days" class="cb-bg-panel cb-text p-1">
              <option :for={days <- [7, 30, 90]} value={days} selected={days == @days}>
                Last {days} days
              </option>
            </select>
          </form>
          <button
            type="button"
            phx-click="refresh_onboarding"
            phx-target={@myself}
            class="btn btn-sm btn-outline-secondary"
          >Refresh</button>
        </div>
      </div>
      <p class="cb-text mb-3">
        Guest sessions first seen on the landing page in this period; milestones reached through now.
        Reloads count once. These are browser sessions, not unique people. Records expire after 90 days.
      </p>
      <p :if={@report.total == 0} class="cb-text" id="onboarding-empty">
        No landing sessions recorded in this period. Tracking starts with this onboarding flow.
      </p>
      <div class="table-responsive">
        <table class="table cb-text mb-2">
          <thead>
            <tr>
              <th>Step</th><th>Sessions</th><th>Of landing</th><th>From previous</th><th>
                Not yet at this step
              </th>
            </tr>
          </thead>
          <tbody>
            <tr :for={step <- @report.steps} id={"onboarding-step-#{step.key}"}>
              <td>
                {step.label}
                <div style="height: 4px; background: #35353c; margin-top: .5rem;" aria-hidden="true">
                  <div style={"height: 4px; width: #{step.conversion}%; background: #42b883;"}></div>
                </div>
              </td>
              <td>{step.total}</td>
              <td>{step.conversion}%</td>
              <td>{if step.key == :landed, do: "—", else: "#{step.from_previous}%"}</td>
              <td>{if step.key == :landed, do: "—", else: step.not_reached}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="cb-text" id="onboarding-sign-ins">
        Signed in after landing: <strong>{@report.signed_in}</strong>.
        Includes existing accounts; this is separate from the practice funnel.
      </p>
      <div :if={@report.languages != []}>
        <h3 class="text-white h5">First practice by language</h3>
        <div class="table-responsive">
          <table class="table cb-text mb-0">
            <thead>
              <tr>
                <th>Language</th><th>Started</th><th>Solved</th>
              </tr>
            </thead>
            <tbody>
              <tr :for={language <- @report.languages}>
                <td>{language.lang}</td><td>{language.started}</td><td>{language.solved}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    """
  end
end
