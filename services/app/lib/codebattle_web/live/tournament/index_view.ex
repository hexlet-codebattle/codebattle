defmodule CodebattleWeb.Live.Tournament.IndexView do
  use Phoenix.LiveView
  use Timex

  alias Codebattle.Tournament

  def render(assigns) do
    CodebattleWeb.TournamentView.render("index.html", assigns)
  end

  def mount(_params, session, socket) do
    Codebattle.PubSub.subscribe("tournaments")

    current_user = session["current_user"]

    {:ok,
     assign(socket,
       current_user: current_user,
       tournaments: session["tournaments"],
       langs: Codebattle.Languages.get_langs(),
       task_pack_names: Codebattle.TaskPack.list_visible(current_user) |> Enum.map(& &1.name),
       changeset: Codebattle.Tournament.changeset(%Codebattle.Tournament{})
     )}
  end

  def handle_event(_event, _params, %{assigns: %{current_user: %{is_guest: true}} = socket}) do
    {:noreply, socket}
  end

  def handle_event("validate", %{"tournament" => params}, socket) do
    creator = socket.assigns.current_user

    changeset = Tournament.Context.validate(Map.merge(params, %{"creator" => creator}))

    {:noreply, assign(socket, changeset: changeset)}
  end

  def handle_event("create", %{"tournament" => params}, socket) do
    creator = socket.assigns.current_user

    case Tournament.Context.create(Map.merge(params, %{"creator" => creator})) do
      {:ok, tournament} ->
        {:noreply,
         socket
         |> redirect(to: "/tournaments/#{tournament.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_info(%{topic: "tournaments"}, socket) do
    user = socket.assigns.current_user
    {:noreply, assign(socket, tournaments: Tournament.Context.list_live_and_finished(user))}
  end

  def handle_info(_, socket), do: {:noreply, socket}
end
