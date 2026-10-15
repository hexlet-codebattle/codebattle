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
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-center">
        <h1 class="text-white">Feedback</h1>
        <button class="btn btn-secondary cb-btn-secondary cb-rounded" phx-click="reload">
          Reload
        </button>
      </div>

      <%= if @feedback == [] do %>
        <p class="text-white mt-3 mb-0">No feedback yet.</p>
      <% else %>
        <div class="table-responsive mt-4">
          <table class="table table-sm">
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color border-bottom">id</th>
                <th class="cb-border-color border-bottom">type</th>
                <th class="cb-border-color border-bottom">author</th>
                <th class="cb-border-color border-bottom">url</th>
                <th class="cb-border-color border-bottom">created_at</th>
              </tr>
            </thead>
            <tbody>
              <%= for item <- @feedback do %>
                <tr>
                  <td class="align-middle text-white cb-border-color">{item.id}</td>
                  <td class="align-middle text-white cb-border-color">{item.status}</td>
                  <td class="align-middle text-white cb-border-color">{item.author_name}</td>
                  <td class="align-middle text-white cb-border-color">
                    <a
                      href={item.title_link}
                      class="text-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title_link}
                    </a>
                  </td>
                  <td class="align-middle text-white cb-border-color">
                    {format_inserted_at(item.inserted_at)}
                  </td>
                </tr>
                <tr>
                  <td class="align-middle text-white cb-border-color font-weight-bold">message</td>
                  <td class="align-middle text-white cb-border-color text-break" colspan="4">
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
