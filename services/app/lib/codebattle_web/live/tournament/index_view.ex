defmodule CodebattleWeb.Live.Tournament.IndexView do
  use Phoenix.LiveView
  use Timex

  @topic "tournaments"

  alias Codebattle.Tournament

  def render(assigns) do
    CodebattleWeb.TournamentView.render("index.html", assigns)
  end

  def mount(_params, session, socket) do
    Phoenix.PubSub.subscribe(:cb_pubsub, @topic)

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       tournaments: session["tournaments"],
       langs: Codebattle.Languages.get_langs(),
       changeset: Codebattle.Tournament.changeset(%Codebattle.Tournament{})
     )}
  end

  def handle_event("validate", %{"tournament" => params}, socket) do
    creator = socket.assigns.current_user

    changeset =
      %Tournament{}
      |> Tournament.changeset(Map.merge(params, %{"creator" => creator}))
      |> Map.put(:action, :insert)

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
end
