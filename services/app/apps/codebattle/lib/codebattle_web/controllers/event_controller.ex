defmodule CodebattleWeb.EventController do
  use CodebattleWeb, :controller

  plug CodebattleWeb.Plugs.AdminOnly

  alias Codebattle.Event

  def index(conn, _params) do
    conn
    |> put_meta_tags(%{title: "Codebattle Events"})
    |> render("index.html", %{events: Event.get_all(), user: conn.assigns.current_user})
  end

  def new(conn, _params) do
    conn
    |> put_meta_tags(%{title: "Codebattle Event"})
    |> render("new.html",
      changeset: Codebattle.Event.changeset(%Codebattle.Event{}),
      user: conn.assigns.current_user
    )
  end

  def show(conn, %{"id" => id}) do
    event = Event.get!(id)

    conn
    |> put_meta_tags(%{title: event.title})
    |> render("show.html", %{event: event, user: conn.assigns.current_user})
  end

  def create(conn, %{"event" => event_params}) do
    user = conn.assigns.current_user
    params = Map.put(event_params, "user_id", user.id)

    case Codebattle.Event.create(params) do
      {:ok, event} ->
        conn
        |> put_flash(:info, "Event created successfully.")
        |> redirect(to: Routes.event_path(conn, :show, event))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset, user: user)
    end
  end

  def update(conn, %{"id" => id, "event" => event_params}) do
    event = Event.get!(id)

    case Codebattle.Event.update(
           event,
           Map.put(event_params, "user_id", conn.assigns.current_user.id)
         ) do
      {:ok, event} ->
        conn
        |> put_flash(:info, "Event updated successfully.")
        |> redirect(to: Routes.event_path(conn, :edit, event.id))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", event: event, changeset: changeset)
    end
  end

  def edit(conn, %{"id" => id}) do
    event = Event.get!(id)

    changeset = Codebattle.Event.changeset(event)
    render(conn, "edit.html", event: event, changeset: changeset, user: conn.assigns.current_user)
  end

  def delete(conn, %{"id" => id}) do
    event = Event.get!(id)

    Event.delete(event)

    conn
    |> put_flash(:info, gettext("Event deleted!"))
    |> redirect(to: Routes.event_path(conn, :index))
  end
end
