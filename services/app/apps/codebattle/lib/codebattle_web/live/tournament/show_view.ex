defmodule CodebattleWeb.Live.Tournament.ShowView do
  use CodebattleWeb, :live_view
  use Timex

  alias Codebattle.Chat
  alias Codebattle.Tournament
  alias CodebattleWeb.Live.Tournament.IndividualComponent
  alias CodebattleWeb.Live.Tournament.TeamComponent
  alias CodebattleWeb.Live.Tournament.StairwayComponent

  require Logger

  @update_frequency 1_000

  @impl true
  def mount(params, session, socket) do
    user_timezone = get_in(socket.private, [:connect_params, "timezone"]) || "UTC"

    tournament = session["tournament"]

    Codebattle.PubSub.subscribe(topic_name(tournament))
    Codebattle.PubSub.subscribe(chat_topic_name(tournament))

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       messages: get_chat_messages(tournament.id),
       next_round_time: get_next_round_time(tournament),
       rating_toggle: "hide",
       team_tournament_tab: "scores",
       tournament: tournament,
       user_timezone: user_timezone
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <%= if @current_user.is_guest do %>
      <h1 class="text-center"><%= @tournament.name %></h1>
      <p class="text-center">
        <span>
          Please <a href={Routes.session_path(@socket, :new, locale: :en)}>sign in</a>
          to see the tournament details
        </span>
      </p>
    <% else %>
      <div>
        <%= if @tournament.type == "individual" do %>
          <.live_component
            id="main-tournament"
            module={IndividualComponent}
            messages={@messages}
            tournament={@tournament}
            players={@tournament.players}
            current_user={@current_user}
            next_round_time={@next_round_time}
            user_timezone={@user_timezone}
          />
        <% end %>
        <%= if @tournament.type == "team" do %>
          <.live_component
            id="main-tournament"
            module={TeamComponent}
            messages={@messages}
            tournament={@tournament}
            players={@tournament.players}
            current_user={@current_user}
            next_round_time={@next_round_time}
            user_timezone={@user_timezone}
          />
        <% end %>
        <%= if @tournament.type == "stairway" do %>
          <.live_component
            id="main-tournament"
            module={StairwayComponent}
            messages={@messages}
            tournament={@tournament}
            players={@tournament.players}
            current_user={@current_user}
            next_round_time={@next_round_time}
            user_timezone={@user_timezone}
          />
        <% end %>
      </div>
    <% end %>
    """
  end

  # def render(assigns) do
  #   CodebattleWeb.TournamentView.render("old_show.html", assigns)
  # end

  @impl true
  def handle_info(:update_time, socket = %{assigns: %{next_round_timer_ref: nil}}) do
    {:noreply, socket}
  end

  def handle_info(:update_time, socket) do
    tournament = socket.assigns.tournament
    next_round_time = get_next_round_time(tournament)

    if next_round_time do
      {:noreply, assign(socket, next_round_time: next_round_time)}
    else
      :timer.cancel(socket.assigns.next_round_timer_ref)
      {:noreply, assign(socket, next_round_time: nil, next_round_timer_ref: nil)}
    end
  end

  def handle_info(:set_time_interval, socket) do
    {:ok, next_round_timer_ref} = :timer.send_interval(@update_frequency, self(), :update_time)
    {:noreply, assign(socket, next_round_timer_ref: next_round_timer_ref)}
  end

  def handle_info(%{topic: _topic, event: "tournament:updated", payload: payload}, socket) do
    {:noreply, assign(socket, tournament: payload.tournament)}
  end

  def handle_info(%{topic: _topic, event: "chat:updated", payload: payload}, socket) do
    {:noreply, assign(socket, messages: payload.messages)}
  end

  def handle_info(%{topic: _topic, event: "chat:new_msg", payload: payload}, socket) do
    {:noreply, assign(socket, messages: Enum.concat(socket.assigns.messages, [payload]))}
  end

  def handle_info(%{topic: _topic, event: "chat:user_banned", payload: _payload}, socket) do
    tournament = socket.assigns.tournament
    {:noreply, assign(socket, messages: get_chat_messages(tournament.id))}
  end

  def handle_info(%{event: "tournament:round_created", payload: payload}, socket) do
    payload.player_games
    |> Enum.find(&(&1.id == socket.assigns.current_user.id))
    |> case do
      %{game_id: game_id} ->
        {:noreply, redirect(socket, to: "/games/#{game_id}")}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_info(event, socket) do
    Logger.debug("CodebattleWeb.Live.Tournament.ShowView unexpected event #{inspect(event)}")
    {:noreply, socket}
  end

  @impl true
  def handle_event(_event, _params, %{assigns: %{current_user: %{is_guest: true}} = socket}) do
    {:noreply, socket}
  end

  def handle_event("join", %{"team_id" => team_id}, socket) do
    Tournament.Context.send_event(socket.assigns.tournament.id, :join, %{
      user: socket.assigns.current_user,
      team_id: String.to_integer(team_id)
    })

    {:noreply, socket}
  end

  def handle_event("join", _params, socket) do
    Tournament.Context.send_event(socket.assigns.tournament.id, :join, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_event("leave", _params, socket) do
    Tournament.Context.send_event(socket.assigns.tournament.id, :leave, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_event("kick", %{"user_id" => user_id}, socket) do
    if Tournament.Helpers.can_moderate?(socket.assigns.tournament, socket.assigns.current_user) do
      Tournament.Context.send_event(socket.assigns.tournament.id, :leave, %{
        user_id: String.to_integer(user_id)
      })
    end

    {:noreply, socket}
  end

  def handle_event("restart", _params, socket) do
    Tournament.Context.restart(socket.assigns.tournament)

    Tournament.Context.send_event(socket.assigns.tournament.id, :restart, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_event("open_up", _params, socket) do
    Tournament.Context.send_event(socket.assigns.tournament.id, :open_up, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_event("cancel", _params, socket) do
    if Tournament.Helpers.can_moderate?(socket.assigns.tournament, socket.assigns.current_user) do
      Tournament.Context.send_event(socket.assigns.tournament.id, :cancel, %{
        user: socket.assigns.current_user
      })
    end

    {:noreply, redirect(socket, to: "/tournaments")}
  end

  def handle_event("start", _params, socket) do
    if Tournament.Helpers.can_moderate?(socket.assigns.tournament, socket.assigns.current_user) do
      Tournament.Context.send_event(socket.assigns.tournament.id, :start, %{
        user: socket.assigns.current_user
      })
    end

    {:noreply, socket}
  end

  def handle_event("chat_ban_user", params, socket) do
    tournament = socket.assigns.tournament
    current_user = socket.assigns.current_user

    if Tournament.Helpers.can_moderate?(tournament, current_user) do
      Chat.ban_user(
        {:tournament, tournament.id},
        %{
          admin_name: current_user.name,
          name: params["name"],
          user_id: String.to_integer(params["user_id"])
        }
      )
    end

    {:noreply, socket}
  end

  def handle_event("chat_clean_banned", _, socket) do
    tournament = socket.assigns.tournament
    current_user = socket.assigns.current_user

    if Tournament.Helpers.can_moderate?(tournament, current_user) do
      Chat.clean_banned({:tournament, tournament.id})
    end

    {:noreply, socket}
  end

  def handle_event("chat_message", %{"message" => %{"text" => ""}}, socket),
    do: {:noreply, socket}

  def handle_event("chat_message", %{"message" => %{"text" => text}}, socket) do
    tournament = socket.assigns.tournament
    current_user = socket.assigns.current_user

    Chat.add_message({:tournament, tournament.id}, %{
      type: :text,
      user_id: current_user.id,
      name: current_user.name,
      text: text
    })

    {:noreply, push_event(socket, "clear", %{value: ""})}
  end

  def handle_event("toggle", params, socket) do
    target = String.to_atom(params["target"])
    {:noreply, assign(socket, target, params["event"])}
  end

  def handle_event("select_tab", params, socket) do
    target = String.to_atom(params["target"])
    {:noreply, assign(socket, target, params["tab"])}
  end

  def handle_event(_event, _params, socket) do
    {:noreply, socket}
  end

  defp get_next_round_time(tournament) do
    case tournament do
      %{state: "active", break_state: "break"} ->
        NaiveDateTime.add(tournament.last_round_ended_at, tournament.break_duration_seconds)

      %{state: "waiting_participants"} ->
        tournament.starts_at

      _ ->
        nil
    end
  end

  defp topic_name(tournament), do: "tournament:#{tournament.id}"
  defp chat_topic_name(tournament), do: "chat:tournament:#{tournament.id}"

  defp get_chat_messages(id) do
    Chat.get_messages({:tournament, id})
  end
end
