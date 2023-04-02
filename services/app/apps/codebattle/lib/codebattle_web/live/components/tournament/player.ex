defmodule CodebattleWeb.Live.Tournament.PlayerComponent do
  use CodebattleWeb, :component

  attr(:render_score, :boolean, default: false)
  attr(:max_score, :integer, default: 0)
  attr(:player, :map)

  def render(assigns) do
    ~H"""
    <div class="d-flex align-items-center">
      <a class="d-inline-flex align-items-center" href={"/users/#{@player.id}"}>
        <img class="attachment rounded border mr-1 cb-user-avatar" src={@player.avatar_url} />
        <span class="mr-1 text-truncate" style="max-width: 130px;"><%= @player.name %></span>
      </a>
      <%= if @render_score do %>
        <span class="mr-1"><%= @player.score %>/<%= @max_score %></span>
      <% else %>
        <span class="mr-1"><%= @player.rating %></span>
      <% end %>
    </div>
    """
  end
end
