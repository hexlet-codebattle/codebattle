defmodule CodebattleWeb.Live.Admin.User.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.User

  @impl true
  def mount(_params, _session, socket) do
    users = User.search_users("a")
    {:ok, assign(socket, users: users, query: "a", layout: {CodebattleWeb.LayoutView, :empty})}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    users = User.search_users(query)
    {:noreply, assign(socket, users: users, query: query)}
  end

  def handle_event("search_without_auth", _params, socket) do
    users = User.search_without_auth()
    {:noreply, assign(socket, users: users)}
  end

  def handle_event(
        "update_subscription_type",
        %{"user" => %{"subscription_type" => subscription_type, "user_id" => user_id}},
        socket
      ) do
    case User.update_subscription_type(user_id, subscription_type) do
      {:ok, user} ->
        users =
          Enum.map(socket.assigns.users, fn
            u when u.id == user.id -> user
            u -> u
          end)

        {:noreply, assign(socket, users: users)}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  def handle_event("reset_token", %{"id" => id}, socket) do
    case User.reset_auth_token(id) do
      {:ok, user} ->
        users =
          Enum.map(socket.assigns.users, fn
            u when u.id == user.id -> user
            u -> u
          end)

        {:noreply, assign(socket, users: users)}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <h1>User Management</h1>

      <div class="d-flex">
        <form phx-submit="search">
          <input type="text" name="query" value={@query} placeholder="Search by name" />
          <button type="submit">Search</button>
        </form>
        <button class="btn btn-sm btn-primary" phx-click="search_without_auth">
          Show without auth
        </button>
      </div>

      <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col">Num</th>
            <th scope="col">Id</th>
            <th scope="col">Name</th>
            <th scope="col">Clan</th>
            <th scope="col">Auth Link</th>
            <th scope="col">Joined</th>
            <th scope="col">Auth Reset</th>
            <th scope="col">Subscription</th>
          </tr>
        </thead>
        <tbody>
          <%= for {user, index} <- Enum.with_index(@users) do %>
            <tr>
              <td><%= index %></td>
              <td><%= user.id %></td>
              <td><%= user.name %></td>
              <td><%= user.clan && String.slice(user.clan, 0, 20) %></td>
              <td>
                <%= CodebattleWeb.Router.Helpers.auth_url(CodebattleWeb.Endpoint, :token,
                  t: user.auth_token
                ) %>
              </td>
              <td><%= user.inserted_at %></td>
              <td>
                <button class="btn btn-sm btn-primary" phx-click="reset_token" phx-value-id={user.id}>
                  Reset Auth
                </button>
              </td>
              <td>
                <.form
                  :let={f}
                  id={"user-#{user.id}"}
                  for={Ecto.Changeset.change(user)}
                  phx-change="update_subscription_type"
                  phx-submit="update"
                  class="col-12 col-md-8 col-lg-8 col-xl-8 offset-md-2 offset-lg-2 offset-xl-2"
                >
                  <%= hidden_input(f, :user_id, value: user.id) %>
                  <%= select(f, :subscription_type, Codebattle.User.subscription_types(),
                    class: "custom-select"
                  ) %>
                </.form>
              </td>
            </tr>
          <% end %>
        </tbody>
      </table>
    </div>
    """
  end
end
