defmodule CodebattleWeb.Live.Tournament.StairwayRoundsComponent do
  use CodebattleWeb, :component

  alias CodebattleWeb.Live.Tournament.StairwayRoundComponent

  def render(assigns) do
    ~H"""
    <div class="col-12 mt-3">
      <nav>
        <div class="nav nav-tabs bg-gray" id="nav-tab" role="tablist">
          <%= for round_position <- 0..(@tournament.meta.rounds_limit - 1) do %>
            <a
              id={"round-tab-#{round_position}"}
              class={"flex-grow-1 nav-item nav-link rounded-0 text-black font-weight-bold cursor-pointer  text-center " <> default_tab_class(@tournament.current_round_position, round_position)}
              role="tab"
              phx-click={
                set_active_tab("#round-tab-#{round_position}")
                |> show_active_content("#content-round-tab-#{round_position}")
              }
            >
              Round <%= round_position %>
            </a>
          <% end %>
        </div>
      </nav>

      <div id="content" class="tab-body">
        <%= for round_position <- 0..(@tournament.meta.rounds_limit - 1) do %>
          <div
            id={"content-round-tab-#{round_position}"}
            class={"tab-content font-weight-light " <> default_content_class(@tournament.current_round_position, round_position)}
          >
            <StairwayRoundComponent.render
              tournament={@tournament}
              current_user_id={@current_user_id}
              current_round_position={@tournament.current_round_position}
              round_position={round_position}
              matches={Enum.at(@round_matches, round_position, [])}
            />
          </div>
        <% end %>
      </div>
    </div>
    """
  end

  def default_tab_class(current_round_position, round_position) do
    if current_round_position == round_position, do: "active", else: ""
  end

  def default_content_class(current_round_position, round_position) do
    if current_round_position == round_position, do: "", else: "hidden"
  end

  defp show_active_content(js, to) do
    js
    |> JS.hide(to: "div.tab-content")
    |> JS.show(to: to, transition: "fade-in-scale")
  end

  defp set_active_tab(js \\ %JS{}, tab) do
    js
    |> JS.remove_class("active", to: "a.nav-item")
    |> JS.add_class("active", to: tab)
  end
end
