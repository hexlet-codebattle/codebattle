defmodule CodebattleWeb.FormHelpers do
  @moduledoc """
  Conveniences for translating and building error messages.
  """
  use Phoenix.Component

  import Phoenix.HTML.Form

  @doc """
  A wrapper for inputs with conveniences.
  """
  def input_wrapper(assigns) do
    assigns = assign_new(assigns, :class, fn -> [] end)

    ~H"""
    <div
      phx-feedback-for={input_name(@form, @field)}
      class={[@class, if(@form.errors[@field], do: "show-errors", else: "")]}
    >
      <%= render_slot(@inner_block) %>
      <%= for error <- Keyword.get_values(@form.errors, @field) do %>
        <span class="hidden text-red-600 text-sm phx-form-error:block">
          <%= translate_error(error) %>
        </span>
      <% end %>
    </div>
    """
  end

  @doc """
  Translates an error message.
  """
  def translate_error({msg, opts}) do
    # Because the error messages we show in our forms and APIs
    # are defined inside Ecto, we need to translate them dynamically.
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", fn _ -> to_string(value) end)
    end)
  end
end
