defmodule Codebattle.UserGroupTournament.Context do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.ExternalPlatform
  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGroupTournament

  @default_repo_role "developer"
  @default_secret_group "ci"
  @default_secret_key "CODEBATTLE_AUTH_TOKEN"

  @spec get(pos_integer(), pos_integer()) :: UserGroupTournament.t() | nil
  def get(user_id, group_tournament_id) do
    UserGroupTournament
    |> where([record], record.user_id == ^user_id and record.group_tournament_id == ^group_tournament_id)
    |> Repo.one()
  end

  @spec list_users(pos_integer()) :: list(UserGroupTournament.t())
  def list_users(group_tournament_id) do
    UserGroupTournament
    |> where([record], record.group_tournament_id == ^group_tournament_id)
    |> preload(:user)
    |> order_by([record], desc: record.inserted_at)
    |> Repo.all()
  end

  @spec get_or_create(User.t(), GroupTournament.t()) :: UserGroupTournament.t()
  def get_or_create(%User{id: user_id} = user, %GroupTournament{id: group_tournament_id} = group_tournament) do
    case get(user_id, group_tournament_id) do
      nil ->
        attrs = defaults(user, group_tournament)

        {:ok, record} =
          %UserGroupTournament{}
          |> UserGroupTournament.changeset(attrs)
          |> Repo.insert()

        record

      record ->
        maybe_update_defaults(record, user, group_tournament)
    end
  end

  @spec ensure_external_setup(User.t(), GroupTournament.t()) ::
          {:ok, UserGroupTournament.t()} | {:error, term(), UserGroupTournament.t()}
  def ensure_external_setup(%User{} = user, %GroupTournament{run_on_external_platform: false} = group_tournament) do
    record = get_or_create(user, group_tournament)
    {:ok, record}
  end

  def ensure_external_setup(%User{} = user, %GroupTournament{} = group_tournament) do
    record = get_or_create(user, group_tournament)

    with {:ok, synced_user} <- ensure_platform_identity(user),
         synced_record = get_or_create(synced_user, group_tournament),
         {:ok, repo_record} <- ensure_repo(synced_record, group_tournament, synced_user),
         {:ok, role_record} <- ensure_role(repo_record, group_tournament, synced_user),
         {:ok, secret_record} <- ensure_secret(role_record, group_tournament, synced_user) do
      {:ok, finalize_ready(secret_record)}
    else
      {:error, reason, %UserGroupTournament{} = failed_record} ->
        {:error, reason, failed_record}

      {:error, reason} ->
        {:error, reason, fail_step(record, :repo, reason)}
    end
  end

  def repo_slug_for(%User{} = user, %GroupTournament{} = group_tournament) do
    login =
      case platform_identity_lookup_login(user) do
        "" ->
          user
          |> reload_user()
          |> platform_identity_lookup_login()

        resolved_login ->
          resolved_login
      end

    repo_slug(group_tournament.slug, login)
  end

  def repo_slug_for(_, %GroupTournament{} = group_tournament), do: group_tournament.slug

  @spec list_tokens(GroupTournament.t() | pos_integer(), keyword()) :: list(UserGroupTournament.t())
  def list_tokens(group_tournament_or_id, opts \\ [])

  def list_tokens(%GroupTournament{id: id}, opts), do: list_tokens(id, opts)

  def list_tokens(group_tournament_id, opts) do
    limit = Keyword.get(opts, :limit, 100)

    UserGroupTournament
    |> where([record], record.group_tournament_id == ^group_tournament_id and not is_nil(record.token))
    |> preload(:user)
    |> order_by([record], desc: record.updated_at, desc: record.id)
    |> limit(^limit)
    |> Repo.all()
  end

  @spec create_or_rotate_token(GroupTournament.t() | pos_integer(), pos_integer()) ::
          {:ok, UserGroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def create_or_rotate_token(%GroupTournament{id: id}, user_id), do: create_or_rotate_token(id, user_id)

  def create_or_rotate_token(group_tournament_id, user_id) do
    attrs = %{token: generate_token()}

    case get(user_id, group_tournament_id) do
      nil ->
        %UserGroupTournament{}
        |> UserGroupTournament.changeset(
          Map.merge(defaults(%User{id: user_id}, %GroupTournament{id: group_tournament_id}), attrs)
        )
        |> Repo.insert()

      record ->
        record
        |> UserGroupTournament.changeset(attrs)
        |> Repo.update()
    end
  end

  @spec get_or_create_token(GroupTournament.t() | pos_integer(), pos_integer()) ::
          {:ok, UserGroupTournament.t()} | {:error, Ecto.Changeset.t()}
  def get_or_create_token(%GroupTournament{id: id}, user_id), do: get_or_create_token(id, user_id)

  def get_or_create_token(group_tournament_id, user_id) do
    case get(user_id, group_tournament_id) do
      nil ->
        %UserGroupTournament{}
        |> UserGroupTournament.changeset(%{
          user_id: user_id,
          group_tournament_id: group_tournament_id,
          state: "pending",
          repo_state: "pending",
          role_state: "pending",
          secret_state: "pending",
          role: @default_repo_role,
          secret_key: @default_secret_key,
          secret_group: @default_secret_group,
          token: generate_token()
        })
        |> Repo.insert()

      %UserGroupTournament{token: token} = record when is_binary(token) and token != "" ->
        {:ok, record}

      record ->
        record
        |> UserGroupTournament.changeset(%{token: generate_token()})
        |> Repo.update()
    end
  end

  @spec get_token_by_value(String.t()) :: UserGroupTournament.t() | nil
  def get_token_by_value(token) when is_binary(token) do
    token = String.trim(token)

    UserGroupTournament
    |> preload(group_tournament: :group_task)
    |> Repo.get_by(token: token)
  end

  def get_token_by_value(_token), do: nil

  defp ensure_repo(%UserGroupTournament{repo_state: "completed"} = record, _group_tournament, _user), do: {:ok, record}

  defp ensure_repo(%UserGroupTournament{} = record, %GroupTournament{} = group_tournament, %User{} = user) do
    repo_slug = repo_slug_for(user, group_tournament)

    case create_repo_for_tournament(group_tournament, repo_slug) do
      {:ok, response} ->
        {:ok,
         update!(record, %{
           state: "provisioning",
           repo_state: "completed",
           repo_url: extract_repo_url(response),
           repo_response: response,
           last_error: %{}
         })}

      {:error, reason} ->
        {:error, reason, fail_step(record, :repo, reason)}
    end
  end

  defp ensure_role(%UserGroupTournament{role_state: "completed"} = record, _group_tournament, _user), do: {:ok, record}

  defp ensure_role(%UserGroupTournament{} = record, %GroupTournament{} = group_tournament, %User{} = user) do
    case resolve_platform_user_id(user) do
      {:ok, platform_user_id} ->
        case ExternalPlatform.add_repo_role(
               target_org_slug(),
               repo_slug_for(user, group_tournament),
               platform_user_id,
               record.role
             ) do
          {:ok, response} ->
            {:ok,
             update!(record, %{
               state: "provisioning",
               role_state: "completed",
               role_response: response,
               last_error: %{}
             })}

          {:error, reason} ->
            {:error, reason, fail_step(record, :role, reason)}
        end

      {:error, reason} ->
        {:error, reason, fail_step(record, :role, reason)}
    end
  end

  defp ensure_secret(%UserGroupTournament{secret_state: "completed"} = record, _group_tournament, _user),
    do: {:ok, record}

  defp ensure_secret(%UserGroupTournament{} = record, %GroupTournament{} = group_tournament, %User{} = user) do
    case get_or_create_token(group_tournament, user.id) do
      {:ok, token} ->
        case ExternalPlatform.upsert_secret(
               target_org_slug(),
               repo_slug_for(user, group_tournament),
               record.secret_key,
               token.token,
               secret_group: record.secret_group
             ) do
          {:ok, response} ->
            {:ok,
             update!(record, %{
               state: "provisioning",
               secret_state: "completed",
               secret_response: response,
               last_error: %{}
             })}

          {:error, reason} ->
            {:error, reason, fail_step(record, :secret, reason)}
        end

      {:error, reason} ->
        {:error, reason, fail_step(record, :secret, reason)}
    end
  end

  defp finalize_ready(%UserGroupTournament{state: "ready"} = record), do: record

  defp finalize_ready(%UserGroupTournament{} = record) do
    update!(record, %{state: "ready", last_error: %{}})
  end

  defp fail_step(%UserGroupTournament{} = record, :repo, reason) do
    update!(record, %{state: "failed", repo_state: "failed", last_error: serialize_error(reason)})
  end

  defp fail_step(%UserGroupTournament{} = record, :role, reason) do
    update!(record, %{state: "failed", role_state: "failed", last_error: serialize_error(reason)})
  end

  defp fail_step(%UserGroupTournament{} = record, :secret, reason) do
    update!(record, %{state: "failed", secret_state: "failed", last_error: serialize_error(reason)})
  end

  defp maybe_update_defaults(%UserGroupTournament{} = record, %User{} = user, %GroupTournament{} = group_tournament) do
    attrs = defaults(user, group_tournament)

    attrs_to_update = Map.take(attrs, [:role, :secret_key, :secret_group])

    update!(record, attrs_to_update)
  end

  defp defaults(%User{} = user, %GroupTournament{} = group_tournament) do
    %{
      user_id: user.id,
      group_tournament_id: group_tournament.id,
      state: "pending",
      repo_state: "pending",
      role_state: "pending",
      secret_state: "pending",
      repo_url: nil,
      role: @default_repo_role,
      secret_key: @default_secret_key,
      secret_group: @default_secret_group,
      token: generate_token()
    }
  end

  defp resolve_platform_user_id(%User{external_platform_id: platform_id})
       when is_binary(platform_id) and platform_id != "" do
    {:ok, platform_id}
  end

  defp resolve_platform_user_id(%User{}), do: {:error, :missing_external_platform_identity}

  defp repo_slug(group_tournament_slug, ""), do: group_tournament_slug
  defp repo_slug(group_tournament_slug, login), do: "#{group_tournament_slug}-#{login}"

  defp create_repo_for_tournament(%GroupTournament{template_id: template_id} = group_tournament, repo_slug)
       when is_binary(template_id) and template_id != "" do
    ExternalPlatform.create_repo_from_template(
      target_org_slug(),
      name: repo_slug,
      slug: repo_slug,
      description: group_tournament.description,
      template_id: template_id
    )
  end

  defp create_repo_for_tournament(_group_tournament, _repo_slug), do: {:error, %{error: "template_id is required"}}

  defp ensure_platform_identity(%User{} = user) do
    lookup_login = platform_identity_lookup_login(user)

    if lookup_login == "" do
      {:error, :missing_external_platform_identity_lookup}
    else
      case ExternalPlatform.get_user_by_login(lookup_login) do
        %{id: platform_id, login: platform_login} ->
          updated_user =
            user
            |> User.changeset(%{
              external_platform_id: platform_id,
              external_platform_login: platform_login
            })
            |> Repo.update!()

          {:ok, updated_user}

        _ ->
          {:error, :external_platform_user_not_found}
      end
    end
  end

  def can_lookup_platform_identity?(%User{} = user) do
    platform_identity_lookup_login(user) != ""
  end

  def can_lookup_platform_identity?(_), do: false

  defp target_org_slug do
    Application.get_env(:codebattle, :external_platform_org_slug)
  end

  defp platform_identity_lookup_login(%User{} = user) do
    normalize_login(user.external_platform_login || user.external_oauth_login)
  end

  defp reload_user(%User{id: user_id} = user) do
    Repo.get(User, user_id) || user
  end

  defp normalize_login(nil), do: ""
  defp normalize_login(login), do: login |> String.trim() |> String.downcase()

  defp update!(%UserGroupTournament{} = record, attrs) do
    record
    |> UserGroupTournament.changeset(attrs)
    |> Repo.update!()
  end

  defp extract_repo_url(%{"web_url" => repo_url}) when is_binary(repo_url) and repo_url != "", do: repo_url
  defp extract_repo_url(%{web_url: repo_url}) when is_binary(repo_url) and repo_url != "", do: repo_url
  defp extract_repo_url(%{"repo_url" => repo_url}) when is_binary(repo_url) and repo_url != "", do: repo_url
  defp extract_repo_url(%{repo_url: repo_url}) when is_binary(repo_url) and repo_url != "", do: repo_url
  defp extract_repo_url(%{"url" => repo_url}) when is_binary(repo_url) and repo_url != "", do: repo_url
  defp extract_repo_url(%{url: repo_url}) when is_binary(repo_url) and repo_url != "", do: repo_url
  defp extract_repo_url(_), do: nil

  defp serialize_error(reason) when is_map(reason), do: reason
  defp serialize_error(reason), do: %{"error" => inspect(reason)}

  defp generate_token do
    32
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end
end
