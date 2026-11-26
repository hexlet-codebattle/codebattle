defmodule CodebattleWeb.Live.Admin.Feedback.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Feedback

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, feedback: Feedback.list_all())}
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

      <p :if={@flash["error"]} class="alert alert-danger mt-3" role="alert">{@flash["error"]}</p>

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
                <tr id={"feedback-#{item.id}"}>
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
                    <div style="white-space: pre-wrap;">{item.text}</div>
                    <%= cond do %>
                      <% item.reply -> %>
                        <div class="border-top cb-border-color mt-2 pt-2">
                          <strong>Reply</strong>
                          <small class="cb-text ml-2">{format_inserted_at(item.replied_at)}</small>
                          <div style="white-space: pre-wrap;">{item.reply}</div>
                        </div>
                      <% item.user_id -> %>
                        <details class="mt-2">
                          <summary>Reply</summary>
                          <.form for={%{}} action={"/admin/feedback/#{item.id}/reply"}>
                            <label for={"reply-#{item.id}"} class="sr-only">Reply to {item.author_name}</label>
                            <textarea
                              id={"reply-#{item.id}"}
                              name="reply"
                              class="form-control my-2"
                              placeholder="Write a reply"
                              rows="3"
                              maxlength="10000"
                              required
                            ></textarea>
                            <button type="submit" class="btn btn-primary btn-sm">Publish reply</button>
                          </.form>
                        </details>
                      <% true -> %>
                        <small class="cb-text d-block mt-2">No linked account</small>
                    <% end %>
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
