defmodule CodebattleWeb.Live.Admin.Feedback.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Feedback

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       feedback: Feedback.list_all(),
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("reload", _params, socket) do
    {:noreply, assign(socket, feedback: Feedback.list_all())}
  end

  defp format_inserted_at(inserted_at) do
    Calendar.strftime(inserted_at, "%Y-%m-%d %H:%M:%S")
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="cb-container-xl cb-bg-panel cb-shadow-sm cb-rounded cb-py-4 cb-mt-3">
      <div class="cb-d-flex cb-justify-between cb-align-center">
        <h1 class="cb-text-white">Feedback</h1>
        <button class="cb-btn cb-btn-secondary cb-rounded" phx-click="reload">
          Reload
        </button>
      </div>

      <%= if @feedback == [] do %>
        <p class="cb-text-white cb-mt-3 cb-mb-0">No feedback yet.</p>
      <% else %>
        <div class="cb-table-responsive cb-mt-4">
          <table class="cb-table cb-table-sm">
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color cb-border-bottom">id</th>
                <th class="cb-border-color cb-border-bottom">type</th>
                <th class="cb-border-color cb-border-bottom">author</th>
                <th class="cb-border-color cb-border-bottom">url</th>
                <th class="cb-border-color cb-border-bottom">created_at</th>
              </tr>
            </thead>
            <tbody>
              <%= for item <- @feedback do %>
                <tr>
                  <td class="cb-align-middle cb-text-white cb-border-color">{item.id}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{item.status}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{item.author_name}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    <a
                      href={item.title_link}
                      class="cb-text-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title_link}
                    </a>
                  </td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    {format_inserted_at(item.inserted_at)}
                  </td>
                </tr>
                <tr>
                  <td class="cb-align-middle cb-text-white cb-border-color cb-fw-bold">message</td>
                  <td class="cb-align-middle cb-text-white cb-border-color cb-text-break" colspan="4">
                    {item.text}
                  </td>
                </tr>
              <% end %>
            </tbody>
          </table>
        </div>
      <% end %>
    </div>
    """
  end
end
