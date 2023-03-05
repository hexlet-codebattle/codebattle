defmodule CodebattleWeb.Live.Tournament.ChatComponent do
  use CodebattleWeb, :live_component

  import Codebattle.Tournament.Helpers

  @impl true
  def mount(socket) do
    {:ok, assign(socket, initialized: false)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="sticky-top bg-white">
      <div class="rounded-top shadow-sm" style="height: 350px;">
        <div
          class="overflow-auto px-3 pt-3 h-100 text-break"
          id="new-chat-message"
          phx-hook="NewChatMessage"
        >
          <%= if can_moderate?(@tournament, @current_user) do %>
            <button class="btn btn-sm btn-link text-danger" phx-click="chat_clean_banned">
              Clean banned
            </button>
          <% end %>
          <div>
            <small class="text-muted">Please, be nice in chat</small>
          </div>

          <%= for message <- @messages do %>
            <div class="pb-1">
              <%= if message.type == :info do %>
                <small class="text-muted"><%= message.text %></small>
              <% else %>
                <span class="font-weight-bold"><%= "#{message.name}:" %></span>
                <span class="ml-1"><%= render_chat_message(message) %></span>

                <%= if can_moderate?(@tournament, @current_user) do %>
                  <span
                    class="text-danger"
                    phx-click="chat_ban_user"
                    phx-value-name={message.name}
                    phx-value-user_id={message.user_id}
                  >
                    Ban
                  </span>
                <% end %>
              <% end %>
            </div>
          <% end %>
        </div>
      </div>
      <%= form_for :message, "#", [phx_submit: :chat_message],  fn f -> %>
        <div class="d-flex shadow-sm rounded-bottom">
          <%= text_input(f, :text,
            autocomplete: "off",
            placeholder: "write your message here...",
            class: "form-control rounded-0 border-0 border-top x-rounded-bottom-left",
            phx_hook: "TournamentChatInput"
          ) %>
          <%= submit("Send", class: "btn btn-outline-secondary x-rounded-bottom-right rounded-0") %>
        </div>
      <% end %>
    </div>
    """
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)

  def render_chat_message(%{name: _user_name, text: text}) do
    # TODO: add highlight to usernames
    text
  end
end
