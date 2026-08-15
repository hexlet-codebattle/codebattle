defmodule CodebattleWeb.Live.Admin.User.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Clan
  alias Codebattle.User

  @impl true
  def mount(_params, _session, socket) do
    query = ""
    subscription_type = "all"

    {:ok,
     socket
     |> assign(
       users: [],
       clans: Clan.search(""),
       query: query,
       subscription_type: subscription_type,
       users_source: :search,
       layout: {CodebattleWeb.LayoutView, :admin}
     )
     |> load_users()}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    query = String.trim(query)

    {:noreply,
     socket
     |> assign(query: query, users_source: :search)
     |> load_users()}
  end

  def handle_event("filter_subscription_type", %{"subscription_type" => subscription_type}, socket) do
    {:noreply,
     socket
     |> assign(subscription_type: subscription_type)
     |> load_users()}
  end

  def handle_event("search_without_auth", _params, socket) do
    {:noreply,
     socket
     |> assign(users_source: :without_auth)
     |> load_users()}
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

  def handle_event("update_name", %{"user" => %{"name" => name, "user_id" => user_id}}, socket) do
    case User.update_name(user_id, name) do
      {:ok, user} ->
        users =
          Enum.map(socket.assigns.users, fn
            u when u.id == user.id -> user
            u -> u
          end)

        {:noreply,
         socket
         |> assign(users: users)
         |> put_flash(:info, "User name updated")}

      {:error, _reason} ->
        {:noreply, put_flash(socket, :error, "Failed to update user name")}
    end
  end

  def handle_event("update_clan", %{"user" => %{"clan_id" => clan_id, "user_id" => user_id}}, socket) do
    case User.update_clan(user_id, clan_id) do
      {:ok, user} ->
        users =
          Enum.map(socket.assigns.users, fn
            u when u.id == user.id -> user
            u -> u
          end)

        {:noreply, assign(socket, users: users)}

      {:error, _reason} ->
        {:noreply, put_flash(socket, :error, "Failed to update user clan")}
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
    <div class="cb-container-xl cb-bg-panel cb-shadow-sm cb-rounded cb-py-4 cb-mt-3">
      <h1 class="cb-text-white">User Management</h1>

      <div class="cb-d-flex cb-align-center cb-mb-3">
        <form
          id="user-search-form"
          phx-submit="search"
          phx-change="search"
          class="cb-d-flex cb-align-center"
        >
          <input
            class="cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded"
            type="text"
            name="query"
            value={@query}
            phx-debounce="300"
            placeholder="Search by name"
          />
          <button class="cb-btn cb-btn-secondary cb-rounded cb-ml-2" type="submit">
            Search
          </button>
        </form>
        <form id="subscription-type-filter-form" phx-change="filter_subscription_type" class="cb-ml-2">
          <select
            class="cb-custom-select cb-bg-panel cb-border-color cb-text-white cb-rounded"
            name="subscription_type"
            value={@subscription_type}
          >
            <option value="all">All subscriptions</option>
            <%= for type <- Codebattle.User.subscription_types() do %>
              <option value={Atom.to_string(type)}>{Atom.to_string(type)}</option>
            <% end %>
          </select>
        </form>
        <button
          class="cb-btn cb-btn-sm cb-btn-secondary cb-rounded cb-ml-2"
          phx-click="search_without_auth"
        >
          Show without auth
        </button>
      </div>

      <div class="cb-table-responsive">
        <table class="cb-table cb-table-sm">
          <thead class="cb-text">
            <tr>
              <th class="cb-border-color cb-border-bottom">Num</th>
              <th class="cb-border-color cb-border-bottom">Id</th>
              <th class="cb-border-color cb-border-bottom">Name</th>
              <th class="cb-border-color cb-border-bottom">Clan</th>
              <th class="cb-border-color cb-border-bottom">Change Clan</th>
              <th class="cb-border-color cb-border-bottom">Auth Link</th>
              <th class="cb-border-color cb-border-bottom">Joined</th>
              <th class="cb-border-color cb-border-bottom">Auth Reset</th>
              <th class="cb-border-color cb-border-bottom">Subscription</th>
            </tr>
          </thead>
          <tbody>
            <%= for {user, index} <- Enum.with_index(@users) do %>
              <tr>
                <% auth_token = normalize_auth_token(user.auth_token) %>
                <% auth_link = build_auth_link(auth_token) %>
                <td class="cb-align-middle cb-text-white cb-border-color">{index}</td>
                <td class="cb-align-middle cb-text-white cb-border-color">{user.id}</td>
                <td class="cb-align-middle cb-text-white cb-border-color">
                  <form
                    id={"user-name-#{user.id}"}
                    phx-submit="update_name"
                    class="cb-d-flex cb-align-center gap-2 cb-m-0"
                  >
                    <input type="hidden" name="user[user_id]" value={user.id} />
                    <input
                      type="text"
                      name="user[name]"
                      value={user.name}
                      minlength="2"
                      maxlength="39"
                      required
                      class="cb-form-control cb-form-control-sm cb-bg-panel cb-border-color cb-text-white cb-rounded"
                      style="min-width: 140px;"
                    />
                    <button type="submit" class="cb-btn cb-btn-sm cb-btn-secondary cb-rounded">
                      Save
                    </button>
                    <a
                      href={Routes.admin_user_show_view_path(@socket, :show, user.id)}
                      class="cb-text-primary cb-text-nowrap"
                    >
                      Profile
                    </a>
                  </form>
                </td>
                <td class="cb-align-middle cb-text-white cb-border-color">
                  {user.clan && String.slice(user.clan, 0, 20)}
                </td>
                <td class="cb-align-middle cb-text-white cb-border-color">
                  <.form
                    :let={f}
                    id={"user-clan-#{user.id}"}
                    for={Ecto.Changeset.change(user)}
                    phx-change="update_clan"
                    phx-submit="update"
                    class="cb-m-0"
                  >
                    {hidden_input(f, :user_id, value: user.id)}
                    {select(f, :clan_id, clan_options(@clans),
                      class: "cb-custom-select cb-bg-panel cb-border-color cb-text-white cb-rounded"
                    )}
                  </.form>
                </td>
                <td class="cb-align-middle cb-text-white cb-border-color">
                  <%= if auth_link do %>
                    <span class="cb-text-white cb-mr-2">
                      {short_auth_link_label(auth_link, auth_token)}
                    </span>
                    <button
                      type="button"
                      class="cb-btn cb-btn-sm cb-btn-secondary cb-rounded"
                      title="Copy auth link"
                      onclick="navigator.clipboard.writeText(this.dataset.link)"
                      data-link={auth_link}
                    >
                      Copy
                    </button>
                  <% else %>
                    <span class="cb-text">no link</span>
                  <% end %>
                </td>
                <td class="cb-align-middle cb-text-white cb-border-color">{user.inserted_at}</td>
                <td class="cb-align-middle cb-text-white cb-border-color">
                  <button
                    class="cb-btn cb-btn-sm cb-btn-secondary cb-rounded"
                    phx-click="reset_token"
                    phx-value-id={user.id}
                  >
                    Reset Auth
                  </button>
                </td>
                <td class="cb-align-middle cb-text-white cb-border-color">
                  <.form
                    :let={f}
                    id={"user-#{user.id}"}
                    for={Ecto.Changeset.change(user)}
                    phx-change="update_subscription_type"
                    phx-submit="update"
                    class="cb-m-0"
                  >
                    {hidden_input(f, :user_id, value: user.id)}
                    {select(f, :subscription_type, subscription_type_options(),
                      class: "cb-custom-select cb-bg-panel cb-border-color cb-text-white cb-rounded"
                    )}
                  </.form>
                </td>
              </tr>
            <% end %>
          </tbody>
        </table>
      </div>
    </div>
    """
  end

  defp filter_by_subscription_type(users, "all"), do: users

  defp filter_by_subscription_type(users, subscription_type) do
    case Enum.find(User.subscription_types(), &(Atom.to_string(&1) == subscription_type)) do
      nil ->
        users

      type ->
        Enum.filter(users, &(&1.subscription_type == type))
    end
  end

  defp load_users(socket) do
    case_result =
      case socket.assigns.users_source do
        :without_auth ->
          User.search_without_auth()

        _ ->
          User.search_users(socket.assigns.query)
      end

    users = filter_by_subscription_type(case_result, socket.assigns.subscription_type)

    assign(socket, users: users)
  end

  defp normalize_auth_token(nil), do: ""
  defp normalize_auth_token(token) when is_binary(token), do: String.trim(token)

  defp build_auth_link(""), do: nil

  defp build_auth_link(auth_token) do
    CodebattleWeb.Router.Helpers.auth_url(CodebattleWeb.Endpoint, :token, t: auth_token)
  end

  defp short_auth_token_label(auth_token) do
    visible_part = String.slice(auth_token, 0, 2)
    "?t=#{visible_part}..."
  end

  defp short_auth_link_label(auth_link, auth_token) do
    token_part = short_auth_token_label(auth_token)

    case String.split(auth_link, "?t=", parts: 2) do
      [base, _token] -> "#{base}#{token_part}"
      _other -> "#{auth_link} #{token_part}"
    end
  end

  defp subscription_type_options do
    Enum.map(User.subscription_types(), fn type ->
      {Atom.to_string(type), type}
    end)
  end

  defp clan_options(clans) do
    [{"No clan", ""} | Enum.map(clans, &{&1.name, &1.id})]
  end
end
