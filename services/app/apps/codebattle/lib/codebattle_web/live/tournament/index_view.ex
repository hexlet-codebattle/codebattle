defmodule CodebattleWeb.Live.Tournament.IndexView do
  use CodebattleWeb, :live_view
  use Timex

  @default_timezone "Europe/Moscow"

  alias Codebattle.Tournament
  alias CodebattleWeb.Live.Tournament.CreateFormComponent

  @impl true
  def mount(_params, session, socket) do
    user_timezone = get_in(socket.private, [:connect_params, "timezone"]) || "UTC"

    Codebattle.PubSub.subscribe("tournaments")

    current_user = session["current_user"]

    {:ok,
     assign(socket,
       current_user: current_user,
       user_timezone: user_timezone,
       tournaments: session["tournaments"],
       langs: Runner.Languages.get_lang_slugs(),
       changeset: Codebattle.Tournament.changeset(%Codebattle.Tournament{})
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl bg-white shadow-sm rounded py-4 mb-3">
      <h1 class="text-center">Tournaments</h1>
      <div class="table-responsive mt-4">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>name</th>
              <th>type</th>
              <th>level</th>
              <th>state</th>
              <th>starts_at</th>
              <th>players</th>
              <th>actions</th>
            </tr>
          </thead>
          <tbody>
            <%= for tournament <- @tournaments do %>
              <tr>
                <td class="align-middle"><%= tournament.name %></td>
                <td class="align-middle text-nowrap"><%= tournament.type %></td>
                <td class="align-middle text-nowrap">
                  <img alt={tournament.level} src={"/assets/images/levels/#{tournament.level}.svg"} />
                </td>
                <td class="align-middle text-nowrap"><%= tournament.state %></td>
                <td class="align-middle text-nowrap">
                  <%= render_datetime(tournament.starts_at) %>
                </td>
                <td class="align-middle text-nowrap"></td>
                <td class="align-middle text-nowrap">
                  <%= link("Show",
                    to: Routes.tournament_path(@socket, :show, tournament.id),
                    class: "btn btn-success mt-2"
                  ) %>
                </td>
              </tr>
            <% end %>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex-1">
      <.live_component
        id="create-form"
        module={CreateFormComponent}
        changeset={@changeset}
        user_timezone={@user_timezone}
        langs={@langs}
        task_pack_names={@current_user |> Codebattle.TaskPack.list_visible() |> Enum.map(& &1.name)}
      />
    </div>
    """
  end

  @impl true
  def handle_event(_event, _params, socket = %{assigns: %{current_user: %{is_guest: true}}}) do
    {:noreply, socket}
  end

  @impl true
  def handle_event("validate", %{"tournament" => params}, socket) do
    creator = socket.assigns.current_user

    changeset = Tournament.Context.validate(Map.merge(params, %{"creator" => creator}))

    {:noreply, assign(socket, changeset: changeset)}
  end

  @impl true
  def handle_event("create", %{"tournament" => params}, socket) do
    params =
      Map.merge(
        params,
        %{
          "creator" => socket.assigns.current_user,
          "user_timezone" => socket.assigns.user_timezone
        }
      )

    case Tournament.Context.create(params) do
      {:ok, tournament} ->
        {:noreply,
         socket
         |> redirect(to: "/tournaments/#{tournament.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  @impl true
  def handle_info(%{topic: "tournaments"}, socket) do
    user = socket.assigns.current_user
    {:noreply, assign(socket, tournaments: Tournament.Context.list_live_and_finished(user))}
  end

  def handle_info(_, socket), do: {:noreply, socket}

  def render_datetime(nil), do: "none"

  def render_datetime(utc_datetime) do
    utc_datetime
    |> Timex.Timezone.convert(@default_timezone)
    |> Timex.format!("%Y-%m-%d %H:%M", :strftime)
  end
end
