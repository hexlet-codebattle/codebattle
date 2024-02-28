defmodule CodebattleWeb.PublicEventController do
  use CodebattleWeb, :controller

  alias Codebattle.Event

  def show(conn, %{"slug" => slug}) do
    event = Event.get_by_slug!(slug)

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
