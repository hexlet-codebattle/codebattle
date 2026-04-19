defmodule Codebattle.ExternalPlatform.Fake do
  @moduledoc """
  Fake implementation of the external platform API for local dev and tests.
  Returns the same JSON-like map structures as the real sc service would.
  No HTTP calls are made.
  """

  def get_user_by_login(login) when is_binary(login) do
    login = String.trim(login)

    if login == "" do
      nil
    else
      %{id: "fake-user-#{login}", login: login}
    end
  end

  def get_user_by_login(_), do: nil

  def get_user_id_by_login(login) when is_binary(login) do
    case get_user_by_login(login) do
      %{id: id} -> id
      _ -> nil
    end
  end

  def get_user_id_by_login(_), do: nil

  @doc """
  Always returns :not_accepted so the invite flow stays at "invited" state
  until explicitly accepted. Use `accept_invite/1` to simulate acceptance
  for a specific login, or call `ExternalPlatformInvite.Context` directly in tests.
  """
  def check_invite(_login), do: {:error, :not_accepted}

  def create_invite(alias_name, _opts \\ []) when is_binary(alias_name) do
    alias_name = String.trim(alias_name)

    if alias_name == "" do
      {:error, :empty_alias}
    else
      invite_id = "fake-invite-#{:erlang.unique_integer([:positive])}"
      operation_id = "fake-op-#{:erlang.unique_integer([:positive])}"

      {:ok,
       %{
         "operation_id" => operation_id,
         "status_url" => "/operations/create-invites/id:#{operation_id}",
         "status" => "completed",
         "created_at" => DateTime.to_iso8601(DateTime.utc_now()),
         "response" => %{
           "invites" => [
             %{
               "id" => invite_id,
               "email" => "",
               "alias" => alias_name,
               "invite_link" => "https://fake-platform.test/invite/#{invite_id}",
               "status" => "pending",
               "expires_at" => DateTime.utc_now() |> DateTime.add(7, :day) |> DateTime.to_iso8601()
             }
           ],
           "errors" => []
         }
       }}
    end
  end

  def poll_invite_status(operation_id) when is_binary(operation_id) and operation_id != "" do
    invite_id = "fake-invite-for-#{operation_id}"

    {:ok,
     %{
       "operation_id" => operation_id,
       "status" => "completed",
       "created_at" => DateTime.to_iso8601(DateTime.utc_now()),
       "response" => %{
         "invites" => [
           %{
             "id" => invite_id,
             "email" => "",
             "alias" => "fake-user",
             "invite_link" => "https://fake-platform.test/invite/#{invite_id}",
             "status" => "pending",
             "expires_at" => DateTime.utc_now() |> DateTime.add(7, :day) |> DateTime.to_iso8601()
           }
         ],
         "errors" => []
       }
     }}
  end

  def poll_invite_status(_), do: {:error, :invalid_operation_id}

  def get_invite(invite_id) when is_binary(invite_id) and invite_id != "" do
    {:ok,
     %{
       "id" => invite_id,
       "status" => "accepted",
       "invite_link" => "https://fake-platform.test/invite/#{invite_id}",
       "invitee" => %{
         "id" => "fake-user-id-#{invite_id}",
         "slug" => "fake-user-slug"
       }
     }}
  end

  def get_invite(_), do: {:error, :invalid_invite_id}

  def create_repo_from_template(target_org_slug, opts \\ []) do
    slug = opts[:slug] || "unnamed"

    {:ok,
     %{
       "id" => "fake-repo-#{:erlang.unique_integer([:positive])}",
       "slug" => slug,
       "name" => Keyword.get(opts, :name, slug),
       "web_url" => "https://fake-platform.test/#{target_org_slug}/#{slug}",
       "visibility" => Keyword.get(opts, :visibility, "public")
     }}
  end

  def add_repo_role(_org_slug, _repo_slug, _user_id, _role, _opts \\ []) do
    {:ok, %{"status" => "ok"}}
  end

  def upsert_secret(_org_slug, _repo_slug, _key, _value, _opts \\ []) do
    {:ok, %{"status" => "ok"}}
  end
end
