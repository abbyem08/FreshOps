--
-- PostgreSQL database dump
--

\restrict M6Ea1ybyDzC1TqOzMS9Kn5eFzn1WJ4Aohu30Av8L9w2p68TKxtQ7PJWnNm6SLUc

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10 (Ubuntu 17.10-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
begin
    if not exists (
        select 1
        from pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from users where user_id = auth.uid() and active = true);
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: amendments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amendments (
    amendment_id integer NOT NULL,
    organization_id integer DEFAULT 1,
    jacket_id integer,
    order_line_id integer,
    jacket_product_line_id integer,
    freight_record_id integer,
    amendment_name text NOT NULL,
    amendment_type text NOT NULL,
    target_field text,
    original_value text,
    adjustment_value text,
    new_effective_value text,
    unit text,
    reason text,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    effective_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'Active'::text,
    reversed_by_amendment_id integer,
    target_table text,
    target_record_id text
);


--
-- Name: amendments_amendment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.amendments_amendment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: amendments_amendment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.amendments_amendment_id_seq OWNED BY public.amendments.amendment_id;


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text
);


--
-- Name: call_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_log (
    call_id integer NOT NULL,
    call_date date DEFAULT CURRENT_DATE,
    party_type text,
    supplier_id integer,
    customer_id integer,
    prospect_id integer,
    contact_name text,
    phone text,
    product_id integer,
    price numeric,
    price_type text,
    availability text,
    notes text,
    followup_date date,
    status text DEFAULT 'Quoted'::text,
    quote_expiration date,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT call_log_party_type_check CHECK ((party_type = ANY (ARRAY['Supplier'::text, 'Customer'::text, 'Prospect'::text]))),
    CONSTRAINT call_log_price_type_check CHECK ((price_type = ANY (ARRAY['FOB'::text, 'Delivered'::text]))),
    CONSTRAINT call_log_status_check CHECK ((status = ANY (ARRAY['Quoted'::text, 'Follow-up'::text, 'Booked'::text, 'Passed'::text])))
);


--
-- Name: call_log_call_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_log_call_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_log_call_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_log_call_id_seq OWNED BY public.call_log.call_id;


--
-- Name: carriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carriers (
    carrier_id integer NOT NULL,
    name text NOT NULL,
    mc_number text,
    dot_number text,
    insurance_expiry date,
    contact text,
    phone text,
    active boolean DEFAULT true
);


--
-- Name: carriers_carrier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carriers_carrier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carriers_carrier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carriers_carrier_id_seq OWNED BY public.carriers.carrier_id;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claims (
    claim_id integer NOT NULL,
    jacket_line_id integer,
    claim_type text,
    description text,
    date_opened date DEFAULT CURRENT_DATE,
    status text DEFAULT 'Open'::text,
    resolution text,
    flag_for_credit_memo boolean DEFAULT false,
    resolution_price_adjustment numeric,
    resolved_at timestamp with time zone,
    snapshot_jacket_number text,
    snapshot_order_no text,
    snapshot_customer text,
    snapshot_commodity text
);


--
-- Name: claims_claim_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.claims_claim_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: claims_claim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.claims_claim_id_seq OWNED BY public.claims.claim_id;


--
-- Name: customer_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_locations (
    location_id integer NOT NULL,
    customer_id integer,
    label text NOT NULL,
    address text,
    city text,
    state text,
    zip text,
    contact text,
    phone text,
    notes text,
    is_primary boolean DEFAULT false
);


--
-- Name: customer_locations_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_locations_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_locations_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_locations_location_id_seq OWNED BY public.customer_locations.location_id;


--
-- Name: customer_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_notifications (
    notification_id integer NOT NULL,
    jacket_line_id integer,
    notification_type text NOT NULL,
    notified_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_notifications_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_notifications_notification_id_seq OWNED BY public.customer_notifications.notification_id;


--
-- Name: customer_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_orders (
    customer_order_id integer NOT NULL,
    acumatica_order_no text,
    customer_id integer,
    customer_po text,
    order_date date,
    requested_delivery date,
    salesperson text,
    order_status text DEFAULT 'Open'::text,
    source text DEFAULT 'Internal'::text,
    notes text,
    customer_location_id integer,
    order_type text DEFAULT 'Produce Sale'::text,
    organization_id integer DEFAULT 1,
    CONSTRAINT customer_orders_order_type_check CHECK ((order_type = ANY (ARRAY['Produce Sale'::text, 'Freight Only'::text]))),
    CONSTRAINT customer_orders_source_check CHECK ((source = ANY (ARRAY['Internal'::text, 'Portal Request'::text])))
);


--
-- Name: customer_orders_customer_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_orders_customer_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_orders_customer_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_orders_customer_order_id_seq OWNED BY public.customer_orders.customer_order_id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    customer_id integer NOT NULL,
    company text NOT NULL,
    buyer_contact text,
    phone text,
    email text,
    delivery_address text,
    city text,
    state text,
    zip text,
    delivery_notes text,
    payment_terms text,
    notes text,
    active boolean DEFAULT true,
    portal_auth_id uuid,
    portal_invited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    organization_id integer DEFAULT 1
);


--
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.customers.customer_id;


--
-- Name: financial_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_adjustments (
    adjustment_id integer NOT NULL,
    jacket_id integer,
    adjustment_type text NOT NULL,
    description text,
    amount numeric NOT NULL,
    direction text NOT NULL,
    adjustment_date date DEFAULT CURRENT_DATE,
    related_order_line_id integer,
    related_claim_id integer,
    related_freight_id integer,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT financial_adjustments_direction_check CHECK ((direction = ANY (ARRAY['Revenue'::text, 'Cost'::text])))
);


--
-- Name: financial_adjustments_adjustment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.financial_adjustments_adjustment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: financial_adjustments_adjustment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.financial_adjustments_adjustment_id_seq OWNED BY public.financial_adjustments.adjustment_id;


--
-- Name: freight_only_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freight_only_lines (
    freight_only_line_id integer NOT NULL,
    customer_order_id integer,
    jacket_id integer,
    product_id integer,
    commodity_description text,
    cases numeric,
    pallets numeric,
    weight numeric,
    customer_freight_charge numeric DEFAULT 0,
    allocated_freight_cost numeric DEFAULT 0,
    pickup_location text,
    delivery_location text,
    status text DEFAULT 'Planned'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: freight_only_lines_freight_only_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.freight_only_lines_freight_only_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: freight_only_lines_freight_only_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.freight_only_lines_freight_only_line_id_seq OWNED BY public.freight_only_lines.freight_only_line_id;


--
-- Name: freight_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freight_records (
    freight_id integer NOT NULL,
    jacket_id integer,
    quote_date date,
    carrier text,
    truck_type text,
    trip_type text,
    quoted_rate numeric,
    booked_rate numeric,
    miles numeric,
    status text DEFAULT 'Quoted'::text,
    carrier_invoice_number text,
    invoice_received boolean DEFAULT false,
    carrier_paid boolean DEFAULT false,
    notes text,
    extra_fees numeric DEFAULT 0,
    extra_fees_notes text,
    CONSTRAINT freight_records_trip_type_check CHECK ((trip_type = ANY (ARRAY['One Pick/One Drop'::text, 'Multi Pick/One Drop'::text, 'One Pick/Multi Drop'::text, 'Multi Pick/Multi Drop'::text])))
);


--
-- Name: freight_records_freight_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.freight_records_freight_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: freight_records_freight_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.freight_records_freight_id_seq OWNED BY public.freight_records.freight_id;


--
-- Name: jacket_commodity_loads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jacket_commodity_loads (
    id integer NOT NULL,
    jacket_id integer,
    product_id integer,
    actual_cases_loaded numeric DEFAULT 0,
    supplier_id integer
);


--
-- Name: jacket_commodity_loads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jacket_commodity_loads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jacket_commodity_loads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jacket_commodity_loads_id_seq OWNED BY public.jacket_commodity_loads.id;


--
-- Name: jacket_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jacket_documents (
    document_id integer NOT NULL,
    jacket_id integer,
    document_type text,
    file_name text NOT NULL,
    url text,
    notes text,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: jacket_documents_document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jacket_documents_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jacket_documents_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jacket_documents_document_id_seq OWNED BY public.jacket_documents.document_id;


--
-- Name: jacket_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jacket_events (
    event_id integer NOT NULL,
    jacket_id integer,
    event_type text NOT NULL,
    description text NOT NULL,
    original_value text,
    adjustment text,
    new_value text,
    created_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: jacket_events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jacket_events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jacket_events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jacket_events_event_id_seq OWNED BY public.jacket_events.event_id;


--
-- Name: jacket_extras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jacket_extras (
    extra_id integer NOT NULL,
    jacket_id integer,
    product_id integer,
    cases numeric,
    status text DEFAULT 'Unsold'::text,
    notes text,
    resolution_notes text,
    CONSTRAINT jacket_extras_status_check CHECK ((status = ANY (ARRAY['Unsold'::text, 'Trying to Sell'::text, 'Sold'::text])))
);


--
-- Name: jacket_extras_extra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jacket_extras_extra_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jacket_extras_extra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jacket_extras_extra_id_seq OWNED BY public.jacket_extras.extra_id;


--
-- Name: jacket_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jacket_lines (
    jacket_line_id integer NOT NULL,
    jacket_id integer,
    order_line_id integer,
    planned_cases numeric,
    cases_to_load numeric,
    actual_cases_loaded numeric DEFAULT 0,
    actual_cases_delivered numeric DEFAULT 0,
    estimated_pallets numeric,
    line_weight numeric,
    load_status text DEFAULT 'Planned'::text,
    bol_number text,
    exception_notes text,
    pod_url text,
    updated_at timestamp with time zone DEFAULT now(),
    notes text,
    customer_notified_pickup boolean DEFAULT false,
    customer_notified_pickup_at timestamp with time zone,
    customer_notified_delivery boolean DEFAULT false,
    customer_notified_delivery_at timestamp with time zone,
    jacket_product_line_id integer,
    allocated_cost_per_case numeric,
    allocation_created_at timestamp with time zone DEFAULT now(),
    allocation_status text DEFAULT 'Active'::text,
    customer_notification_status text DEFAULT 'Not Loaded Yet'::text,
    customer_notification_status_at timestamp with time zone,
    quantity_updated_at timestamp with time zone,
    compensation_cases numeric DEFAULT 0,
    compensation_notes text,
    CONSTRAINT jacket_lines_customer_notification_status_check CHECK ((customer_notification_status = ANY (ARRAY['Not Loaded Yet'::text, 'Inloaded'::text, 'In Transit'::text, 'Delivered'::text, 'Cancelled'::text])))
);


--
-- Name: jacket_lines_jacket_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jacket_lines_jacket_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jacket_lines_jacket_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jacket_lines_jacket_line_id_seq OWNED BY public.jacket_lines.jacket_line_id;


--
-- Name: jacket_product_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jacket_product_lines (
    jacket_product_line_id integer NOT NULL,
    jacket_id integer,
    supplier_id integer,
    supplier_location_id integer,
    product_id integer,
    shipper_po text,
    purchased_cases numeric DEFAULT 0 NOT NULL,
    actual_cases_received numeric,
    purchase_cost_per_case numeric DEFAULT 0,
    fee_total_per_case numeric DEFAULT 0,
    product_status text DEFAULT 'Active'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT jacket_product_lines_actual_cases_received_check CHECK (((actual_cases_received IS NULL) OR (actual_cases_received >= (0)::numeric))),
    CONSTRAINT jacket_product_lines_purchased_cases_check CHECK ((purchased_cases >= (0)::numeric))
);


--
-- Name: jacket_product_lines_jacket_product_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jacket_product_lines_jacket_product_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jacket_product_lines_jacket_product_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jacket_product_lines_jacket_product_line_id_seq OWNED BY public.jacket_product_lines.jacket_product_line_id;


--
-- Name: jackets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jackets (
    jacket_id integer NOT NULL,
    jacket_number text NOT NULL,
    jacket_date date,
    carrier text,
    driver text,
    driver_phone text,
    truck text,
    trailer text,
    truck_type text,
    route text,
    jacket_status text DEFAULT 'Planning'::text,
    weight_capacity numeric DEFAULT 44000,
    pallet_capacity numeric DEFAULT 24,
    closed_at timestamp with time zone,
    notes text,
    supplier_payment_arrangement text,
    supplier_payment_status text DEFAULT 'Unpaid'::text,
    supplier_amount_paid numeric DEFAULT 0,
    supplier_payment_due_date date,
    supplier_payment_notes text,
    organization_id integer DEFAULT 1,
    CONSTRAINT jackets_jacket_status_check CHECK ((jacket_status = ANY (ARRAY['Planning'::text, 'Booked'::text, 'Loading'::text, 'Dispatched'::text, 'In Transit'::text, 'Delivered'::text, 'Closed'::text, 'Cancelled'::text])))
);


--
-- Name: jackets_jacket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jackets_jacket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jackets_jacket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jackets_jacket_id_seq OWNED BY public.jackets.jacket_id;


--
-- Name: order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_lines (
    order_line_id integer NOT NULL,
    customer_order_id integer,
    supplier_id integer,
    shipper_po text,
    product_id integer,
    cases_ordered numeric NOT NULL,
    sell_price_per_case numeric,
    fob_cost_per_case numeric,
    pricing_type text,
    line_status text DEFAULT 'Open'::text,
    notes text,
    supplier_location_id integer,
    original_cases_ordered numeric,
    original_sell_price_per_case numeric,
    original_fob_cost_per_case numeric,
    amendment_notes text,
    amended_at timestamp with time zone,
    source_price_sheet_line_id integer,
    price_snapshot jsonb,
    CONSTRAINT order_lines_pricing_type_check CHECK ((pricing_type = ANY (ARRAY['FOB'::text, 'Delivered'::text])))
);


--
-- Name: order_lines_order_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_lines_order_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_lines_order_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_lines_order_line_id_seq OWNED BY public.order_lines.order_line_id;


--
-- Name: order_request_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_request_lines (
    request_line_id integer NOT NULL,
    request_id integer,
    product_id integer,
    cases_requested numeric NOT NULL,
    notes text
);


--
-- Name: order_request_lines_request_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_request_lines_request_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_request_lines_request_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_request_lines_request_line_id_seq OWNED BY public.order_request_lines.request_line_id;


--
-- Name: order_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_requests (
    request_id integer NOT NULL,
    customer_id integer,
    requested_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'Pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    converted_order_id integer,
    notes text,
    CONSTRAINT order_requests_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text])))
);


--
-- Name: order_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_requests_request_id_seq OWNED BY public.order_requests.request_id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    organization_id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: organizations_organization_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_organization_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_organization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_organization_id_seq OWNED BY public.organizations.organization_id;


--
-- Name: price_sheet_line_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sheet_line_fees (
    fee_id integer NOT NULL,
    price_sheet_line_id integer,
    description text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    basis text DEFAULT 'per_case'::text NOT NULL,
    notes text,
    CONSTRAINT price_sheet_line_fees_basis_check CHECK ((basis = ANY (ARRAY['per_case'::text, 'per_pallet'::text, 'per_load'::text, 'flat'::text, 'percentage'::text])))
);


--
-- Name: price_sheet_line_fees_fee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_sheet_line_fees_fee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_sheet_line_fees_fee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_sheet_line_fees_fee_id_seq OWNED BY public.price_sheet_line_fees.fee_id;


--
-- Name: price_sheet_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sheet_lines (
    price_sheet_line_id integer NOT NULL,
    price_sheet_id integer,
    product_id integer,
    cost_price numeric,
    margin_pct numeric DEFAULT 20,
    source_call_id integer,
    supplier_id integer,
    markup_type text DEFAULT 'percent'::text,
    markup_dollar numeric DEFAULT 0,
    est_carrier_cost_per_pallet numeric DEFAULT 0,
    customer_freight_per_case numeric DEFAULT 0,
    CONSTRAINT price_sheet_lines_markup_type_check CHECK ((markup_type = ANY (ARRAY['percent'::text, 'dollar'::text])))
);


--
-- Name: price_sheet_lines_price_sheet_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_sheet_lines_price_sheet_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_sheet_lines_price_sheet_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_sheet_lines_price_sheet_line_id_seq OWNED BY public.price_sheet_lines.price_sheet_line_id;


--
-- Name: price_sheet_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sheet_recipients (
    price_sheet_recipient_id integer NOT NULL,
    price_sheet_id integer,
    customer_id integer,
    sent_at timestamp with time zone DEFAULT now(),
    method text DEFAULT 'Portal Link'::text,
    contact_email text,
    contact_phone text
);


--
-- Name: price_sheet_recipients_price_sheet_recipient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_sheet_recipients_price_sheet_recipient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_sheet_recipients_price_sheet_recipient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_sheet_recipients_price_sheet_recipient_id_seq OWNED BY public.price_sheet_recipients.price_sheet_recipient_id;


--
-- Name: price_sheet_snapshot_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sheet_snapshot_lines (
    snapshot_line_id integer NOT NULL,
    snapshot_id integer,
    product_id integer,
    supplier_id integer,
    commodity text,
    pack_size text,
    raw_cost numeric,
    fee_total numeric,
    internal_cost numeric,
    customer_fob numeric,
    customer_delivered numeric,
    est_carrier_cost_per_pallet numeric,
    customer_freight_per_case numeric
);


--
-- Name: price_sheet_snapshot_lines_snapshot_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_sheet_snapshot_lines_snapshot_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_sheet_snapshot_lines_snapshot_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_sheet_snapshot_lines_snapshot_line_id_seq OWNED BY public.price_sheet_snapshot_lines.snapshot_line_id;


--
-- Name: price_sheet_snapshot_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sheet_snapshot_recipients (
    id integer NOT NULL,
    snapshot_id integer,
    customer_id integer,
    contact_email text,
    contact_phone text
);


--
-- Name: price_sheet_snapshot_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_sheet_snapshot_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_sheet_snapshot_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_sheet_snapshot_recipients_id_seq OWNED BY public.price_sheet_snapshot_recipients.id;


--
-- Name: price_sheet_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sheet_snapshots (
    snapshot_id integer NOT NULL,
    price_sheet_id integer,
    sheet_date date,
    valid_through date,
    saved_at timestamp with time zone DEFAULT now(),
    notes text
);


--
-- Name: price_sheet_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_sheet_snapshots_snapshot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_sheet_snapshots_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_sheet_snapshots_snapshot_id_seq OWNED BY public.price_sheet_snapshots.snapshot_id;


--
-- Name: price_sheets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sheets (
    price_sheet_id integer NOT NULL,
    sheet_date date DEFAULT CURRENT_DATE,
    valid_through date,
    created_by uuid,
    notes text
);


--
-- Name: price_sheets_price_sheet_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_sheets_price_sheet_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_sheets_price_sheet_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_sheets_price_sheet_id_seq OWNED BY public.price_sheets.price_sheet_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    product_id integer NOT NULL,
    commodity text NOT NULL,
    pack_size text NOT NULL,
    gross_weight_per_case numeric,
    cases_per_pallet integer,
    default_origin text,
    notes text,
    active boolean DEFAULT true
);


--
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_product_id_seq OWNED BY public.products.product_id;


--
-- Name: prospects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prospects (
    prospect_id integer NOT NULL,
    prospect_type text NOT NULL,
    company text NOT NULL,
    contact text,
    phone text,
    email text,
    status text DEFAULT 'New'::text,
    last_contact_date date,
    next_followup_date date,
    notes text,
    converted_to_id integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prospects_prospect_type_check CHECK ((prospect_type = ANY (ARRAY['Customer'::text, 'Supplier'::text]))),
    CONSTRAINT prospects_status_check CHECK ((status = ANY (ARRAY['New'::text, 'Contacted'::text, 'Quoted'::text, 'Negotiating'::text, 'Won'::text, 'Lost'::text])))
);


--
-- Name: prospects_prospect_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prospects_prospect_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prospects_prospect_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prospects_prospect_id_seq OWNED BY public.prospects.prospect_id;


--
-- Name: status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_history (
    history_id integer NOT NULL,
    entity_type text,
    entity_id integer NOT NULL,
    old_status text,
    new_status text,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now()
);


--
-- Name: status_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.status_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: status_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.status_history_history_id_seq OWNED BY public.status_history.history_id;


--
-- Name: stop_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stop_lines (
    stop_line_id integer NOT NULL,
    stop_id integer,
    jacket_line_id integer,
    cases_at_stop numeric,
    pallets_at_stop numeric,
    notes text
);


--
-- Name: stop_lines_stop_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stop_lines_stop_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stop_lines_stop_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stop_lines_stop_line_id_seq OWNED BY public.stop_lines.stop_line_id;


--
-- Name: stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stops (
    stop_id integer NOT NULL,
    jacket_id integer,
    stop_number integer,
    stop_type text,
    supplier_id integer,
    customer_id integer,
    address text,
    contact text,
    phone text,
    appointment timestamp with time zone,
    status text DEFAULT 'Planned'::text,
    notes text,
    supplier_location_id integer,
    customer_location_id integer,
    CONSTRAINT stops_stop_type_check CHECK ((stop_type = ANY (ARRAY['Pickup'::text, 'Delivery'::text])))
);


--
-- Name: stops_stop_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stops_stop_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stops_stop_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stops_stop_id_seq OWNED BY public.stops.stop_id;


--
-- Name: supplier_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_locations (
    location_id integer NOT NULL,
    supplier_id integer,
    label text NOT NULL,
    address text,
    city text,
    state text,
    zip text,
    contact text,
    phone text,
    notes text,
    is_primary boolean DEFAULT false
);


--
-- Name: supplier_locations_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_locations_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_locations_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_locations_location_id_seq OWNED BY public.supplier_locations.location_id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    supplier_id integer NOT NULL,
    company text NOT NULL,
    contact text,
    phone text,
    email text,
    pickup_address text,
    city text,
    state text,
    zip text,
    payment_terms text,
    paca_license text,
    notes text,
    active boolean DEFAULT true,
    per_case_fee numeric DEFAULT 0,
    per_case_fee_notes text,
    organization_id integer DEFAULT 1
);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_supplier_id_seq OWNED BY public.suppliers.supplier_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'Sales'::text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    appearance_theme text DEFAULT 'freshops_light'::text,
    organization_id integer DEFAULT 1,
    CONSTRAINT users_appearance_theme_check CHECK ((appearance_theme = ANY (ARRAY['freshops_light'::text, 'command_center_dark'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['Admin'::text, 'Operations'::text, 'Sales'::text, 'ReadOnly'::text])))
);


--
-- Name: v_jacket_freight_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jacket_freight_summary WITH (security_invoker='true') AS
 SELECT f.freight_id,
    f.jacket_id,
    f.booked_rate,
    f.miles,
        CASE
            WHEN (f.miles > (0)::numeric) THEN (f.booked_rate / f.miles)
            ELSE NULL::numeric
        END AS rate_per_mile,
    COALESCE(sum(jl.actual_cases_loaded), (0)::numeric) AS loaded_cases,
        CASE
            WHEN (COALESCE(sum(jl.actual_cases_loaded), (0)::numeric) > (0)::numeric) THEN (f.booked_rate / sum(jl.actual_cases_loaded))
            ELSE NULL::numeric
        END AS freight_per_case
   FROM (public.freight_records f
     LEFT JOIN public.jacket_lines jl ON ((jl.jacket_id = f.jacket_id)))
  GROUP BY f.freight_id, f.jacket_id, f.booked_rate, f.miles;


--
-- Name: v_order_line_assignment; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_line_assignment WITH (security_invoker='true') AS
 SELECT ol.order_line_id,
    ol.cases_ordered,
    COALESCE(sum(jl.cases_to_load) FILTER (WHERE (j.jacket_status <> 'Cancelled'::text)), (0)::numeric) AS cases_assigned,
    (ol.cases_ordered - COALESCE(sum(jl.cases_to_load) FILTER (WHERE (j.jacket_status <> 'Cancelled'::text)), (0)::numeric)) AS remaining_to_assign
   FROM ((public.order_lines ol
     LEFT JOIN public.jacket_lines jl ON ((jl.order_line_id = ol.order_line_id)))
     LEFT JOIN public.jackets j ON ((j.jacket_id = jl.jacket_id)))
  GROUP BY ol.order_line_id, ol.cases_ordered;


--
-- Name: v_order_line_financials; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_line_financials WITH (security_invoker='true') AS
 SELECT order_line_id,
    (cases_ordered * sell_price_per_case) AS revenue,
    (cases_ordered * fob_cost_per_case) AS cost,
    ((cases_ordered * sell_price_per_case) - (cases_ordered * fob_cost_per_case)) AS gross_margin
   FROM public.order_lines ol;


--
-- Name: v_price_trend; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_price_trend WITH (security_invoker='true') AS
 SELECT product_id,
    call_date,
    min(price) AS low_price,
    max(price) AS high_price,
    avg(price) AS avg_price
   FROM public.call_log
  WHERE ((price IS NOT NULL) AND (party_type = ANY (ARRAY['Supplier'::text, 'Prospect'::text])))
  GROUP BY product_id, call_date
  ORDER BY product_id, call_date;


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone DEFAULT now()
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: amendments amendment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments ALTER COLUMN amendment_id SET DEFAULT nextval('public.amendments_amendment_id_seq'::regclass);


--
-- Name: call_log call_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log ALTER COLUMN call_id SET DEFAULT nextval('public.call_log_call_id_seq'::regclass);


--
-- Name: carriers carrier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carriers ALTER COLUMN carrier_id SET DEFAULT nextval('public.carriers_carrier_id_seq'::regclass);


--
-- Name: claims claim_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims ALTER COLUMN claim_id SET DEFAULT nextval('public.claims_claim_id_seq'::regclass);


--
-- Name: customer_locations location_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_locations ALTER COLUMN location_id SET DEFAULT nextval('public.customer_locations_location_id_seq'::regclass);


--
-- Name: customer_notifications notification_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notifications ALTER COLUMN notification_id SET DEFAULT nextval('public.customer_notifications_notification_id_seq'::regclass);


--
-- Name: customer_orders customer_order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders ALTER COLUMN customer_order_id SET DEFAULT nextval('public.customer_orders_customer_order_id_seq'::regclass);


--
-- Name: customers customer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);


--
-- Name: financial_adjustments adjustment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_adjustments ALTER COLUMN adjustment_id SET DEFAULT nextval('public.financial_adjustments_adjustment_id_seq'::regclass);


--
-- Name: freight_only_lines freight_only_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_only_lines ALTER COLUMN freight_only_line_id SET DEFAULT nextval('public.freight_only_lines_freight_only_line_id_seq'::regclass);


--
-- Name: freight_records freight_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_records ALTER COLUMN freight_id SET DEFAULT nextval('public.freight_records_freight_id_seq'::regclass);


--
-- Name: jacket_commodity_loads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_commodity_loads ALTER COLUMN id SET DEFAULT nextval('public.jacket_commodity_loads_id_seq'::regclass);


--
-- Name: jacket_documents document_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_documents ALTER COLUMN document_id SET DEFAULT nextval('public.jacket_documents_document_id_seq'::regclass);


--
-- Name: jacket_events event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_events ALTER COLUMN event_id SET DEFAULT nextval('public.jacket_events_event_id_seq'::regclass);


--
-- Name: jacket_extras extra_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_extras ALTER COLUMN extra_id SET DEFAULT nextval('public.jacket_extras_extra_id_seq'::regclass);


--
-- Name: jacket_lines jacket_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_lines ALTER COLUMN jacket_line_id SET DEFAULT nextval('public.jacket_lines_jacket_line_id_seq'::regclass);


--
-- Name: jacket_product_lines jacket_product_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_product_lines ALTER COLUMN jacket_product_line_id SET DEFAULT nextval('public.jacket_product_lines_jacket_product_line_id_seq'::regclass);


--
-- Name: jackets jacket_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jackets ALTER COLUMN jacket_id SET DEFAULT nextval('public.jackets_jacket_id_seq'::regclass);


--
-- Name: order_lines order_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN order_line_id SET DEFAULT nextval('public.order_lines_order_line_id_seq'::regclass);


--
-- Name: order_request_lines request_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_request_lines ALTER COLUMN request_line_id SET DEFAULT nextval('public.order_request_lines_request_line_id_seq'::regclass);


--
-- Name: order_requests request_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_requests ALTER COLUMN request_id SET DEFAULT nextval('public.order_requests_request_id_seq'::regclass);


--
-- Name: organizations organization_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN organization_id SET DEFAULT nextval('public.organizations_organization_id_seq'::regclass);


--
-- Name: price_sheet_line_fees fee_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_line_fees ALTER COLUMN fee_id SET DEFAULT nextval('public.price_sheet_line_fees_fee_id_seq'::regclass);


--
-- Name: price_sheet_lines price_sheet_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_lines ALTER COLUMN price_sheet_line_id SET DEFAULT nextval('public.price_sheet_lines_price_sheet_line_id_seq'::regclass);


--
-- Name: price_sheet_recipients price_sheet_recipient_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_recipients ALTER COLUMN price_sheet_recipient_id SET DEFAULT nextval('public.price_sheet_recipients_price_sheet_recipient_id_seq'::regclass);


--
-- Name: price_sheet_snapshot_lines snapshot_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_lines ALTER COLUMN snapshot_line_id SET DEFAULT nextval('public.price_sheet_snapshot_lines_snapshot_line_id_seq'::regclass);


--
-- Name: price_sheet_snapshot_recipients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_recipients ALTER COLUMN id SET DEFAULT nextval('public.price_sheet_snapshot_recipients_id_seq'::regclass);


--
-- Name: price_sheet_snapshots snapshot_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshots ALTER COLUMN snapshot_id SET DEFAULT nextval('public.price_sheet_snapshots_snapshot_id_seq'::regclass);


--
-- Name: price_sheets price_sheet_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheets ALTER COLUMN price_sheet_id SET DEFAULT nextval('public.price_sheets_price_sheet_id_seq'::regclass);


--
-- Name: products product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN product_id SET DEFAULT nextval('public.products_product_id_seq'::regclass);


--
-- Name: prospects prospect_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects ALTER COLUMN prospect_id SET DEFAULT nextval('public.prospects_prospect_id_seq'::regclass);


--
-- Name: status_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history ALTER COLUMN history_id SET DEFAULT nextval('public.status_history_history_id_seq'::regclass);


--
-- Name: stop_lines stop_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_lines ALTER COLUMN stop_line_id SET DEFAULT nextval('public.stop_lines_stop_line_id_seq'::regclass);


--
-- Name: stops stop_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops ALTER COLUMN stop_id SET DEFAULT nextval('public.stops_stop_id_seq'::regclass);


--
-- Name: supplier_locations location_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_locations ALTER COLUMN location_id SET DEFAULT nextval('public.supplier_locations_location_id_seq'::regclass);


--
-- Name: suppliers supplier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('public.suppliers_supplier_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at, custom_claims_allowlist) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
71811925-e13f-49ea-aa1f-af54e011a7ea	71811925-e13f-49ea-aa1f-af54e011a7ea	{"sub": "71811925-e13f-49ea-aa1f-af54e011a7ea", "email": "j.martinez347@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-07-29 01:23:19.335576+00	2026-07-29 01:23:19.33564+00	2026-07-29 01:23:19.33564+00	832657e0-bd22-445c-9f14-61937f930871
0c3c1159-e441-433d-9e57-48d45d170d4a	0c3c1159-e441-433d-9e57-48d45d170d4a	{"sub": "0c3c1159-e441-433d-9e57-48d45d170d4a", "email": "abbyem08@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-07-29 02:36:30.423831+00	2026-07-29 02:36:30.423889+00	2026-07-29 02:36:30.423889+00	1c6cbbf0-ecba-4ad7-a46c-1604fc3be8db
1f231474-dd97-48ce-9b37-525dec938e45	1f231474-dd97-48ce-9b37-525dec938e45	{"sub": "1f231474-dd97-48ce-9b37-525dec938e45", "email": "jmartinez@profreshsourcing.com", "email_verified": true, "phone_verified": false}	email	2026-07-29 19:58:05.426973+00	2026-07-29 19:58:05.427033+00	2026-07-29 19:58:05.427033+00	4d8cf169-282d-4a09-b9a3-6f52b69cfe85
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
51e317d1-2a2c-48d0-8180-d47ea73d906c	2026-07-29 02:12:29.316421+00	2026-07-29 02:12:29.316421+00	password	157a92cb-eaf9-4e0f-8468-af74dccda009
e64b2eea-99f2-4e18-aa14-1232acdf3708	2026-07-29 19:57:13.242561+00	2026-07-29 19:57:13.242561+00	password	1cfc453d-77ac-480b-89e0-34cadb47a0ac
c468ae98-b8d5-46fd-8184-a3f10c82ba1e	2026-07-29 20:07:30.15818+00	2026-07-29 20:07:30.15818+00	otp	1d19ccb5-c6cc-4ccb-af2b-4806a6f6cc67
7117aabc-a7c6-41b1-9fe2-6c534d56416e	2026-07-29 20:09:12.816656+00	2026-07-29 20:09:12.816656+00	password	455958de-b501-4d03-b7a4-1b1be7c49eb1
031a0534-11b3-4dd9-adef-5ca37083f24f	2026-07-30 01:56:01.007851+00	2026-07-30 01:56:01.007851+00	password	a16014d3-7246-4a51-a1ab-37d76713a220
f77c61ba-0127-4b36-ba26-5e9d224f89b1	2026-07-30 14:21:45.761633+00	2026-07-30 14:21:45.761633+00	password	40252cc2-2bcc-486d-a5ac-d4ce0bdce266
d8b94bd9-99ec-4723-8583-9d5c3464f730	2026-07-30 14:42:15.347085+00	2026-07-30 14:42:15.347085+00	password	01383582-8cdb-4e71-aeed-20899760bfea
7bb57633-f832-41a6-9505-eb4bf1f46787	2026-08-01 04:42:04.728313+00	2026-08-01 04:42:04.728313+00	password	13e3427b-6f06-42bf-8b48-b18e4b54b683
9e888a15-ea70-4c58-b6ab-9596ff2845f5	2026-08-01 04:42:44.747784+00	2026-08-01 04:42:44.747784+00	password	c05c78de-bcda-4c01-90be-ea7bb1233f33
5c7234b2-a55e-4a3b-bc7a-74da1a87676a	2026-08-01 04:57:04.769765+00	2026-08-01 04:57:04.769765+00	password	c2673631-0077-416d-b1db-fc0553c0e73c
3c1456d9-ad96-4be4-9c44-11d3996b4052	2026-08-01 05:02:10.169861+00	2026-08-01 05:02:10.169861+00	password	8408d66e-b782-4b5e-b5ac-bc6e60f387fb
f1794d54-769f-4e72-9e8c-131769f85143	2026-08-01 17:11:41.428976+00	2026-08-01 17:11:41.428976+00	password	0c2e3f5e-a22b-40dd-b4a3-0cb9048c4975
749d906e-9843-41a0-8efb-53b05367a4e3	2026-08-01 22:34:18.3521+00	2026-08-01 22:34:18.3521+00	password	3e383d28-863d-4f33-b1eb-a38afa9fe9de
1441e6de-d5fa-4c60-b80f-6495d99e3d0e	2026-08-02 00:49:51.361188+00	2026-08-02 00:49:51.361188+00	password	335af9c1-4742-4227-8e8f-7234dc460988
e46b62e5-2f7b-4af6-b1de-6d3c94006864	2026-08-02 05:10:31.8315+00	2026-08-02 05:10:31.8315+00	password	3d458b1c-807c-4a3f-a5eb-9d6b931df21f
67278499-671e-44e9-8088-0c6cce1521a9	2026-08-02 05:41:29.48983+00	2026-08-02 05:41:29.48983+00	password	5120f9bd-164c-422d-8904-31aff953fd5c
167eaa09-9db7-46f8-8535-89b9e5b70153	2026-08-02 05:59:38.167542+00	2026-08-02 05:59:38.167542+00	password	2ff7793c-8fb6-421c-8560-85d038a53442
a8339750-0dec-46c3-91d4-4ceeaf7abf87	2026-08-02 06:19:38.864259+00	2026-08-02 06:19:38.864259+00	password	2d76c632-5d3e-415b-b21a-670f36731527
1a06ff1f-14b9-418f-aaf8-18a0c0b42f4c	2026-08-02 07:08:32.168728+00	2026-08-02 07:08:32.168728+00	password	8ea9a673-92e5-4778-8bf4-833274dfb5d0
9d1d006e-9e11-4871-a772-1590dd68b345	2026-08-02 16:03:00.898297+00	2026-08-02 16:03:00.898297+00	password	6c8d8cc8-a8c9-4a4e-9a53-25c7c6a365cd
4589d75c-0a9f-4c2a-9f72-3efc348e09f1	2026-08-02 17:27:37.805001+00	2026-08-02 17:27:37.805001+00	password	70cf7a79-6323-4574-900c-dc9da6cbd72c
70d608b9-dadd-4c15-9f40-49f35fd80557	2026-08-02 17:55:20.193573+00	2026-08-02 17:55:20.193573+00	password	32fe9857-4e0d-45f3-99ac-cbf59fe88767
7f630b1a-efca-4427-9232-6a8fee97fdd2	2026-08-02 18:27:41.228658+00	2026-08-02 18:27:41.228658+00	password	842bfa9c-84f9-4665-a48d-d1fae0add54f
774ff68a-caa1-4ccb-82de-4b968da1bb68	2026-08-02 18:49:40.112903+00	2026-08-02 18:49:40.112903+00	password	f0b9e3c6-2886-4e5e-aacd-67a167523392
ad52f57f-c40d-499f-bca9-f88691bca98f	2026-08-02 21:08:12.662984+00	2026-08-02 21:08:12.662984+00	password	09bdecd7-0c39-44b6-bc6f-cd5291740254
23e15059-e62b-42de-8c33-ca1ab42b6436	2026-08-02 21:25:00.76896+00	2026-08-02 21:25:00.76896+00	password	91f9c80c-1f22-458f-b03b-614e827240fc
4547fc55-b33c-41dc-9a53-3bf97e96d9ce	2026-08-02 22:11:31.368851+00	2026-08-02 22:11:31.368851+00	password	28334c44-0b0a-4bc3-bb79-1cc0e7d2d691
a8a0fc8c-84a4-46de-afdc-6d3b1b024d81	2026-08-03 14:15:50.174053+00	2026-08-03 14:15:50.174053+00	password	6c8e3e70-14b9-4450-98b8-7d36562f4f91
4d937668-a7ea-4325-b739-511a618e3fa0	2026-08-03 14:21:09.336824+00	2026-08-03 14:21:09.336824+00	password	878bbaaf-cfee-4f9c-8802-62be1a7aae98
159cb6f8-6888-401d-ac4d-40422ffe037c	2026-08-03 15:03:55.173204+00	2026-08-03 15:03:55.173204+00	password	5c3e12b2-b98e-4414-b122-0d9f2aa7a612
a82a2667-d762-4771-9951-2b6b23281938	2026-08-03 15:17:38.005278+00	2026-08-03 15:17:38.005278+00	password	d85cf021-3608-4b8e-8a84-14b3fbde76d2
9fe1cf44-5fba-4d8c-a55e-2903d2f4c3b4	2026-08-03 16:54:10.903496+00	2026-08-03 16:54:10.903496+00	password	bd0d3a2c-2be6-4806-8b8f-165975f1091f
cfa34501-ce90-40e3-90ad-a09ffad8f4f0	2026-08-03 20:04:24.727207+00	2026-08-03 20:04:24.727207+00	password	5c2bd85c-23c5-46b2-9340-68d4e32374bc
0e1302a0-7a3f-4601-b9cb-1fce8141646c	2026-08-03 20:16:46.824917+00	2026-08-03 20:16:46.824917+00	password	babda4f7-0fdf-49bf-b1dc-f3bfb966f2d8
d85e866f-9012-4d70-9f32-3bfcbda69a61	2026-08-03 20:17:40.779171+00	2026-08-03 20:17:40.779171+00	password	2610e66f-fff4-4576-bd63-da9715679384
8a48d331-e690-4e5e-b015-960ec42673a3	2026-08-03 20:21:23.955709+00	2026-08-03 20:21:23.955709+00	password	1ee31a84-6fca-4ee9-befc-fdef3fd81b24
e942d51a-d729-47d4-a33c-2a0957907a4c	2026-08-04 13:21:17.652454+00	2026-08-04 13:21:17.652454+00	password	05d5e4d6-17b6-40df-9e18-cc563bffd113
d8d76593-eee8-4d3c-99b8-120cd39adaef	2026-08-04 22:58:35.926748+00	2026-08-04 22:58:35.926748+00	password	60649e77-f639-40dc-b2c8-fa30ee0db756
d53548f7-e3cb-43ba-b32c-8e4f5e27ff52	2026-08-05 00:29:25.974489+00	2026-08-05 00:29:25.974489+00	password	1ad46d97-200e-4fcc-898a-91acc43b6c03
f434aad8-4320-4e34-8039-99d7acbfd821	2026-08-05 02:50:36.894285+00	2026-08-05 02:50:36.894285+00	password	b83c5cf2-b5a5-4d9a-b859-e721a6e19ec9
eefde238-218a-4b89-af88-b7f3ea4f5c47	2026-08-05 03:48:50.642491+00	2026-08-05 03:48:50.642491+00	password	72ed15f5-c1b9-470c-bc8d-81c12366bead
a6ef8fb0-9d52-4132-96c9-95e095faf29d	2026-08-05 16:18:56.304063+00	2026-08-05 16:18:56.304063+00	password	d0139bb9-621c-4f74-9fef-5d3fd5228eee
a4322a85-c3a2-41a9-a4cf-1079da470f68	2026-08-05 16:42:30.378493+00	2026-08-05 16:42:30.378493+00	password	3e6d71d3-5f70-4adb-984a-b81bd1c9934a
52a5c59e-50e7-4de5-a181-5dd261fdfa4a	2026-08-05 18:53:28.465348+00	2026-08-05 18:53:28.465348+00	password	d3f57b69-77dc-4960-91ad-3d74188fede6
dff22676-ea45-4957-a56f-563dbc25d12b	2026-08-06 00:55:59.606741+00	2026-08-06 00:55:59.606741+00	password	7d37430f-3c73-4595-9805-dcc14d490043
41f778a1-0a40-4dc4-8f6f-92723bc0f77b	2026-08-06 01:07:47.844517+00	2026-08-06 01:07:47.844517+00	password	5a5585cd-45d0-41d0-970d-e69b01f87743
6e585c4c-9eab-4e83-9b24-7bd8ee2df360	2026-08-06 01:09:52.63042+00	2026-08-06 01:09:52.63042+00	password	b24920a1-c3c5-48b1-aad7-843cf5f772b9
2f46c09c-dde1-4543-a833-1557a0fb18d7	2026-08-06 03:37:44.858204+00	2026-08-06 03:37:44.858204+00	password	01683bb9-989a-41a4-860b-2b0db5406bd2
e73023e8-bebb-4fff-94a9-23fe83f386b5	2026-08-06 04:09:11.572882+00	2026-08-06 04:09:11.572882+00	password	8e2e4e99-c5fd-464c-ae9f-63dfdf806523
f50b1db2-44e9-4dd3-8276-c6589db20b51	2026-08-06 12:20:38.387951+00	2026-08-06 12:20:38.387951+00	password	2a1266d2-4b03-4623-9c19-e91f04671f16
d84dc376-6526-4d25-b5da-d9389ff247df	2026-08-06 12:51:37.52903+00	2026-08-06 12:51:37.52903+00	password	b6986da7-aa61-469b-b8cb-17e5528facb0
37a77f81-1c3f-4634-a7f9-afc7d48b4dae	2026-08-06 13:01:55.195995+00	2026-08-06 13:01:55.195995+00	password	4ab17c99-b05f-4664-b579-09204eae96e1
084d8586-5bf4-498b-ac7c-c852e3cebc34	2026-08-06 13:21:44.31386+00	2026-08-06 13:21:44.31386+00	password	f4f451ba-8f30-42b0-be86-1d0dbed522ef
d9f52f42-17f9-4a39-bd95-5eabd225ae31	2026-08-06 17:09:09.884532+00	2026-08-06 17:09:09.884532+00	password	f2aa1b4c-cb7d-4ff0-9b0e-7a349d73ccbb
ac2c3e40-b6f8-46ab-b591-982f443ae6b6	2026-08-06 20:06:46.353688+00	2026-08-06 20:06:46.353688+00	password	03721b21-5ba4-499c-96b1-be254dcc2d65
6c468ef1-2f03-4045-83fc-0543089f223a	2026-08-06 21:01:02.90417+00	2026-08-06 21:01:02.90417+00	password	284a9518-ef35-4062-bc2d-ee588abc6377
4d00c509-d20c-4461-8beb-d4224b871851	2026-08-06 21:09:57.343932+00	2026-08-06 21:09:57.343932+00	password	bcd4fe4b-cfb3-473a-b4fd-f7f8b6cd3401
46646045-29e7-4694-8936-788a41f789ae	2026-08-06 22:42:21.46756+00	2026-08-06 22:42:21.46756+00	password	988c89c5-ac08-460a-8ef4-c3c96e268282
629f5975-2181-4b52-a517-8f224bd37a4e	2026-08-06 22:44:22.049501+00	2026-08-06 22:44:22.049501+00	password	3247e967-fb94-4ec5-b1a6-4b40d2809aa2
ce12f461-154b-4f28-9d19-eee8749c55c4	2026-08-06 23:41:46.235147+00	2026-08-06 23:41:46.235147+00	password	60e8e284-4cae-487b-8199-612d5d2dfd8f
5b05a8ca-ab7d-483c-9c48-49c737bab4a3	2026-08-06 23:50:13.430108+00	2026-08-06 23:50:13.430108+00	password	b32d7ffe-bfa1-4fd2-bd28-7a22d7dafbe0
fa95d7b4-ca03-428c-a05d-4f62f25e902c	2026-08-06 23:53:05.451387+00	2026-08-06 23:53:05.451387+00	password	c11c9322-48d1-4d86-b4cc-abec9711344d
0a5542ca-8d6d-4df4-b831-1d6d1e2e915c	2026-08-07 00:06:39.079228+00	2026-08-07 00:06:39.079228+00	password	4fceae96-ae69-465b-87d3-264c3e15c209
7e38b947-c012-4be6-bddb-d8ccac788823	2026-08-07 00:08:44.524284+00	2026-08-07 00:08:44.524284+00	password	3bee80f5-4be3-40f4-9544-54596004ee6f
e9f18942-7423-4ae8-a633-691705f834a3	2026-08-07 00:58:57.809201+00	2026-08-07 00:58:57.809201+00	password	d1dbd95e-8959-4680-9225-492756386ba4
0e9d1979-7bda-447a-a6e7-5aacd49ae3c3	2026-08-07 02:24:50.032146+00	2026-08-07 02:24:50.032146+00	password	d3bc0304-59d8-4a60-879d-1410910b3995
4b489f6e-0096-4a8f-be52-dacdba931490	2026-08-07 12:59:57.595628+00	2026-08-07 12:59:57.595628+00	password	a92d0ee7-6476-40a4-aa9d-c8924886a2fd
f701ca4c-0f6c-43c2-91f0-ec1c4489bd46	2026-08-07 13:08:13.812846+00	2026-08-07 13:08:13.812846+00	password	d4efcd26-1fa6-42da-afd7-0bdb9fb41ea8
99cc1e51-0427-428f-a057-b9248c668f1f	2026-08-07 18:29:26.446117+00	2026-08-07 18:29:26.446117+00	password	4de89df7-3369-45d2-98ab-8eadd4b2aff3
57dc295e-33d5-44f3-822e-6d9cc07cf96a	2026-08-07 23:24:21.150113+00	2026-08-07 23:24:21.150113+00	password	9cdc5578-d72b-4e03-9379-11d09013c7fd
d5f1e71f-c253-405b-ae54-4b7a2109409b	2026-08-07 23:35:57.972937+00	2026-08-07 23:35:57.972937+00	password	c95b61c6-ee2d-4a14-a681-d4d157c25b29
fb516f1a-3dee-4e3e-b933-fe61f8ad23e6	2026-08-08 00:07:02.303187+00	2026-08-08 00:07:02.303187+00	password	d5bc7ee7-f5b3-40f4-a3f8-a5d06884e193
500cadff-e956-40ec-90f2-f564e1be4e78	2026-08-08 00:13:23.861793+00	2026-08-08 00:13:23.861793+00	password	b57e20b6-11a2-49a6-99fe-c62f41e20e7b
7b8cd9f7-e836-42f2-a8e0-22097fdc36a4	2026-08-08 04:18:32.238544+00	2026-08-08 04:18:32.238544+00	password	89882dfb-8e5d-4263-9e6f-4ce364c3ff43
210ba00a-bb7a-4339-b548-08c3f65ef32d	2026-08-08 04:19:46.694972+00	2026-08-08 04:19:46.694972+00	password	54a3050f-8897-4788-870d-377f21cf73c0
b318fe8d-53a4-484a-9b6a-7659c06790fe	2026-08-08 04:27:01.876526+00	2026-08-08 04:27:01.876526+00	password	cffb851b-d727-4e95-acb6-043064032e2a
6c325369-f503-4b4b-9932-d056a5ce286b	2026-08-08 04:29:20.884589+00	2026-08-08 04:29:20.884589+00	password	b9d2c8a0-ddc2-481b-987e-d4241e520622
7864451c-d8a0-4a41-aee6-d8f782feda2e	2026-08-08 04:59:00.002992+00	2026-08-08 04:59:00.002992+00	password	03d46dac-1200-40f5-94f6-d54ae1e45c5e
0b6b5a0b-3788-419d-993b-6bd6f0f4ef89	2026-08-08 04:59:17.876574+00	2026-08-08 04:59:17.876574+00	password	d567406f-a708-40fb-a3a2-376af04114b2
308dd2e1-2b5d-4ade-9a34-964cdd94f30d	2026-08-08 05:03:50.684387+00	2026-08-08 05:03:50.684387+00	password	a71e58e1-0170-43fc-a004-d8f4518b62df
7f467ad9-ede3-4560-9f41-6d60b7adf892	2026-08-08 05:13:59.949761+00	2026-08-08 05:13:59.949761+00	password	eaa404b9-3bb1-4c67-9c5f-3c0c42af411a
6a1afb3b-ceaf-47a5-af48-6178d210bfd6	2026-08-08 05:23:03.995664+00	2026-08-08 05:23:03.995664+00	password	5611f736-42c6-4039-be13-b07310ebfad1
af031d92-9512-43f5-bdb2-ddc4abb0abeb	2026-08-08 05:23:42.310055+00	2026-08-08 05:23:42.310055+00	password	81459e7e-eb0d-40c7-b59e-8bfc990b707b
5c77c016-7b2c-4cf7-b295-782734d9a0af	2026-08-08 12:06:12.89406+00	2026-08-08 12:06:12.89406+00	password	dd01edf3-0564-451c-882b-e8cddb6cef55
f67b3b54-e44f-43eb-9c40-8c796427452f	2026-08-08 12:15:44.966214+00	2026-08-08 12:15:44.966214+00	password	6f6ce52a-7bc3-4da6-8bf2-5fb4ca8c635b
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	2	rul2llqnvpwp	71811925-e13f-49ea-aa1f-af54e011a7ea	f	2026-07-29 02:12:29.313531+00	2026-07-29 02:12:29.313531+00	\N	51e317d1-2a2c-48d0-8180-d47ea73d906c
00000000-0000-0000-0000-000000000000	128	wtpgpxfrungn	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-03 20:17:40.77647+00	2026-08-03 20:17:40.77647+00	\N	d85e866f-9012-4d70-9f32-3bfcbda69a61
00000000-0000-0000-0000-000000000000	130	ym42lnlioapu	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-03 21:19:36.80007+00	2026-08-03 22:17:35.923428+00	46wkara6dy6o	8a48d331-e690-4e5e-b015-960ec42673a3
00000000-0000-0000-0000-000000000000	51	vdkpmlwnopo4	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-07-30 22:22:34.436165+00	2026-08-04 03:03:24.041763+00	aodwtiu5eduw	7117aabc-a7c6-41b1-9fe2-6c534d56416e
00000000-0000-0000-0000-000000000000	115	xkewqaqi3qzs	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-03 14:07:44.034346+00	2026-08-05 00:29:17.789403+00	exotl353zopn	23e15059-e62b-42de-8c33-ca1ab42b6436
00000000-0000-0000-0000-000000000000	127	5gxua5wlmj2b	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-03 20:16:46.813956+00	2026-08-05 20:52:16.422336+00	\N	0e1302a0-7a3f-4601-b9cb-1fce8141646c
00000000-0000-0000-0000-000000000000	72	thvbbxws6ngp	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-01 04:42:04.717351+00	2026-08-01 04:42:04.717351+00	\N	7bb57633-f832-41a6-9505-eb4bf1f46787
00000000-0000-0000-0000-000000000000	73	foojsaibjezy	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-01 04:42:44.740515+00	2026-08-01 04:42:44.740515+00	\N	9e888a15-ea70-4c58-b6ab-9596ff2845f5
00000000-0000-0000-0000-000000000000	75	qigrymy7g4gl	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-01 04:57:04.767018+00	2026-08-01 04:57:04.767018+00	\N	5c7234b2-a55e-4a3b-bc7a-74da1a87676a
00000000-0000-0000-0000-000000000000	22	px3jc4j7pl2f	71811925-e13f-49ea-aa1f-af54e011a7ea	f	2026-07-29 19:57:13.238345+00	2026-07-29 19:57:13.238345+00	\N	e64b2eea-99f2-4e18-aa14-1232acdf3708
00000000-0000-0000-0000-000000000000	23	vsv4gbk6clwj	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-07-29 20:07:30.150021+00	2026-07-29 20:07:30.150021+00	\N	c468ae98-b8d5-46fd-8184-a3f10c82ba1e
00000000-0000-0000-0000-000000000000	76	2j7pkvqjllvu	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-01 05:02:10.16232+00	2026-08-01 15:18:22.081075+00	\N	3c1456d9-ad96-4be4-9c44-11d3996b4052
00000000-0000-0000-0000-000000000000	80	rnf4mqryobux	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-01 15:18:22.095282+00	2026-08-01 15:18:22.095282+00	2j7pkvqjllvu	3c1456d9-ad96-4be4-9c44-11d3996b4052
00000000-0000-0000-0000-000000000000	28	m4cl5oasee7q	71811925-e13f-49ea-aa1f-af54e011a7ea	f	2026-07-30 01:56:00.996693+00	2026-07-30 01:56:00.996693+00	\N	031a0534-11b3-4dd9-adef-5ca37083f24f
00000000-0000-0000-0000-000000000000	24	qbtyp3ggu6qd	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-07-29 20:09:12.815012+00	2026-07-30 07:07:06.946866+00	\N	7117aabc-a7c6-41b1-9fe2-6c534d56416e
00000000-0000-0000-0000-000000000000	83	6vk22kxlyhaq	71811925-e13f-49ea-aa1f-af54e011a7ea	t	2026-08-01 17:11:41.412843+00	2026-08-01 18:10:22.302209+00	\N	f1794d54-769f-4e72-9e8c-131769f85143
00000000-0000-0000-0000-000000000000	35	brzia6h5ghop	71811925-e13f-49ea-aa1f-af54e011a7ea	f	2026-07-30 14:42:15.335456+00	2026-07-30 14:42:15.335456+00	\N	d8b94bd9-99ec-4723-8583-9d5c3464f730
00000000-0000-0000-0000-000000000000	32	4xzcz6rf7yhd	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-07-30 07:07:06.969909+00	2026-07-30 14:50:03.375095+00	qbtyp3ggu6qd	7117aabc-a7c6-41b1-9fe2-6c534d56416e
00000000-0000-0000-0000-000000000000	85	gscorxsnsveg	71811925-e13f-49ea-aa1f-af54e011a7ea	t	2026-08-01 18:10:22.309796+00	2026-08-01 21:30:46.396922+00	6vk22kxlyhaq	f1794d54-769f-4e72-9e8c-131769f85143
00000000-0000-0000-0000-000000000000	34	opfrwlhfedyx	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-07-30 14:21:45.752956+00	2026-07-30 16:48:48.544648+00	\N	f77c61ba-0127-4b36-ba26-5e9d224f89b1
00000000-0000-0000-0000-000000000000	88	4vmcch3zvfda	71811925-e13f-49ea-aa1f-af54e011a7ea	t	2026-08-01 21:30:46.416152+00	2026-08-01 22:29:15.414868+00	gscorxsnsveg	f1794d54-769f-4e72-9e8c-131769f85143
00000000-0000-0000-0000-000000000000	41	5m3ggs5okayf	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-07-30 16:48:48.545115+00	2026-07-30 18:57:45.66597+00	opfrwlhfedyx	f77c61ba-0127-4b36-ba26-5e9d224f89b1
00000000-0000-0000-0000-000000000000	43	577yihfjh6n5	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-07-30 18:57:45.680803+00	2026-07-30 18:57:45.680803+00	5m3ggs5okayf	f77c61ba-0127-4b36-ba26-5e9d224f89b1
00000000-0000-0000-0000-000000000000	91	t33gibivxtf7	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-01 22:34:18.342811+00	2026-08-01 23:33:04.176577+00	\N	749d906e-9843-41a0-8efb-53b05367a4e3
00000000-0000-0000-0000-000000000000	90	nckv7zwqk3ji	71811925-e13f-49ea-aa1f-af54e011a7ea	t	2026-08-01 22:29:15.421556+00	2026-08-02 00:25:06.008572+00	4vmcch3zvfda	f1794d54-769f-4e72-9e8c-131769f85143
00000000-0000-0000-0000-000000000000	92	5bvvxvifql5q	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-01 23:33:04.189572+00	2026-08-02 00:31:39.005827+00	t33gibivxtf7	749d906e-9843-41a0-8efb-53b05367a4e3
00000000-0000-0000-0000-000000000000	94	wpjvts3qyct2	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 00:31:39.019879+00	2026-08-02 00:31:39.019879+00	5bvvxvifql5q	749d906e-9843-41a0-8efb-53b05367a4e3
00000000-0000-0000-0000-000000000000	36	aodwtiu5eduw	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-07-30 14:50:03.382286+00	2026-07-30 22:22:34.421123+00	4xzcz6rf7yhd	7117aabc-a7c6-41b1-9fe2-6c534d56416e
00000000-0000-0000-0000-000000000000	95	rinipjgba72p	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-02 00:49:51.345122+00	2026-08-02 01:48:17.672622+00	\N	1441e6de-d5fa-4c60-b80f-6495d99e3d0e
00000000-0000-0000-0000-000000000000	96	vzal6wexhs53	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-02 01:48:17.697892+00	2026-08-02 05:07:16.90412+00	rinipjgba72p	1441e6de-d5fa-4c60-b80f-6495d99e3d0e
00000000-0000-0000-0000-000000000000	97	yc55oplacebe	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 05:07:16.915766+00	2026-08-02 05:07:16.915766+00	vzal6wexhs53	1441e6de-d5fa-4c60-b80f-6495d99e3d0e
00000000-0000-0000-0000-000000000000	98	4vqkma7fi7t7	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 05:10:31.817401+00	2026-08-02 05:10:31.817401+00	\N	e46b62e5-2f7b-4af6-b1de-6d3c94006864
00000000-0000-0000-0000-000000000000	99	2dfwlunvu6wk	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 05:41:29.471505+00	2026-08-02 05:41:29.471505+00	\N	67278499-671e-44e9-8088-0c6cce1521a9
00000000-0000-0000-0000-000000000000	100	pljw2imnlopq	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 05:59:38.158993+00	2026-08-02 05:59:38.158993+00	\N	167eaa09-9db7-46f8-8535-89b9e5b70153
00000000-0000-0000-0000-000000000000	101	3vi6g2fwatqx	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 06:19:38.848783+00	2026-08-02 06:19:38.848783+00	\N	a8339750-0dec-46c3-91d4-4ceeaf7abf87
00000000-0000-0000-0000-000000000000	102	xszem2avgskx	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-02 07:08:32.14776+00	2026-08-02 17:27:37.601598+00	\N	1a06ff1f-14b9-418f-aaf8-18a0c0b42f4c
00000000-0000-0000-0000-000000000000	104	pnffuxx6vs2y	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 17:27:37.617093+00	2026-08-02 17:27:37.617093+00	xszem2avgskx	1a06ff1f-14b9-418f-aaf8-18a0c0b42f4c
00000000-0000-0000-0000-000000000000	105	nsbvgola5uvf	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 17:27:37.801586+00	2026-08-02 17:27:37.801586+00	\N	4589d75c-0a9f-4c2a-9f72-3efc348e09f1
00000000-0000-0000-0000-000000000000	93	jvkz4q3zye24	71811925-e13f-49ea-aa1f-af54e011a7ea	t	2026-08-02 00:25:06.023003+00	2026-08-02 17:55:03.584255+00	nckv7zwqk3ji	f1794d54-769f-4e72-9e8c-131769f85143
00000000-0000-0000-0000-000000000000	106	toycchga6zzg	71811925-e13f-49ea-aa1f-af54e011a7ea	f	2026-08-02 17:55:03.610111+00	2026-08-02 17:55:03.610111+00	jvkz4q3zye24	f1794d54-769f-4e72-9e8c-131769f85143
00000000-0000-0000-0000-000000000000	107	finnwj2pl2zd	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 17:55:20.183669+00	2026-08-02 17:55:20.183669+00	\N	70d608b9-dadd-4c15-9f40-49f35fd80557
00000000-0000-0000-0000-000000000000	108	2zcye6vxmsei	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 18:27:41.193911+00	2026-08-02 18:27:41.193911+00	\N	7f630b1a-efca-4427-9232-6a8fee97fdd2
00000000-0000-0000-0000-000000000000	109	ffg7e46sx4ab	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-02 18:49:40.096236+00	2026-08-02 19:48:18.324396+00	\N	774ff68a-caa1-4ccb-82de-4b968da1bb68
00000000-0000-0000-0000-000000000000	111	cc63lbeadyax	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-02 21:08:12.650542+00	2026-08-02 21:08:12.650542+00	\N	ad52f57f-c40d-499f-bca9-f88691bca98f
00000000-0000-0000-0000-000000000000	110	6sqp4vxkgx6f	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-02 19:48:18.336119+00	2026-08-02 22:09:04.394778+00	ffg7e46sx4ab	774ff68a-caa1-4ccb-82de-4b968da1bb68
00000000-0000-0000-0000-000000000000	113	7oyzsmr7bky2	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-02 22:09:04.414271+00	2026-08-02 22:09:04.414271+00	6sqp4vxkgx6f	774ff68a-caa1-4ccb-82de-4b968da1bb68
00000000-0000-0000-0000-000000000000	112	exotl353zopn	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-02 21:25:00.755967+00	2026-08-03 14:07:44.009022+00	\N	23e15059-e62b-42de-8c33-ca1ab42b6436
00000000-0000-0000-0000-000000000000	114	scvr33ojpqex	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-02 22:11:31.355263+00	2026-08-03 14:15:49.618148+00	\N	4547fc55-b33c-41dc-9a53-3bf97e96d9ce
00000000-0000-0000-0000-000000000000	116	y55yyypjs7tl	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-03 14:15:49.625833+00	2026-08-03 14:15:49.625833+00	scvr33ojpqex	4547fc55-b33c-41dc-9a53-3bf97e96d9ce
00000000-0000-0000-0000-000000000000	117	fk6m5qku6w7s	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-03 14:15:50.162549+00	2026-08-03 14:15:50.162549+00	\N	a8a0fc8c-84a4-46de-afdc-6d3b1b024d81
00000000-0000-0000-0000-000000000000	103	moj6cf54cryz	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-02 16:03:00.867145+00	2026-08-03 15:17:34.659465+00	\N	9d1d006e-9e11-4871-a772-1590dd68b345
00000000-0000-0000-0000-000000000000	118	yftl2aztw2ti	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-03 14:21:09.329773+00	2026-08-03 14:21:09.329773+00	\N	4d937668-a7ea-4325-b739-511a618e3fa0
00000000-0000-0000-0000-000000000000	120	wsn2i3eih3q5	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-03 15:17:34.668249+00	2026-08-03 15:17:34.668249+00	moj6cf54cryz	9d1d006e-9e11-4871-a772-1590dd68b345
00000000-0000-0000-0000-000000000000	129	46wkara6dy6o	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-03 20:21:23.950315+00	2026-08-03 21:19:36.783717+00	\N	8a48d331-e690-4e5e-b015-960ec42673a3
00000000-0000-0000-0000-000000000000	119	mwia4dky66h4	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-03 15:03:55.143077+00	2026-08-03 16:02:31.09933+00	\N	159cb6f8-6888-401d-ac4d-40422ffe037c
00000000-0000-0000-0000-000000000000	122	sg2q2homel6j	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-03 16:02:31.114423+00	2026-08-03 16:02:31.114423+00	mwia4dky66h4	159cb6f8-6888-401d-ac4d-40422ffe037c
00000000-0000-0000-0000-000000000000	124	rbf2trowsyov	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-03 17:59:37.700247+00	2026-08-03 21:25:08.827174+00	o6phtjqxig52	9fe1cf44-5fba-4d8c-a55e-2903d2f4c3b4
00000000-0000-0000-0000-000000000000	123	o6phtjqxig52	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-03 16:54:10.878752+00	2026-08-03 17:59:37.686121+00	\N	9fe1cf44-5fba-4d8c-a55e-2903d2f4c3b4
00000000-0000-0000-0000-000000000000	121	g5gf4t3ztmzh	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-03 15:17:38.002999+00	2026-08-03 20:04:22.701797+00	\N	a82a2667-d762-4771-9951-2b6b23281938
00000000-0000-0000-0000-000000000000	125	76bmmyjjduso	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-03 20:04:22.721291+00	2026-08-03 20:04:22.721291+00	g5gf4t3ztmzh	a82a2667-d762-4771-9951-2b6b23281938
00000000-0000-0000-0000-000000000000	131	q5c6khkjhky3	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-03 21:25:08.835402+00	2026-08-03 22:23:34.860172+00	rbf2trowsyov	9fe1cf44-5fba-4d8c-a55e-2903d2f4c3b4
00000000-0000-0000-0000-000000000000	134	z7uj6ybuvrz2	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-04 03:03:24.058689+00	2026-08-04 03:03:24.058689+00	vdkpmlwnopo4	7117aabc-a7c6-41b1-9fe2-6c534d56416e
00000000-0000-0000-0000-000000000000	133	2eguacryw2zo	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-03 22:23:34.866948+00	2026-08-04 13:21:15.735834+00	q5c6khkjhky3	9fe1cf44-5fba-4d8c-a55e-2903d2f4c3b4
00000000-0000-0000-0000-000000000000	135	wxnje6lis3c2	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-04 13:21:15.761047+00	2026-08-04 13:21:15.761047+00	2eguacryw2zo	9fe1cf44-5fba-4d8c-a55e-2903d2f4c3b4
00000000-0000-0000-0000-000000000000	136	22pxsjejezxv	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-04 13:21:17.644772+00	2026-08-04 15:42:37.802293+00	\N	e942d51a-d729-47d4-a33c-2a0957907a4c
00000000-0000-0000-0000-000000000000	137	iqvffwbj7z6p	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-04 15:42:37.821112+00	2026-08-04 18:38:33.189285+00	22pxsjejezxv	e942d51a-d729-47d4-a33c-2a0957907a4c
00000000-0000-0000-0000-000000000000	138	f4upyl5amzmm	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-04 18:38:33.209628+00	2026-08-04 21:13:17.441321+00	iqvffwbj7z6p	e942d51a-d729-47d4-a33c-2a0957907a4c
00000000-0000-0000-0000-000000000000	139	6mgq3gjenjbx	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-04 21:13:17.462258+00	2026-08-04 22:58:13.282666+00	f4upyl5amzmm	e942d51a-d729-47d4-a33c-2a0957907a4c
00000000-0000-0000-0000-000000000000	140	q6beh2vyzs7z	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-04 22:58:13.302344+00	2026-08-04 22:58:13.302344+00	6mgq3gjenjbx	e942d51a-d729-47d4-a33c-2a0957907a4c
00000000-0000-0000-0000-000000000000	142	csdjstmbmnew	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-05 00:29:17.806213+00	2026-08-05 00:29:17.806213+00	xkewqaqi3qzs	23e15059-e62b-42de-8c33-ca1ab42b6436
00000000-0000-0000-0000-000000000000	143	24gp5wbyr4pd	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-05 00:29:25.966318+00	2026-08-05 02:50:24.363511+00	\N	d53548f7-e3cb-43ba-b32c-8e4f5e27ff52
00000000-0000-0000-0000-000000000000	144	4h6gsdgckcn4	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-05 02:50:24.38142+00	2026-08-05 02:50:24.38142+00	24gp5wbyr4pd	d53548f7-e3cb-43ba-b32c-8e4f5e27ff52
00000000-0000-0000-0000-000000000000	141	7rcs5noukana	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-04 22:58:35.916681+00	2026-08-05 03:48:28.361439+00	\N	d8d76593-eee8-4d3c-99b8-120cd39adaef
00000000-0000-0000-0000-000000000000	146	m3v5j2by7lq3	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-05 03:48:28.373408+00	2026-08-05 03:48:28.373408+00	7rcs5noukana	d8d76593-eee8-4d3c-99b8-120cd39adaef
00000000-0000-0000-0000-000000000000	145	ky2v3uelrp74	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-05 02:50:36.886664+00	2026-08-05 13:16:54.243458+00	\N	f434aad8-4320-4e34-8039-99d7acbfd821
00000000-0000-0000-0000-000000000000	147	elqjxba3n3dk	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-05 03:48:50.638038+00	2026-08-05 15:16:22.913481+00	\N	eefde238-218a-4b89-af88-b7f3ea4f5c47
00000000-0000-0000-0000-000000000000	132	in7dewd42pfu	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-03 22:17:35.936318+00	2026-08-05 16:18:55.427139+00	ym42lnlioapu	8a48d331-e690-4e5e-b015-960ec42673a3
00000000-0000-0000-0000-000000000000	150	4zurgchr3qp7	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-05 16:18:55.441565+00	2026-08-05 16:18:55.441565+00	in7dewd42pfu	8a48d331-e690-4e5e-b015-960ec42673a3
00000000-0000-0000-0000-000000000000	151	5qsqj4bst5zl	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-05 16:18:56.291778+00	2026-08-05 16:18:56.291778+00	\N	a6ef8fb0-9d52-4132-96c9-95e095faf29d
00000000-0000-0000-0000-000000000000	152	ei6co7bl4scd	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-05 16:42:30.366016+00	2026-08-05 18:53:25.8432+00	\N	a4322a85-c3a2-41a9-a4cf-1079da470f68
00000000-0000-0000-0000-000000000000	153	gdbkyomwsiat	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-05 18:53:25.861236+00	2026-08-05 18:53:25.861236+00	ei6co7bl4scd	a4322a85-c3a2-41a9-a4cf-1079da470f68
00000000-0000-0000-0000-000000000000	148	x6vqgzws4rnj	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-05 13:16:54.267773+00	2026-08-05 22:02:05.762125+00	ky2v3uelrp74	f434aad8-4320-4e34-8039-99d7acbfd821
00000000-0000-0000-0000-000000000000	155	dhn5je423iai	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-05 20:52:16.446579+00	2026-08-06 00:55:59.020641+00	5gxua5wlmj2b	0e1302a0-7a3f-4601-b9cb-1fce8141646c
00000000-0000-0000-0000-000000000000	157	aax7yowrzza5	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 00:55:59.03033+00	2026-08-06 00:55:59.03033+00	dhn5je423iai	0e1302a0-7a3f-4601-b9cb-1fce8141646c
00000000-0000-0000-0000-000000000000	158	ckxpt3wkcsga	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 00:55:59.598903+00	2026-08-06 00:55:59.598903+00	\N	dff22676-ea45-4957-a56f-563dbc25d12b
00000000-0000-0000-0000-000000000000	159	ol23jgg7o43k	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 01:07:47.837595+00	2026-08-06 01:07:47.837595+00	\N	41f778a1-0a40-4dc4-8f6f-92723bc0f77b
00000000-0000-0000-0000-000000000000	160	iwza3qiduout	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 01:09:52.628029+00	2026-08-06 02:56:45.314615+00	\N	6e585c4c-9eab-4e83-9b24-7bd8ee2df360
00000000-0000-0000-0000-000000000000	149	5ln7zintp7dg	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-05 15:16:22.928903+00	2026-08-06 03:37:39.935797+00	elqjxba3n3dk	eefde238-218a-4b89-af88-b7f3ea4f5c47
00000000-0000-0000-0000-000000000000	162	shqq5ael4fuv	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-06 03:37:39.952833+00	2026-08-06 03:37:39.952833+00	5ln7zintp7dg	eefde238-218a-4b89-af88-b7f3ea4f5c47
00000000-0000-0000-0000-000000000000	163	qom64kuia766	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-06 03:37:44.845792+00	2026-08-06 03:37:44.845792+00	\N	2f46c09c-dde1-4543-a833-1557a0fb18d7
00000000-0000-0000-0000-000000000000	161	hlm5fumczqyt	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 02:56:45.338225+00	2026-08-06 03:55:03.962856+00	iwza3qiduout	6e585c4c-9eab-4e83-9b24-7bd8ee2df360
00000000-0000-0000-0000-000000000000	156	lavmmlv2dknr	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-05 22:02:05.780858+00	2026-08-06 04:24:31.871295+00	x6vqgzws4rnj	f434aad8-4320-4e34-8039-99d7acbfd821
00000000-0000-0000-0000-000000000000	166	kev4xitjb2gu	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 04:24:31.883142+00	2026-08-06 04:24:31.883142+00	lavmmlv2dknr	f434aad8-4320-4e34-8039-99d7acbfd821
00000000-0000-0000-0000-000000000000	164	4l6vyjkw3bij	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 03:55:03.97223+00	2026-08-06 12:20:26.502221+00	hlm5fumczqyt	6e585c4c-9eab-4e83-9b24-7bd8ee2df360
00000000-0000-0000-0000-000000000000	167	7uowg2zontoq	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 12:20:26.51316+00	2026-08-06 12:20:26.51316+00	4l6vyjkw3bij	6e585c4c-9eab-4e83-9b24-7bd8ee2df360
00000000-0000-0000-0000-000000000000	168	gkdglepuy4jp	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 12:20:38.379034+00	2026-08-06 12:20:38.379034+00	\N	f50b1db2-44e9-4dd3-8276-c6589db20b51
00000000-0000-0000-0000-000000000000	169	clzgqyzg5277	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 12:51:37.487795+00	2026-08-06 12:51:37.487795+00	\N	d84dc376-6526-4d25-b5da-d9389ff247df
00000000-0000-0000-0000-000000000000	170	5rr564d2hzwu	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 13:01:55.188326+00	2026-08-06 13:01:55.188326+00	\N	37a77f81-1c3f-4634-a7f9-afc7d48b4dae
00000000-0000-0000-0000-000000000000	165	qaittv224ph6	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-06 04:09:11.56395+00	2026-08-06 14:12:30.295031+00	\N	e73023e8-bebb-4fff-94a9-23fe83f386b5
00000000-0000-0000-0000-000000000000	171	37qualdvbdr2	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 13:21:44.288176+00	2026-08-06 14:20:13.940846+00	\N	084d8586-5bf4-498b-ac7c-c852e3cebc34
00000000-0000-0000-0000-000000000000	126	zatbydgm3jth	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-03 20:04:24.721563+00	2026-08-06 17:09:08.246734+00	\N	cfa34501-ce90-40e3-90ad-a09ffad8f4f0
00000000-0000-0000-0000-000000000000	154	wjrzmxbhogra	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-05 18:53:28.456029+00	2026-08-08 05:22:53.584917+00	\N	52a5c59e-50e7-4de5-a181-5dd261fdfa4a
00000000-0000-0000-0000-000000000000	173	brhebvynw5m6	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 14:20:13.945841+00	2026-08-06 15:52:30.559639+00	37qualdvbdr2	084d8586-5bf4-498b-ac7c-c852e3cebc34
00000000-0000-0000-0000-000000000000	174	hvssh6sct32x	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 15:52:30.587051+00	2026-08-06 16:50:33.219225+00	brhebvynw5m6	084d8586-5bf4-498b-ac7c-c852e3cebc34
00000000-0000-0000-0000-000000000000	176	5lmkgmzt52by	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 17:09:08.258092+00	2026-08-06 17:09:08.258092+00	zatbydgm3jth	cfa34501-ce90-40e3-90ad-a09ffad8f4f0
00000000-0000-0000-0000-000000000000	175	4x3ffoq4u2tz	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 16:50:33.228922+00	2026-08-06 17:49:03.368504+00	hvssh6sct32x	084d8586-5bf4-498b-ac7c-c852e3cebc34
00000000-0000-0000-0000-000000000000	178	s5wsjhsiq3mq	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 17:49:03.387112+00	2026-08-06 18:47:33.349945+00	4x3ffoq4u2tz	084d8586-5bf4-498b-ac7c-c852e3cebc34
00000000-0000-0000-0000-000000000000	179	szas2vwtwcic	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 18:47:33.36613+00	2026-08-06 20:06:45.890614+00	s5wsjhsiq3mq	084d8586-5bf4-498b-ac7c-c852e3cebc34
00000000-0000-0000-0000-000000000000	180	4q4ghbomgvxr	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 20:06:45.910291+00	2026-08-06 20:06:45.910291+00	szas2vwtwcic	084d8586-5bf4-498b-ac7c-c852e3cebc34
00000000-0000-0000-0000-000000000000	181	vs64sxya6lx2	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 20:06:46.347653+00	2026-08-06 20:06:46.347653+00	\N	ac2c3e40-b6f8-46ab-b591-982f443ae6b6
00000000-0000-0000-0000-000000000000	182	lm56o3ozd7zv	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 21:01:02.885713+00	2026-08-06 21:01:02.885713+00	\N	6c468ef1-2f03-4045-83fc-0543089f223a
00000000-0000-0000-0000-000000000000	183	md76oduktuxf	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 21:09:57.327686+00	2026-08-06 22:08:04.500033+00	\N	4d00c509-d20c-4461-8beb-d4224b871851
00000000-0000-0000-0000-000000000000	177	zjon7wrltxei	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 17:09:09.875471+00	2026-08-06 22:42:19.21067+00	\N	d9f52f42-17f9-4a39-bd95-5eabd225ae31
00000000-0000-0000-0000-000000000000	185	ib3y2liurled	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 22:42:19.222265+00	2026-08-06 22:42:19.222265+00	zjon7wrltxei	d9f52f42-17f9-4a39-bd95-5eabd225ae31
00000000-0000-0000-0000-000000000000	186	ga3gmp5lptss	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 22:42:21.456134+00	2026-08-06 22:42:21.456134+00	\N	46646045-29e7-4694-8936-788a41f789ae
00000000-0000-0000-0000-000000000000	187	3fxvkjopa2nc	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-06 22:44:22.044362+00	2026-08-06 22:44:22.044362+00	\N	629f5975-2181-4b52-a517-8f224bd37a4e
00000000-0000-0000-0000-000000000000	184	otqxlb37omcy	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 22:08:04.522147+00	2026-08-06 23:06:04.446172+00	md76oduktuxf	4d00c509-d20c-4461-8beb-d4224b871851
00000000-0000-0000-0000-000000000000	172	bnofsjtt2yb6	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-06 14:12:30.309551+00	2026-08-06 23:41:45.147907+00	qaittv224ph6	e73023e8-bebb-4fff-94a9-23fe83f386b5
00000000-0000-0000-0000-000000000000	189	wcdiue5rndgr	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-06 23:41:45.154064+00	2026-08-06 23:41:45.154064+00	bnofsjtt2yb6	e73023e8-bebb-4fff-94a9-23fe83f386b5
00000000-0000-0000-0000-000000000000	190	xhqpp42wl4fg	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-06 23:41:46.227157+00	2026-08-06 23:41:46.227157+00	\N	ce12f461-154b-4f28-9d19-eee8749c55c4
00000000-0000-0000-0000-000000000000	191	mvnkbjrp643b	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-06 23:50:13.422725+00	2026-08-06 23:50:13.422725+00	\N	5b05a8ca-ab7d-483c-9c48-49c737bab4a3
00000000-0000-0000-0000-000000000000	192	hjhscsfcepok	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-06 23:53:05.44568+00	2026-08-06 23:53:05.44568+00	\N	fa95d7b4-ca03-428c-a05d-4f62f25e902c
00000000-0000-0000-0000-000000000000	193	su5e3lse4p76	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-07 00:06:39.061317+00	2026-08-07 00:06:39.061317+00	\N	0a5542ca-8d6d-4df4-b831-1d6d1e2e915c
00000000-0000-0000-0000-000000000000	194	o5rpalbdb5ah	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-07 00:08:44.515665+00	2026-08-07 00:08:44.515665+00	\N	7e38b947-c012-4be6-bddb-d8ccac788823
00000000-0000-0000-0000-000000000000	195	v64ywdh6qhap	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-07 00:58:57.78479+00	2026-08-07 01:57:54.375439+00	\N	e9f18942-7423-4ae8-a633-691705f834a3
00000000-0000-0000-0000-000000000000	196	4wt74uv2dc6e	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-07 01:57:54.395424+00	2026-08-07 01:57:54.395424+00	v64ywdh6qhap	e9f18942-7423-4ae8-a633-691705f834a3
00000000-0000-0000-0000-000000000000	197	5zjyhxpdmwmd	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-07 02:24:50.006281+00	2026-08-07 12:00:45.546698+00	\N	0e9d1979-7bda-447a-a6e7-5aacd49ae3c3
00000000-0000-0000-0000-000000000000	198	jmkgvp4q4hss	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-07 12:00:45.559208+00	2026-08-07 12:59:25.904315+00	5zjyhxpdmwmd	0e9d1979-7bda-447a-a6e7-5aacd49ae3c3
00000000-0000-0000-0000-000000000000	199	czefpkswppz2	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-07 12:59:25.92015+00	2026-08-07 12:59:25.92015+00	jmkgvp4q4hss	0e9d1979-7bda-447a-a6e7-5aacd49ae3c3
00000000-0000-0000-0000-000000000000	188	dplbxovubfwo	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-06 23:06:04.460754+00	2026-08-07 13:08:11.408713+00	otqxlb37omcy	4d00c509-d20c-4461-8beb-d4224b871851
00000000-0000-0000-0000-000000000000	201	2ckqdsneohko	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-07 13:08:11.413641+00	2026-08-07 13:08:11.413641+00	dplbxovubfwo	4d00c509-d20c-4461-8beb-d4224b871851
00000000-0000-0000-0000-000000000000	200	zxlx67xbigre	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-07 12:59:57.589383+00	2026-08-07 13:58:23.920723+00	\N	4b489f6e-0096-4a8f-be52-dacdba931490
00000000-0000-0000-0000-000000000000	202	x2b6zyk7aoun	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-07 13:08:13.810662+00	2026-08-07 14:06:41.775932+00	\N	f701ca4c-0f6c-43c2-91f0-ec1c4489bd46
00000000-0000-0000-0000-000000000000	203	pqiocdcmygy5	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-07 13:58:23.929256+00	2026-08-07 14:56:52.78423+00	zxlx67xbigre	4b489f6e-0096-4a8f-be52-dacdba931490
00000000-0000-0000-0000-000000000000	204	xu2bgvuunpr6	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-07 14:06:41.7833+00	2026-08-07 15:04:41.715022+00	x2b6zyk7aoun	f701ca4c-0f6c-43c2-91f0-ec1c4489bd46
00000000-0000-0000-0000-000000000000	206	w73fhqq4boxs	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-07 15:04:41.723718+00	2026-08-07 16:02:42.357034+00	xu2bgvuunpr6	f701ca4c-0f6c-43c2-91f0-ec1c4489bd46
00000000-0000-0000-0000-000000000000	207	mlizppfunfpp	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-07 16:02:42.3832+00	2026-08-07 17:00:42.56071+00	w73fhqq4boxs	f701ca4c-0f6c-43c2-91f0-ec1c4489bd46
00000000-0000-0000-0000-000000000000	205	xoarnc6kpvxg	1f231474-dd97-48ce-9b37-525dec938e45	t	2026-08-07 14:56:52.79125+00	2026-08-07 17:10:12.9929+00	pqiocdcmygy5	4b489f6e-0096-4a8f-be52-dacdba931490
00000000-0000-0000-0000-000000000000	209	7x2rtg5phq7v	1f231474-dd97-48ce-9b37-525dec938e45	f	2026-08-07 17:10:13.001271+00	2026-08-07 17:10:13.001271+00	xoarnc6kpvxg	4b489f6e-0096-4a8f-be52-dacdba931490
00000000-0000-0000-0000-000000000000	208	yp3f7ut55qwu	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-07 17:00:42.576352+00	2026-08-07 17:58:42.519947+00	mlizppfunfpp	f701ca4c-0f6c-43c2-91f0-ec1c4489bd46
00000000-0000-0000-0000-000000000000	210	mty2rjsgm6ew	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-07 17:58:42.536888+00	2026-08-07 17:58:42.536888+00	yp3f7ut55qwu	f701ca4c-0f6c-43c2-91f0-ec1c4489bd46
00000000-0000-0000-0000-000000000000	211	elpxveqxzxfl	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-07 18:29:26.424385+00	2026-08-07 19:27:46.083088+00	\N	99cc1e51-0427-428f-a057-b9248c668f1f
00000000-0000-0000-0000-000000000000	212	3dnjqduvfmxv	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-07 19:27:46.100467+00	2026-08-07 23:19:37.716151+00	elpxveqxzxfl	99cc1e51-0427-428f-a057-b9248c668f1f
00000000-0000-0000-0000-000000000000	213	xmrzcrmdw2yd	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-07 23:19:37.730101+00	2026-08-07 23:19:37.730101+00	3dnjqduvfmxv	99cc1e51-0427-428f-a057-b9248c668f1f
00000000-0000-0000-0000-000000000000	214	mrcgtyhmespm	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-07 23:24:21.133034+00	2026-08-07 23:24:21.133034+00	\N	57dc295e-33d5-44f3-822e-6d9cc07cf96a
00000000-0000-0000-0000-000000000000	215	i5soxmabo2oj	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-07 23:35:57.947886+00	2026-08-07 23:35:57.947886+00	\N	d5f1e71f-c253-405b-ae54-4b7a2109409b
00000000-0000-0000-0000-000000000000	216	yar6za6jxfff	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 00:07:02.277456+00	2026-08-08 00:07:02.277456+00	\N	fb516f1a-3dee-4e3e-b933-fe61f8ad23e6
00000000-0000-0000-0000-000000000000	217	mxpyizlwci6c	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-08 00:13:23.842943+00	2026-08-08 01:11:23.594304+00	\N	500cadff-e956-40ec-90f2-f564e1be4e78
00000000-0000-0000-0000-000000000000	218	osmbc5ecdigk	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-08 01:11:23.614204+00	2026-08-08 02:09:23.44236+00	mxpyizlwci6c	500cadff-e956-40ec-90f2-f564e1be4e78
00000000-0000-0000-0000-000000000000	219	wxxy7zbqszqu	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-08 02:09:23.459168+00	2026-08-08 03:07:23.806082+00	osmbc5ecdigk	500cadff-e956-40ec-90f2-f564e1be4e78
00000000-0000-0000-0000-000000000000	220	l7yurykiymxq	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-08 03:07:23.816603+00	2026-08-08 04:05:23.452628+00	wxxy7zbqszqu	500cadff-e956-40ec-90f2-f564e1be4e78
00000000-0000-0000-0000-000000000000	221	7mvz46j6vni4	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 04:05:23.461545+00	2026-08-08 04:05:23.461545+00	l7yurykiymxq	500cadff-e956-40ec-90f2-f564e1be4e78
00000000-0000-0000-0000-000000000000	222	3ffbx3d524hn	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 04:18:32.2267+00	2026-08-08 04:18:32.2267+00	\N	7b8cd9f7-e836-42f2-a8e0-22097fdc36a4
00000000-0000-0000-0000-000000000000	223	ftd6dtrddaya	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 04:19:46.689511+00	2026-08-08 04:19:46.689511+00	\N	210ba00a-bb7a-4339-b548-08c3f65ef32d
00000000-0000-0000-0000-000000000000	224	6tvjq5s4bq4t	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 04:27:01.869888+00	2026-08-08 04:27:01.869888+00	\N	b318fe8d-53a4-484a-9b6a-7659c06790fe
00000000-0000-0000-0000-000000000000	225	pwzlceqimmit	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 04:29:20.880494+00	2026-08-08 04:29:20.880494+00	\N	6c325369-f503-4b4b-9932-d056a5ce286b
00000000-0000-0000-0000-000000000000	226	dl6nhjd5uxrd	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 04:58:59.969307+00	2026-08-08 04:58:59.969307+00	\N	7864451c-d8a0-4a41-aee6-d8f782feda2e
00000000-0000-0000-0000-000000000000	227	kp23abnywfqp	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 04:59:17.871545+00	2026-08-08 04:59:17.871545+00	\N	0b6b5a0b-3788-419d-993b-6bd6f0f4ef89
00000000-0000-0000-0000-000000000000	228	3qf7mchvk4nq	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 05:03:50.673176+00	2026-08-08 05:03:50.673176+00	\N	308dd2e1-2b5d-4ade-9a34-964cdd94f30d
00000000-0000-0000-0000-000000000000	229	ji2f2z3qa677	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 05:13:59.943324+00	2026-08-08 05:13:59.943324+00	\N	7f467ad9-ede3-4560-9f41-6d60b7adf892
00000000-0000-0000-0000-000000000000	230	q67z6i46gu2o	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 05:22:53.592832+00	2026-08-08 05:22:53.592832+00	wjrzmxbhogra	52a5c59e-50e7-4de5-a181-5dd261fdfa4a
00000000-0000-0000-0000-000000000000	231	6uiaq2ugobla	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-08 05:23:03.993293+00	2026-08-08 12:05:59.22832+00	\N	6a1afb3b-ceaf-47a5-af48-6178d210bfd6
00000000-0000-0000-0000-000000000000	233	fnhj6nimkzsq	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 12:05:59.254267+00	2026-08-08 12:05:59.254267+00	6uiaq2ugobla	6a1afb3b-ceaf-47a5-af48-6178d210bfd6
00000000-0000-0000-0000-000000000000	232	mqswl6ksfmej	71811925-e13f-49ea-aa1f-af54e011a7ea	t	2026-08-08 05:23:42.308432+00	2026-08-08 12:15:42.276481+00	\N	af031d92-9512-43f5-bdb2-ddc4abb0abeb
00000000-0000-0000-0000-000000000000	235	ouohb6gbbuqe	71811925-e13f-49ea-aa1f-af54e011a7ea	f	2026-08-08 12:15:42.283538+00	2026-08-08 12:15:42.283538+00	mqswl6ksfmej	af031d92-9512-43f5-bdb2-ddc4abb0abeb
00000000-0000-0000-0000-000000000000	236	i2bdodetep5c	71811925-e13f-49ea-aa1f-af54e011a7ea	f	2026-08-08 12:15:44.964093+00	2026-08-08 12:15:44.964093+00	\N	f67b3b54-e44f-43eb-9c40-8c796427452f
00000000-0000-0000-0000-000000000000	234	zuqqervekqrh	0c3c1159-e441-433d-9e57-48d45d170d4a	t	2026-08-08 12:06:12.883324+00	2026-08-08 13:04:14.2163+00	\N	5c77c016-7b2c-4cf7-b295-782734d9a0af
00000000-0000-0000-0000-000000000000	237	7astcmafw4ru	0c3c1159-e441-433d-9e57-48d45d170d4a	f	2026-08-08 13:04:14.23136+00	2026-08-08 13:04:14.23136+00	zuqqervekqrh	5c77c016-7b2c-4cf7-b295-782734d9a0af
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
20260625000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
7117aabc-a7c6-41b1-9fe2-6c534d56416e	1f231474-dd97-48ce-9b37-525dec938e45	2026-07-29 20:09:12.811721+00	2026-08-04 03:03:24.081439+00	\N	aal1	\N	2026-08-04 03:03:24.081289	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	174.170.255.179	\N	\N	\N	\N	\N
51e317d1-2a2c-48d0-8180-d47ea73d906c	71811925-e13f-49ea-aa1f-af54e011a7ea	2026-07-29 02:12:29.311251+00	2026-07-29 02:12:29.311251+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.140.32	\N	\N	\N	\N	\N
23e15059-e62b-42de-8c33-ca1ab42b6436	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-02 21:25:00.730607+00	2026-08-05 00:29:17.83066+00	\N	aal1	\N	2026-08-05 00:29:17.830546	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	74.254.224.98	\N	\N	\N	\N	\N
e942d51a-d729-47d4-a33c-2a0957907a4c	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-04 13:21:17.628793+00	2026-08-04 22:58:13.332765+00	\N	aal1	\N	2026-08-04 22:58:13.332657	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
d53548f7-e3cb-43ba-b32c-8e4f5e27ff52	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-05 00:29:25.954086+00	2026-08-05 02:50:24.406658+00	\N	aal1	\N	2026-08-05 02:50:24.406521	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	74.254.224.98	\N	\N	\N	\N	\N
7f630b1a-efca-4427-9232-6a8fee97fdd2	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 18:27:41.162095+00	2026-08-02 18:27:41.162095+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
d8b94bd9-99ec-4723-8583-9d5c3464f730	71811925-e13f-49ea-aa1f-af54e011a7ea	2026-07-30 14:42:15.318405+00	2026-07-30 14:42:15.318405+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
e64b2eea-99f2-4e18-aa14-1232acdf3708	71811925-e13f-49ea-aa1f-af54e011a7ea	2026-07-29 19:57:13.236834+00	2026-07-29 19:57:13.236834+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	174.170.140.32	\N	\N	\N	\N	\N
c468ae98-b8d5-46fd-8184-a3f10c82ba1e	1f231474-dd97-48ce-9b37-525dec938e45	2026-07-29 20:07:30.146557+00	2026-07-29 20:07:30.146557+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	166.205.97.9	\N	\N	\N	\N	\N
031a0534-11b3-4dd9-adef-5ca37083f24f	71811925-e13f-49ea-aa1f-af54e011a7ea	2026-07-30 01:56:00.982244+00	2026-07-30 01:56:00.982244+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.140.32	\N	\N	\N	\N	\N
749d906e-9843-41a0-8efb-53b05367a4e3	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-01 22:34:18.327029+00	2026-08-02 00:31:39.041841+00	\N	aal1	\N	2026-08-02 00:31:39.041723	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
f77c61ba-0127-4b36-ba26-5e9d224f89b1	1f231474-dd97-48ce-9b37-525dec938e45	2026-07-30 14:21:45.738014+00	2026-07-30 18:57:45.702774+00	\N	aal1	\N	2026-07-30 18:57:45.702655	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
ad52f57f-c40d-499f-bca9-f88691bca98f	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-02 21:08:12.630266+00	2026-08-02 21:08:12.630266+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	12.75.41.71	\N	\N	\N	\N	\N
7bb57633-f832-41a6-9505-eb4bf1f46787	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-01 04:42:04.69385+00	2026-08-01 04:42:04.69385+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	174.170.255.179	\N	\N	\N	\N	\N
9e888a15-ea70-4c58-b6ab-9596ff2845f5	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-01 04:42:44.726693+00	2026-08-01 04:42:44.726693+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	174.170.255.179	\N	\N	\N	\N	\N
5c7234b2-a55e-4a3b-bc7a-74da1a87676a	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-01 04:57:04.764643+00	2026-08-01 04:57:04.764643+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	174.170.255.179	\N	\N	\N	\N	\N
3c1456d9-ad96-4be4-9c44-11d3996b4052	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-01 05:02:10.145437+00	2026-08-01 15:18:22.120253+00	\N	aal1	\N	2026-08-01 15:18:22.120082	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
1441e6de-d5fa-4c60-b80f-6495d99e3d0e	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 00:49:51.329569+00	2026-08-02 05:07:16.972102+00	\N	aal1	\N	2026-08-02 05:07:16.971977	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
e46b62e5-2f7b-4af6-b1de-6d3c94006864	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 05:10:31.80009+00	2026-08-02 05:10:31.80009+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
67278499-671e-44e9-8088-0c6cce1521a9	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 05:41:29.453501+00	2026-08-02 05:41:29.453501+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
167eaa09-9db7-46f8-8535-89b9e5b70153	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 05:59:38.140458+00	2026-08-02 05:59:38.140458+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
a8339750-0dec-46c3-91d4-4ceeaf7abf87	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 06:19:38.830458+00	2026-08-02 06:19:38.830458+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
1a06ff1f-14b9-418f-aaf8-18a0c0b42f4c	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 07:08:32.123256+00	2026-08-02 17:27:37.649197+00	\N	aal1	\N	2026-08-02 17:27:37.649077	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
4589d75c-0a9f-4c2a-9f72-3efc348e09f1	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 17:27:37.795+00	2026-08-02 17:27:37.795+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
f1794d54-769f-4e72-9e8c-131769f85143	71811925-e13f-49ea-aa1f-af54e011a7ea	2026-08-01 17:11:41.387075+00	2026-08-02 17:55:03.670202+00	\N	aal1	\N	2026-08-02 17:55:03.670015	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
70d608b9-dadd-4c15-9f40-49f35fd80557	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 17:55:20.16016+00	2026-08-02 17:55:20.16016+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
774ff68a-caa1-4ccb-82de-4b968da1bb68	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 18:49:40.074468+00	2026-08-02 22:09:04.450787+00	\N	aal1	\N	2026-08-02 22:09:04.450664	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
4547fc55-b33c-41dc-9a53-3bf97e96d9ce	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-02 22:11:31.333608+00	2026-08-03 14:15:49.648799+00	\N	aal1	\N	2026-08-03 14:15:49.646234	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
a8a0fc8c-84a4-46de-afdc-6d3b1b024d81	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-03 14:15:50.149803+00	2026-08-03 14:15:50.149803+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
4d937668-a7ea-4325-b739-511a618e3fa0	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-03 14:21:09.311476+00	2026-08-03 14:21:09.311476+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
9d1d006e-9e11-4871-a772-1590dd68b345	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-02 16:03:00.818888+00	2026-08-03 15:17:34.694624+00	\N	aal1	\N	2026-08-03 15:17:34.694492	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	174.170.255.179	\N	\N	\N	\N	\N
159cb6f8-6888-401d-ac4d-40422ffe037c	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-03 15:03:55.104021+00	2026-08-03 16:02:31.138847+00	\N	aal1	\N	2026-08-03 16:02:31.138705	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
9fe1cf44-5fba-4d8c-a55e-2903d2f4c3b4	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-03 16:54:10.843323+00	2026-08-04 13:21:15.791401+00	\N	aal1	\N	2026-08-04 13:21:15.79125	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
a82a2667-d762-4771-9951-2b6b23281938	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-03 15:17:37.996424+00	2026-08-03 20:04:22.747123+00	\N	aal1	\N	2026-08-03 20:04:22.747008	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	174.170.255.179	\N	\N	\N	\N	\N
d85e866f-9012-4d70-9f32-3bfcbda69a61	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-03 20:17:40.764287+00	2026-08-03 20:17:40.764287+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
d84dc376-6526-4d25-b5da-d9389ff247df	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 12:51:37.426622+00	2026-08-06 12:51:37.426622+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
37a77f81-1c3f-4634-a7f9-afc7d48b4dae	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 13:01:55.1752+00	2026-08-06 13:01:55.1752+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
d8d76593-eee8-4d3c-99b8-120cd39adaef	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-04 22:58:35.898244+00	2026-08-05 03:48:28.400091+00	\N	aal1	\N	2026-08-05 03:48:28.399935	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
5b05a8ca-ab7d-483c-9c48-49c737bab4a3	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-06 23:50:13.406301+00	2026-08-06 23:50:13.406301+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
8a48d331-e690-4e5e-b015-960ec42673a3	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-03 20:21:23.94199+00	2026-08-05 16:18:55.464283+00	\N	aal1	\N	2026-08-05 16:18:55.464105	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
a6ef8fb0-9d52-4132-96c9-95e095faf29d	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-05 16:18:56.281762+00	2026-08-05 16:18:56.281762+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
a4322a85-c3a2-41a9-a4cf-1079da470f68	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-05 16:42:30.33631+00	2026-08-05 18:53:25.89162+00	\N	aal1	\N	2026-08-05 18:53:25.891496	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
fa95d7b4-ca03-428c-a05d-4f62f25e902c	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-06 23:53:05.435268+00	2026-08-06 23:53:05.435268+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
0e1302a0-7a3f-4601-b9cb-1fce8141646c	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-03 20:16:46.800661+00	2026-08-06 00:55:59.053068+00	\N	aal1	\N	2026-08-06 00:55:59.052938	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
dff22676-ea45-4957-a56f-563dbc25d12b	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 00:55:59.585288+00	2026-08-06 00:55:59.585288+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
41f778a1-0a40-4dc4-8f6f-92723bc0f77b	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 01:07:47.824864+00	2026-08-06 01:07:47.824864+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
d9f52f42-17f9-4a39-bd95-5eabd225ae31	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 17:09:09.864401+00	2026-08-06 22:42:19.242736+00	\N	aal1	\N	2026-08-06 22:42:19.24261	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	74.254.224.98	\N	\N	\N	\N	\N
eefde238-218a-4b89-af88-b7f3ea4f5c47	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-05 03:48:50.631008+00	2026-08-06 03:37:39.973555+00	\N	aal1	\N	2026-08-06 03:37:39.973442	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
2f46c09c-dde1-4543-a833-1557a0fb18d7	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-06 03:37:44.831194+00	2026-08-06 03:37:44.831194+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
cfa34501-ce90-40e3-90ad-a09ffad8f4f0	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-03 20:04:24.706498+00	2026-08-06 17:09:08.277547+00	\N	aal1	\N	2026-08-06 17:09:08.277435	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	74.254.224.98	\N	\N	\N	\N	\N
f434aad8-4320-4e34-8039-99d7acbfd821	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-05 02:50:36.87704+00	2026-08-06 04:24:31.907043+00	\N	aal1	\N	2026-08-06 04:24:31.906915	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	74.254.224.98	\N	\N	\N	\N	\N
6e585c4c-9eab-4e83-9b24-7bd8ee2df360	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 01:09:52.619611+00	2026-08-06 12:20:26.53813+00	\N	aal1	\N	2026-08-06 12:20:26.538006	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
f50b1db2-44e9-4dd3-8276-c6589db20b51	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 12:20:38.37127+00	2026-08-06 12:20:38.37127+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
46646045-29e7-4694-8936-788a41f789ae	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 22:42:21.439522+00	2026-08-06 22:42:21.439522+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	74.254.224.98	\N	\N	\N	\N	\N
629f5975-2181-4b52-a517-8f224bd37a4e	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 22:44:22.032728+00	2026-08-06 22:44:22.032728+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1	74.254.224.98	\N	\N	\N	\N	\N
084d8586-5bf4-498b-ac7c-c852e3cebc34	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 13:21:44.261441+00	2026-08-06 20:06:45.937396+00	\N	aal1	\N	2026-08-06 20:06:45.937267	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
ac2c3e40-b6f8-46ab-b591-982f443ae6b6	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 20:06:46.329121+00	2026-08-06 20:06:46.329121+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
6c468ef1-2f03-4045-83fc-0543089f223a	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 21:01:02.865234+00	2026-08-06 21:01:02.865234+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
52a5c59e-50e7-4de5-a181-5dd261fdfa4a	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-05 18:53:28.437897+00	2026-08-08 05:22:53.617714+00	\N	aal1	\N	2026-08-08 05:22:53.61759	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
e73023e8-bebb-4fff-94a9-23fe83f386b5	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-06 04:09:11.536037+00	2026-08-06 23:41:45.177663+00	\N	aal1	\N	2026-08-06 23:41:45.177526	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
ce12f461-154b-4f28-9d19-eee8749c55c4	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-06 23:41:46.221401+00	2026-08-06 23:41:46.221401+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
0a5542ca-8d6d-4df4-b831-1d6d1e2e915c	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-07 00:06:39.037074+00	2026-08-07 00:06:39.037074+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
7e38b947-c012-4be6-bddb-d8ccac788823	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-07 00:08:44.503846+00	2026-08-07 00:08:44.503846+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
e9f18942-7423-4ae8-a633-691705f834a3	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-07 00:58:57.758269+00	2026-08-07 01:57:54.420158+00	\N	aal1	\N	2026-08-07 01:57:54.419999	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
4d00c509-d20c-4461-8beb-d4224b871851	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-06 21:09:57.309202+00	2026-08-07 13:08:11.419504+00	\N	aal1	\N	2026-08-07 13:08:11.419361	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
0e9d1979-7bda-447a-a6e7-5aacd49ae3c3	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-07 02:24:49.974661+00	2026-08-07 12:59:25.943818+00	\N	aal1	\N	2026-08-07 12:59:25.943697	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
6a1afb3b-ceaf-47a5-af48-6178d210bfd6	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 05:23:03.989317+00	2026-08-08 12:05:59.288962+00	\N	aal1	\N	2026-08-08 12:05:59.288855	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
af031d92-9512-43f5-bdb2-ddc4abb0abeb	71811925-e13f-49ea-aa1f-af54e011a7ea	2026-08-08 05:23:42.30659+00	2026-08-08 12:15:42.290635+00	\N	aal1	\N	2026-08-08 12:15:42.290523	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
f67b3b54-e44f-43eb-9c40-8c796427452f	71811925-e13f-49ea-aa1f-af54e011a7ea	2026-08-08 12:15:44.961828+00	2026-08-08 12:15:44.961828+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
5c77c016-7b2c-4cf7-b295-782734d9a0af	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 12:06:12.870243+00	2026-08-08 13:04:14.262304+00	\N	aal1	\N	2026-08-08 13:04:14.26218	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
4b489f6e-0096-4a8f-be52-dacdba931490	1f231474-dd97-48ce-9b37-525dec938e45	2026-08-07 12:59:57.577534+00	2026-08-07 17:10:13.021038+00	\N	aal1	\N	2026-08-07 17:10:13.020853	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
f701ca4c-0f6c-43c2-91f0-ec1c4489bd46	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-07 13:08:13.808638+00	2026-08-07 17:58:42.562328+00	\N	aal1	\N	2026-08-07 17:58:42.562212	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
99cc1e51-0427-428f-a057-b9248c668f1f	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-07 18:29:26.398051+00	2026-08-07 23:19:37.752475+00	\N	aal1	\N	2026-08-07 23:19:37.752309	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
57dc295e-33d5-44f3-822e-6d9cc07cf96a	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-07 23:24:21.1099+00	2026-08-07 23:24:21.1099+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
d5f1e71f-c253-405b-ae54-4b7a2109409b	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-07 23:35:57.914601+00	2026-08-07 23:35:57.914601+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
fb516f1a-3dee-4e3e-b933-fe61f8ad23e6	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 00:07:02.243842+00	2026-08-08 00:07:02.243842+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
500cadff-e956-40ec-90f2-f564e1be4e78	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 00:13:23.814989+00	2026-08-08 04:05:23.484654+00	\N	aal1	\N	2026-08-08 04:05:23.48446	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
7b8cd9f7-e836-42f2-a8e0-22097fdc36a4	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 04:18:32.202765+00	2026-08-08 04:18:32.202765+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
210ba00a-bb7a-4339-b548-08c3f65ef32d	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 04:19:46.687462+00	2026-08-08 04:19:46.687462+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
b318fe8d-53a4-484a-9b6a-7659c06790fe	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 04:27:01.848814+00	2026-08-08 04:27:01.848814+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
6c325369-f503-4b4b-9932-d056a5ce286b	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 04:29:20.865802+00	2026-08-08 04:29:20.865802+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
7864451c-d8a0-4a41-aee6-d8f782feda2e	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 04:58:59.951592+00	2026-08-08 04:58:59.951592+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
0b6b5a0b-3788-419d-993b-6bd6f0f4ef89	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 04:59:17.869263+00	2026-08-08 04:59:17.869263+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
308dd2e1-2b5d-4ade-9a34-964cdd94f30d	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 05:03:50.649059+00	2026-08-08 05:03:50.649059+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
7f467ad9-ede3-4560-9f41-6d60b7adf892	0c3c1159-e441-433d-9e57-48d45d170d4a	2026-08-08 05:13:59.932957+00	2026-08-08 05:13:59.932957+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	174.170.255.179	\N	\N	\N	\N	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	0c3c1159-e441-433d-9e57-48d45d170d4a	authenticated	authenticated	abbyem08@gmail.com	$2a$10$iD2L/twhDOmhu94dKnnabuuIBy1Lr3hn4/x0RRJqwWhsMeJg.QCJ2	2026-07-29 02:36:30.432356+00	\N		\N		\N			\N	2026-08-08 12:06:12.870142+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-07-29 02:36:30.418002+00	2026-08-08 13:04:14.240914+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	71811925-e13f-49ea-aa1f-af54e011a7ea	authenticated	authenticated	j.martinez347@gmail.com	$2a$10$VWKgI9G.su0fe32cid0b0e9t01Z2HqxCz.KiyqPvUHo2.A4RbgyZO	2026-07-29 01:23:19.344718+00	\N		\N		\N			\N	2026-08-08 12:15:44.961718+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-07-29 01:23:19.320117+00	2026-08-08 12:15:44.96525+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	1f231474-dd97-48ce-9b37-525dec938e45	authenticated	authenticated	jmartinez@profreshsourcing.com	$2a$10$gVzKqcFilUG6UwrKGtoDyuAAwIH3AEeaSpFAOI81PEM7sZCs.urdy	2026-07-29 20:07:30.135261+00	\N		2026-07-29 20:07:14.228249+00		\N			\N	2026-08-07 12:59:57.577413+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-07-29 19:58:05.41764+00	2026-08-07 17:10:13.005131+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: amendments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.amendments (amendment_id, organization_id, jacket_id, order_line_id, jacket_product_line_id, freight_record_id, amendment_name, amendment_type, target_field, original_value, adjustment_value, new_effective_value, unit, reason, notes, created_by, created_at, effective_at, status, reversed_by_amendment_id, target_table, target_record_id) FROM stdin;
34	1	24	\N	\N	\N	Grapefruit amended	Cost Change	purchase_cost_per_case	0	+23.5	23.5	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:36:32.615512+00	2026-08-08 12:36:32.615512+00	Active	\N	jacket_product_lines	25
35	1	24	\N	\N	\N	Grapefruit amended	Cost Change	actual_cases_received	\N	\N	216	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:38:53.934052+00	2026-08-08 12:38:53.934052+00	Active	\N	jacket_product_lines	25
36	1	24	\N	\N	\N	Stop number changed	Stop Change	stop_number	2	+3	5	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:44:47.128039+00	2026-08-08 12:44:47.128039+00	Active	\N	stops	90
37	1	24	\N	\N	\N	Stop number changed	Stop Change	stop_number	3	-1	2	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:44:49.292626+00	2026-08-08 12:44:49.292626+00	Active	\N	stops	91
38	1	24	\N	\N	\N	Stop number changed	Stop Change	stop_number	5	-2	3	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:44:54.749398+00	2026-08-08 12:44:54.749398+00	Active	\N	stops	93
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_settings (key, value) FROM stdin;
profresh_website_url	https://profreshsourcing.com
customer_portal_url	https://fresh-axr6ynfvi-fresh-ops.vercel.app/portal/login
\.


--
-- Data for Name: call_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.call_log (call_id, call_date, party_type, supplier_id, customer_id, prospect_id, contact_name, phone, product_id, price, price_type, availability, notes, followup_date, status, quote_expiration, created_at) FROM stdin;
34	2026-08-08	Supplier	3	\N	\N	\N	\N	16	22.65	FOB	\N	\N	\N	Quoted	\N	2026-08-08 12:19:40.453951+00
35	2026-08-08	Supplier	3	\N	\N	\N	\N	26	24.65	FOB	\N	\N	\N	Quoted	\N	2026-08-08 12:21:01.46993+00
36	2026-08-08	Supplier	3	\N	\N	\N	\N	2	12.75	FOB	\N	\N	\N	Quoted	\N	2026-08-08 12:21:01.46993+00
37	2026-08-08	Supplier	2	\N	\N	\N	\N	6	20.25	FOB	\N	\N	\N	Quoted	\N	2026-08-08 12:21:26.000265+00
38	2026-08-08	Supplier	2	\N	\N	\N	\N	11	21.45	FOB	\N	\N	\N	Quoted	\N	2026-08-08 12:22:32.570464+00
39	2026-08-08	Supplier	4	\N	\N	\N	\N	1	11.75	FOB	\N	\N	\N	Quoted	\N	2026-08-08 12:23:05.044976+00
\.


--
-- Data for Name: carriers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.carriers (carrier_id, name, mc_number, dot_number, insurance_expiry, contact, phone, active) FROM stdin;
1	STS	MC-1724371	4394731	2026-06-26	Jack	972-876-6494	t
\.


--
-- Data for Name: claims; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.claims (claim_id, jacket_line_id, claim_type, description, date_opened, status, resolution, flag_for_credit_memo, resolution_price_adjustment, resolved_at, snapshot_jacket_number, snapshot_order_no, snapshot_customer, snapshot_commodity) FROM stdin;
7	\N	Shortage	-40 cases not loaded	2026-08-07	Resolved		t	-2	2026-08-07 00:29:10.486+00	86886	\N	J Luna	Artichoke
8	\N	Pricing	wants protection ($1 off)	2026-08-08	Resolved	took a dollar off	t	-1	2026-08-08 12:10:22.733+00	NOVA	44444	Alvarados	Broccoli (ICED)
\.


--
-- Data for Name: customer_locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_locations (location_id, customer_id, label, address, city, state, zip, contact, phone, notes, is_primary) FROM stdin;
\.


--
-- Data for Name: customer_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_notifications (notification_id, jacket_line_id, notification_type, notified_at) FROM stdin;
\.


--
-- Data for Name: customer_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_orders (customer_order_id, acumatica_order_no, customer_id, customer_po, order_date, requested_delivery, salesperson, order_status, source, notes, customer_location_id, order_type, organization_id) FROM stdin;
59	11111	6	\N	2026-08-08	\N	\N	Open	Internal	\N	\N	Produce Sale	1
60	3333333	7	\N	2026-08-08	\N	\N	Open	Internal	\N	\N	Produce Sale	1
61	666666666	4	\N	2026-08-08	\N	\N	Open	Internal	\N	\N	Produce Sale	1
62	78787878	2	\N	2026-08-08	\N	\N	Open	Internal	\N	\N	Freight Only	1
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (customer_id, company, buyer_contact, phone, email, delivery_address, city, state, zip, delivery_notes, payment_terms, notes, active, portal_auth_id, portal_invited_at, created_at, organization_id) FROM stdin;
1	Sunflo	Scotty	\N		\N	\N	\N	\N	\N	\N	\N	t	71811925-e13f-49ea-aa1f-af54e011a7ea	\N	2026-07-29 01:29:48.868533+00	1
2	Buster Lind	Cameron							\N		\N	t	\N	\N	2026-07-30 21:52:50.017836+00	1
3	J Luna					Houston	Tx		\N		\N	t	\N	\N	2026-08-01 23:20:25.086538+00	1
4	Northside Banana					Houston	TX		\N		\N	t	\N	\N	2026-08-01 23:20:51.26257+00	1
5	R & R					Stafford	TX		\N		\N	t	\N	\N	2026-08-01 23:21:23.92469+00	1
6	Alvarados	Carmelo	713-206-4686						\N		\N	t	\N	\N	2026-08-03 22:18:35.880236+00	1
7	J&R	Rudy	281-541-1769						\N		\N	t	\N	\N	2026-08-03 22:19:01.375921+00	1
\.


--
-- Data for Name: financial_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.financial_adjustments (adjustment_id, jacket_id, adjustment_type, description, amount, direction, adjustment_date, related_order_line_id, related_claim_id, related_freight_id, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: freight_only_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.freight_only_lines (freight_only_line_id, customer_order_id, jacket_id, product_id, commodity_description, cases, pallets, weight, customer_freight_charge, allocated_freight_cost, pickup_location, delivery_location, status, notes, created_at) FROM stdin;
6	62	24	11	Grapefruit — CTN	108	2	4752	425	375	CSI Citrus	McAllen	Planned	\N	2026-08-08 12:41:33.693289+00
\.


--
-- Data for Name: freight_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.freight_records (freight_id, jacket_id, quote_date, carrier, truck_type, trip_type, quoted_rate, booked_rate, miles, status, carrier_invoice_number, invoice_received, carrier_paid, notes, extra_fees, extra_fees_notes) FROM stdin;
9	24	2026-08-08	STS	\N	Multi Pick/Multi Drop	8500	8000	2150	Quoted	\N	f	f	\N	0	\N
\.


--
-- Data for Name: jacket_commodity_loads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jacket_commodity_loads (id, jacket_id, product_id, actual_cases_loaded, supplier_id) FROM stdin;
\.


--
-- Data for Name: jacket_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jacket_documents (document_id, jacket_id, document_type, file_name, url, notes, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: jacket_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jacket_events (event_id, jacket_id, event_type, description, original_value, adjustment, new_value, created_by, created_at) FROM stdin;
100	24	order_created	New order created for Alvarados — 440 cases	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:33:23.803037+00
101	24	order_created	New order created for J&R — 432 cases	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:34:01.788644+00
102	24	order_created	New order created for Northside Banana — 1200 cases	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:34:29.526673+00
103	24	product_added	Purchased 476 cases of Grapefruit from Valhalla	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:36:19.440545+00
104	24	product_amended	Purchased product amended — Grapefruit	\N	\N	476 cases @ $23.5/cs	abbyem08@gmail.com	2026-08-08 12:36:32.886389+00
105	24	product_added	Purchased 440 cases of Iceberg Liner from Agro Jal	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:37:16.961982+00
106	24	product_added	Purchased 1200 cases of Blackberry from King Fresh LLC	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:37:55.34656+00
107	24	product_amended	Purchased product amended — Grapefruit	\N	\N	476 cases @ $23.5/cs	abbyem08@gmail.com	2026-08-08 12:38:54.255973+00
108	24	order_allocated	Allocated 216 cases of Grapefruit to J&R (3333333)	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:39:41.545625+00
109	24	order_allocated	Allocated 440 cases of Iceberg Liner to Alvarados (11111)	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:39:51.889005+00
110	24	order_allocated	Allocated 1200 cases of Blackberry to Northside Banana (666666666)	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:40:00.574595+00
111	24	freight_only_added	Freight-only: 108 cases of Grapefruit — CTN for Buster Lind — $425 freight charge	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:41:34.003408+00
112	24	freight_updated	Freight booked — STS, Quoted	\N	\N	\N	abbyem08@gmail.com	2026-08-08 12:44:26.13979+00
\.


--
-- Data for Name: jacket_extras; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jacket_extras (extra_id, jacket_id, product_id, cases, status, notes, resolution_notes) FROM stdin;
\.


--
-- Data for Name: jacket_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jacket_lines (jacket_line_id, jacket_id, order_line_id, planned_cases, cases_to_load, actual_cases_loaded, actual_cases_delivered, estimated_pallets, line_weight, load_status, bol_number, exception_notes, pod_url, updated_at, notes, customer_notified_pickup, customer_notified_pickup_at, customer_notified_delivery, customer_notified_delivery_at, jacket_product_line_id, allocated_cost_per_case, allocation_created_at, allocation_status, customer_notification_status, customer_notification_status_at, quantity_updated_at, compensation_cases, compensation_notes) FROM stdin;
108	24	69	216	216	0	0	4	9504	Planned	\N	\N	\N	2026-08-08 12:39:37.121243+00	\N	f	\N	f	\N	25	23.5	2026-08-08 12:39:37.121243+00	Active	Not Loaded Yet	\N	\N	0	\N
109	24	68	440	440	0	0	11	19360	Planned	\N	\N	\N	2026-08-08 12:39:49.086304+00	\N	f	\N	f	\N	26	15	2026-08-08 12:39:49.086304+00	Active	Not Loaded Yet	\N	\N	0	\N
110	24	70	1200	1200	0	0	7	9600	Planned	\N	\N	\N	2026-08-08 12:39:58.078205+00	\N	f	\N	f	\N	27	17.5	2026-08-08 12:39:58.078205+00	Active	Not Loaded Yet	\N	\N	0	\N
\.


--
-- Data for Name: jacket_product_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jacket_product_lines (jacket_product_line_id, jacket_id, supplier_id, supplier_location_id, product_id, shipper_po, purchased_cases, actual_cases_received, purchase_cost_per_case, fee_total_per_case, product_status, notes, created_at, updated_at) FROM stdin;
26	24	3	\N	2	\N	440	440	15	0	Active	\N	2026-08-08 12:37:16.65299+00	2026-08-08 12:37:17.438+00
27	24	6	\N	51	\N	1200	1200	17.5	0	Active	\N	2026-08-08 12:37:55.112504+00	2026-08-08 12:37:55.527+00
25	24	2	\N	11	123	476	216	23.5	0	Active	\N	2026-08-08 12:36:19.175605+00	2026-08-08 12:38:54.145+00
\.


--
-- Data for Name: jackets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jackets (jacket_id, jacket_number, jacket_date, carrier, driver, driver_phone, truck, trailer, truck_type, route, jacket_status, weight_capacity, pallet_capacity, closed_at, notes, supplier_payment_arrangement, supplier_payment_status, supplier_amount_paid, supplier_payment_due_date, supplier_payment_notes, organization_id) FROM stdin;
24	Santi	2026-08-08	\N	\N	\N	\N	\N	\N	\N	Planning	44000	24	\N	\N	\N	Unpaid	0	\N	\N	1
\.


--
-- Data for Name: order_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_lines (order_line_id, customer_order_id, supplier_id, shipper_po, product_id, cases_ordered, sell_price_per_case, fob_cost_per_case, pricing_type, line_status, notes, supplier_location_id, original_cases_ordered, original_sell_price_per_case, original_fob_cost_per_case, amendment_notes, amended_at, source_price_sheet_line_id, price_snapshot) FROM stdin;
70	61	6	\N	51	1200	23.5	17.5	\N	Open	\N	\N	1200	\N	\N	\N	\N	\N	\N
69	60	2	\N	11	432	17.5	23.5	\N	Open	\N	\N	432	\N	\N	\N	\N	\N	\N
68	59	3	\N	2	440	16.5	15	\N	Open	\N	\N	440	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: order_request_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_request_lines (request_line_id, request_id, product_id, cases_requested, notes) FROM stdin;
\.


--
-- Data for Name: order_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_requests (request_id, customer_id, requested_at, status, reviewed_by, reviewed_at, converted_order_id, notes) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizations (organization_id, name, created_at) FROM stdin;
1	FreshOps	2026-08-06 12:57:14.628645+00
\.


--
-- Data for Name: price_sheet_line_fees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_sheet_line_fees (fee_id, price_sheet_line_id, description, amount, basis, notes) FROM stdin;
\.


--
-- Data for Name: price_sheet_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_sheet_lines (price_sheet_line_id, price_sheet_id, product_id, cost_price, margin_pct, source_call_id, supplier_id, markup_type, markup_dollar, est_carrier_cost_per_pallet, customer_freight_per_case) FROM stdin;
83	15	1	11.75	10	39	4	percent	2	0	0
88	15	16	22.65	10	34	3	percent	0	0	0
86	15	26	24.65	20	35	3	percent	0	0	0
87	15	2	12.75	10	36	3	percent	0	0	0
85	15	6	20.25	10	37	2	percent	0	0	0
84	15	11	21.45	10	38	2	percent	0	375	6.82
\.


--
-- Data for Name: price_sheet_recipients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_sheet_recipients (price_sheet_recipient_id, price_sheet_id, customer_id, sent_at, method, contact_email, contact_phone) FROM stdin;
17	15	6	2026-08-08 12:30:24.468078+00	Portal Link	\N	713-206-4686
18	15	3	2026-08-08 12:30:29.145463+00	Portal Link	\N	\N
19	15	7	2026-08-08 12:30:32.62995+00	Portal Link	\N	281-541-1769
20	15	4	2026-08-08 12:30:39.845638+00	Portal Link	\N	\N
\.


--
-- Data for Name: price_sheet_snapshot_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_sheet_snapshot_lines (snapshot_line_id, snapshot_id, product_id, supplier_id, commodity, pack_size, raw_cost, fee_total, internal_cost, customer_fob, customer_delivered, est_carrier_cost_per_pallet, customer_freight_per_case) FROM stdin;
1	1	1	1	Iceberg Wrap	24 ct	14	0	14	22	24	20	2
2	1	2	1	Iceberg Liner	24 ct	12	0	12	14.399999999999999	14.399999999999999	0	0
3	1	3	5	Romaine Liner	24ct	14	0	14	16.8	16.8	0	0
4	1	4	5	Romaine Hearts	12/3	15	0	15	18	18	0	0
5	1	5	5	Green Leaf	24 ct	15	0	15	18	18	0	0
\.


--
-- Data for Name: price_sheet_snapshot_recipients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_sheet_snapshot_recipients (id, snapshot_id, customer_id, contact_email, contact_phone) FROM stdin;
1	1	2		\N
\.


--
-- Data for Name: price_sheet_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_sheet_snapshots (snapshot_id, price_sheet_id, sheet_date, valid_through, saved_at, notes) FROM stdin;
1	\N	2026-08-01	2026-08-05	2026-08-02 05:45:52.883809+00	\N
\.


--
-- Data for Name: price_sheets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_sheets (price_sheet_id, sheet_date, valid_through, created_by, notes) FROM stdin;
15	2026-08-08	2026-08-12	\N	\N
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (product_id, commodity, pack_size, gross_weight_per_case, cases_per_pallet, default_origin, notes, active) FROM stdin;
5	Green Leaf	24 ct	30	42	CA	\N	t
4	Romaine Hearts	12/3	30	56	CA	\N	t
3	Romaine Liner	24ct	40	35	CA	\N	t
6	Orange	BAG	\N	42	CA	\N	t
9	Lemon	BAG	\N	42	CA	\N	t
10	Grapefruit	BAG	\N	42	CA	\N	t
12	Mandarin	BAG	\N	60		\N	t
13	Red Leaf	24 ct	30	42	CA	\N	t
2	Iceberg Liner	24 ct	44	40	CA	\N	t
1	Iceberg Wrap	24 ct	40	40	CA	\N	t
14	Broccoli (ICED)	14ct	32	48	CA	\N	t
17	Broccoli (ICLS)	Crown	25	56	CA	\N	t
19	Cauliflower	12 ct	30	56	CA	\N	t
18	Cauliflower	9 ct	30	48	CA	\N	t
20	Cauliflower	16 ct	30	56	CA	\N	t
21	Celery (NKD)	24 ct	58	32	CA	\N	t
22	Celery (NKD)	30 ct	58	32	CA	\N	t
23	Celery (NKD)	36 ct	58	32	CA	\N	t
24	Celery (SLVD)	 24ct	58	32	CA	\N	t
25	Celery (SLVD)	30 ct	58	32	CA	\N	t
26	Celery (SLVD)	36 ct	58	32	CA	\N	t
27	Green Onion (ICED)	G.O.	15	84	CA	\N	t
28	Green Onion (ICLS)	2/24	10	120	CA	\N	t
29	Green Onion (ICLS)	4/12	10	120	CA	\N	t
30	Cilantro	30 ct	20	80	CA	\N	t
31	Cilantro	60 ct	30	48	CA	\N	t
32	Italian Parsley	30 ct	20	80	CA	\N	t
33	Italian Parsley	60 ct	30	48	CA	\N	t
34	Curly Parsley	30 ct	20	80	CA	\N	t
35	Curly Parsley	48	30	48	CA	\N	t
36	Fennel	12 ct	30	56	CA	\N	t
37	Fennel	18 ct	30	56	CA	\N	t
38	Fennel	24 ct	30	56	CA	\N	t
39	Fennel	30 ct	30	56	CA	\N	t
40	Brussel Sprout	25# BULK	30	56	CA	\N	t
41	Kale	24 ct	30	42	CA	\N	t
42	Spinach	24 ct	15	48	CA	\N	t
44	Artichoke	18 ct	30	56	CA	\N	t
43	Artichoke	12 ct	30	56	CA	\N	t
45	Artichoke	24 ct	30	56	CA	\N	t
46	Broccolini	18 ct	22	80	CA	\N	t
47	Broc Rabe	20 ct	30	48	CA	\N	t
48	Strawberry	8/1#	10	120	CA	\N	t
49	Blueberry	12/6 oz	8	196	CA	\N	t
50	Blueberry	12/1 Pint	10	144	CA	\N	t
51	Blackberry	12/6 oz	8	196	CA	\N	t
52	Raspberry	12/6 oz	8	196	CA	\N	t
8	Lemon	CTN	44	54	CA	\N	t
7	Orange 	CTN	44	54	CA	\N	t
11	Grapefruit	CTN	44	55	CA	\N	t
53	Leek	12 ct	30	48	CA	\N	t
54	Bok Choy	30 lb	30	48	CA	\N	t
55	Bok Choy	50 lb	\N	\N	CA	\N	t
56	Napa	30lb	\N	48	CA	\N	t
57	Napa	50 lb	50	\N	CA	\N	t
58	Escarole	24 ct	30	56	CA	\N	t
59	Endive	24 ct	30	56	CA	\N	t
16	Broccoli (ICED)	Crown	32	56	CA	\N	t
15	Broccoli (ICLS)	14 ct	25	48	CA	\N	t
\.


--
-- Data for Name: prospects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prospects (prospect_id, prospect_type, company, contact, phone, email, status, last_contact_date, next_followup_date, notes, converted_to_id, created_at) FROM stdin;
\.


--
-- Data for Name: status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.status_history (history_id, entity_type, entity_id, old_status, new_status, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: stop_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stop_lines (stop_line_id, stop_id, jacket_line_id, cases_at_stop, pallets_at_stop, notes) FROM stdin;
213	89	108	216	4	\N
214	90	108	216	4	\N
215	91	109	440	11	\N
216	92	109	440	11	\N
217	93	110	1200	7	\N
218	94	110	1200	7	\N
\.


--
-- Data for Name: stops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stops (stop_id, jacket_id, stop_number, stop_type, supplier_id, customer_id, address, contact, phone, appointment, status, notes, supplier_location_id, customer_location_id) FROM stdin;
89	24	1	Pickup	2	\N	\N	\N	\N	\N	Planned	\N	\N	\N
92	24	4	Delivery	\N	6	\N	\N	\N	\N	Planned	\N	\N	\N
94	24	6	Delivery	\N	4	\N	\N	\N	\N	Planned	\N	\N	\N
90	24	5	Delivery	\N	7	\N	\N	\N	\N	Planned	\N	\N	\N
91	24	2	Pickup	3	\N	\N	\N	\N	\N	Planned	\N	\N	\N
93	24	3	Pickup	6	\N	\N	\N	\N	\N	Planned	\N	\N	\N
\.


--
-- Data for Name: supplier_locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier_locations (location_id, supplier_id, label, address, city, state, zip, contact, phone, notes, is_primary) FROM stdin;
1	2	FIllmore Piru	357 Main St	Piru	CA	93040		805-521-1781		f
2	2	Villa Park #2	960 3rd ST	Fillmore	CA	93015		805-524-0411		f
4	2	Saticoy Packing	600 E. Third ST	Oxnard	CA	93030		805-654-6500		f
5	2	Legacy Packing	38773 RD 48 	Dinuba	CA	93618		559-591-2345		f
3	2	Wonderful - Artic Cold	2600 Sakioka Dr.	Oxnard	CA	93030		805-919-4410		f
6	2	Wonderful Citrus	1710 S Lexington ST	Delano	CA	93215		661-720-2400		f
7	2	Lee Packing	5555 Hill Ave	Orange Cove	CA	93646		559-626-7490		f
8	2	Villa Park #1	22466 Ave. 196	Strathmore	CA	93627		559-568-1768		f
9	2	Klink Citrus	15804 Live Oad Dr.	Ivanhoe	CA	93235		559-798-1124		f
10	2	Blue Banner	2604 3rd ST	Eastside	CA			951-686-2422		f
11	2	Terra Bella	9283 Clemens Rd		CA	93270		559-535-2200		f
12	2	Porterville Citrus (Porterville)	60 N. E. ST	Porterville	CA	93257		559-784-3393		f
13	2	Porterville Citrus (Strathmore)	22597 Ave. 200	Lindsay	CA	93247		559-568-1768		f
14	4	Salinas	1622 Moffett St	Salinas	CA	93905		831-755-1398		f
16	3	Santa Maria	257 Kathleen Ct	Santa Maria	CA	93458		805-928-7303		f
17	1	Logicold	2300 Sweet water		TX					f
15	4	Santa Maria	1701 E Betteravia Rd	Santa Maria	CA	93454		805-621-5550		f
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (supplier_id, company, contact, phone, email, pickup_address, city, state, zip, payment_terms, paca_license, notes, active, per_case_fee, per_case_fee_notes, organization_id) FROM stdin;
3	Agro Jal					Santa Maria	California				\N	t	0		1
4	P.I.M.					Oxnard	California				\N	t	0		1
2	Valhalla	Tom Wolfe		twolfe@valhallasales.com	123 street address	Kingsberg	California	77555			\N	t	0	\N	1
5	Le Banana	Myra	956-658-3834			Hidalgo	Texas				\N	t	0		1
1	Happy	Luis V			Logicold 						\N	t	0.45	Xmac Charge on all Logi Product	1
6	King Fresh LLC		559-596-2040	www.kingfresh.com	4731 Avenue 400	Dinuba	CA				\N	t	0		1
7	Lakeway					Pharr	TX				\N	t	0		1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, name, email, role, active, created_at, appearance_theme, organization_id) FROM stdin;
1f231474-dd97-48ce-9b37-525dec938e45	JCM	jmartinez@profreshsourcing.com	Sales	t	2026-07-29 19:59:19.119635+00	freshops_light	1
0c3c1159-e441-433d-9e57-48d45d170d4a	Abbye	abbyem08@gmail.com	Admin	t	2026-07-29 02:44:18.407954+00	freshops_light	1
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-07-29 00:32:50
20211116045059	2026-07-29 00:32:50
20211116050929	2026-07-29 00:32:50
20211116051442	2026-07-29 00:32:50
20211116212300	2026-07-29 00:32:50
20211116213355	2026-07-29 00:32:50
20211116213934	2026-07-29 00:32:50
20211116214523	2026-07-29 00:32:50
20211122062447	2026-07-29 00:32:50
20211124070109	2026-07-29 00:32:50
20211202204204	2026-07-29 00:32:50
20211202204605	2026-07-29 00:32:50
20211210212804	2026-07-29 00:32:50
20211228014915	2026-07-29 00:32:50
20220107221237	2026-07-29 00:32:50
20220228202821	2026-07-29 00:32:50
20220312004840	2026-07-29 00:32:50
20220603231003	2026-07-29 00:32:50
20220603232444	2026-07-29 00:32:50
20220615214548	2026-07-29 00:32:50
20220712093339	2026-07-29 00:32:50
20220908172859	2026-07-29 00:32:50
20220916233421	2026-07-29 00:32:50
20230119133233	2026-07-29 00:32:50
20230128025114	2026-07-29 00:32:50
20230128025212	2026-07-29 00:32:50
20230227211149	2026-07-29 00:32:50
20230228184745	2026-07-29 00:32:50
20230308225145	2026-07-29 00:32:50
20230328144023	2026-07-29 00:32:50
20231018144023	2026-07-29 00:32:50
20231204144023	2026-07-29 00:32:50
20231204144024	2026-07-29 00:32:50
20231204144025	2026-07-29 00:32:50
20240108234812	2026-07-29 00:32:50
20240109165339	2026-07-29 00:32:50
20240227174441	2026-07-29 00:32:50
20240311171622	2026-07-29 00:32:50
20240321100241	2026-07-29 00:32:50
20240401105812	2026-07-29 00:32:50
20240418121054	2026-07-29 00:32:50
20240523004032	2026-07-29 00:32:50
20240618124746	2026-07-29 00:32:50
20240801235015	2026-07-29 00:32:50
20240805133720	2026-07-29 00:32:50
20240827160934	2026-07-29 00:32:50
20240919163303	2026-07-29 00:32:50
20240919163305	2026-07-29 00:32:50
20241019105805	2026-07-29 00:32:50
20241030150047	2026-07-29 00:32:50
20241108114728	2026-07-29 00:32:50
20241121104152	2026-07-29 00:32:50
20241130184212	2026-07-29 00:32:50
20241220035512	2026-07-29 00:32:50
20241220123912	2026-07-29 00:32:50
20241224161212	2026-07-29 00:32:50
20250107150512	2026-07-29 00:32:50
20250110162412	2026-07-29 00:32:50
20250123174212	2026-07-29 00:32:50
20250128220012	2026-07-29 00:32:50
20250506224012	2026-07-29 00:32:50
20250523164012	2026-07-29 00:32:50
20250714121412	2026-07-29 00:32:50
20250905041441	2026-07-29 00:32:50
20251103001201	2026-07-29 00:32:50
20251120212548	2026-07-29 00:32:50
20251120215549	2026-07-29 00:32:50
20260218120000	2026-07-29 00:32:50
20260326120000	2026-07-29 00:32:50
20260514120000	2026-07-29 00:32:50
20260527120000	2026-07-29 00:32:50
20260528120000	2026-07-29 00:32:50
20260603120000	2026-07-29 00:32:50
20260605120000	2026-07-29 00:32:50
20260606110000	2026-07-29 00:32:50
20260616120000	2026-07-29 00:32:50
20260624120000	2026-07-29 00:32:50
20260626120000	2026-07-29 00:32:50
20260706120000	2026-07-29 00:32:50
20260707120000	2026-07-29 00:32:50
20260709120000	2026-07-29 00:32:50
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter, selected_columns) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-07-28 22:33:25.236728
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-07-28 22:33:25.283169
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-07-28 22:33:25.28945
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-07-28 22:33:25.319358
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-07-28 22:33:25.340865
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-07-28 22:33:25.345303
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-07-28 22:33:25.351574
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-07-28 22:33:25.35715
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-07-28 22:33:25.361467
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-07-28 22:33:25.366539
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-07-28 22:33:25.372582
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-07-28 22:33:25.384227
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-07-28 22:33:25.389405
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-07-28 22:33:25.394278
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-07-28 22:33:25.401171
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-07-28 22:33:25.437065
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-07-28 22:33:25.442605
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-07-28 22:33:25.4471
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-07-28 22:33:25.451246
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-07-28 22:33:25.457246
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-07-28 22:33:25.462967
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-07-28 22:33:25.469407
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-07-28 22:33:25.486984
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-07-28 22:33:25.498501
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-07-28 22:33:25.502982
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-07-28 22:33:25.507519
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-07-28 22:33:25.51216
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-07-28 22:33:25.516103
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-07-28 22:33:25.520139
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-07-28 22:33:25.524088
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-07-28 22:33:25.528535
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-07-28 22:33:25.532402
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-07-28 22:33:25.536184
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-07-28 22:33:25.540125
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-07-28 22:33:25.54405
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-07-28 22:33:25.547991
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-07-28 22:33:25.552105
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-07-28 22:33:25.556297
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-07-28 22:33:25.561479
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-07-28 22:33:25.576292
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-07-28 22:33:25.58024
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-07-28 22:33:25.5843
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-07-28 22:33:25.588618
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-07-28 22:33:25.592636
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-07-28 22:33:25.596729
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-07-28 22:33:25.60196
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-07-28 22:33:25.614034
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-07-28 22:33:25.619175
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-07-28 22:33:25.623507
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-07-28 22:33:25.65171
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-07-28 22:33:25.656737
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-07-28 22:33:26.28831
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-07-28 22:33:26.290314
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-07-28 22:33:26.301544
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-07-28 22:33:26.304116
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-07-28 22:33:26.305863
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-07-28 22:33:26.311273
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-07-28 22:33:26.317184
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-07-28 22:33:26.321445
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-07-28 22:33:26.326613
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-07-28 22:33:26.331248
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: -
--

COPY supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) FROM stdin;
20260806121758	{"create table if not exists customer_notifications (\n  notification_id serial primary key,\n  jacket_line_id int references jacket_lines(jacket_line_id) on delete cascade,\n  notification_type text not null,\n  notified_at timestamptz default now()\n);\ncreate index if not exists idx_cn_jacket_line on customer_notifications(jacket_line_id);\n\nalter table customer_notifications enable row level security;\ndrop policy if exists \\"staff full access\\" on customer_notifications;\ncreate policy \\"staff full access\\" on customer_notifications for all using (is_staff()) with check (is_staff());"}	create_customer_notifications	abbyem08@gmail.com	\N	\N
20260806125714	{"-- Phase 4: real amendment ledger + minimal multi-tenant readiness\n-- Additive only.\n\ncreate table if not exists organizations (\n  organization_id serial primary key,\n  name text not null,\n  created_at timestamptz default now()\n);\ninsert into organizations (name) select 'FreshOps' where not exists (select 1 from organizations);\n\n-- organization_id on the core tables — nullable-safe default to the one\n-- existing org, so nothing breaks; full multi-tenant RLS is a later step\n-- once there's an actual second organization to isolate against\nalter table customers add column if not exists organization_id int references organizations(organization_id) default 1;\nalter table suppliers add column if not exists organization_id int references organizations(organization_id) default 1;\nalter table jackets add column if not exists organization_id int references organizations(organization_id) default 1;\nalter table customer_orders add column if not exists organization_id int references organizations(organization_id) default 1;\nalter table users add column if not exists organization_id int references organizations(organization_id) default 1;\n\ncreate table if not exists amendments (\n  amendment_id serial primary key,\n  organization_id int references organizations(organization_id) default 1,\n  jacket_id int references jackets(jacket_id),\n  order_line_id int references order_lines(order_line_id),\n  jacket_product_line_id int references jacket_product_lines(jacket_product_line_id),\n  freight_record_id int references freight_records(freight_id),\n  amendment_name text not null,\n  amendment_type text not null,\n  target_field text,\n  original_value text,\n  adjustment_value text,\n  new_effective_value text,\n  unit text,\n  reason text,\n  notes text,\n  created_by text,\n  created_at timestamptz default now(),\n  effective_at timestamptz default now(),\n  status text default 'Active',\n  reversed_by_amendment_id int references amendments(amendment_id)\n);\ncreate index if not exists idx_amend_jacket on amendments(jacket_id);\ncreate index if not exists idx_amend_order_line on amendments(order_line_id);\ncreate index if not exists idx_amend_status on amendments(status);\n\nalter table amendments enable row level security;\ndrop policy if exists \\"staff full access\\" on amendments;\ncreate policy \\"staff full access\\" on amendments for all using (is_staff()) with check (is_staff());"}	phase4_amendments_and_orgs	abbyem08@gmail.com	\N	\N
20260806211939	{"-- Make amendments generically reversible: know exactly which table and\n-- row to write back to, instead of only logging a paper record.\nalter table amendments add column if not exists target_table text;\nalter table amendments add column if not exists target_record_id text;"}	amendments_generic_target	abbyem08@gmail.com	\N	\N
20260806234027	{"alter table organizations enable row level security;\ndrop policy if exists \\"staff full access\\" on organizations;\ncreate policy \\"staff full access\\" on organizations for all using (is_staff()) with check (is_staff());"}	fix_organizations_rls	abbyem08@gmail.com	\N	\N
20260807021648	{"-- Deleting a Jacket should take its amendment history with it (nothing\n-- left to view it against). Deleting an individual order line, purchased\n-- product, or freight record while the Jacket still exists should keep\n-- the amendment record but null the now-invalid reference, not block\n-- the delete.\n\nalter table amendments drop constraint amendments_jacket_id_fkey;\nalter table amendments add constraint amendments_jacket_id_fkey\n  foreign key (jacket_id) references jackets(jacket_id) on delete cascade;\n\nalter table amendments drop constraint amendments_order_line_id_fkey;\nalter table amendments add constraint amendments_order_line_id_fkey\n  foreign key (order_line_id) references order_lines(order_line_id) on delete set null;\n\nalter table amendments drop constraint amendments_jacket_product_line_id_fkey;\nalter table amendments add constraint amendments_jacket_product_line_id_fkey\n  foreign key (jacket_product_line_id) references jacket_product_lines(jacket_product_line_id) on delete set null;\n\nalter table amendments drop constraint amendments_freight_record_id_fkey;\nalter table amendments add constraint amendments_freight_record_id_fkey\n  foreign key (freight_record_id) references freight_records(freight_id) on delete set null;\n\nalter table amendments drop constraint amendments_reversed_by_amendment_id_fkey;\nalter table amendments add constraint amendments_reversed_by_amendment_id_fkey\n  foreign key (reversed_by_amendment_id) references amendments(amendment_id) on delete set null;"}	fix_amendments_fk_cascade	abbyem08@gmail.com	\N	\N
20260807021729	{"-- Deleting a Jacket should take its own operational records with it\n-- (allocations, stops, freight, extras) — these can't meaningfully exist\n-- without their Jacket. Same for an order line's allocations, and an\n-- order's lines. Order requests keep their history if the order they\n-- became gets deleted, just with the link cleared.\n\nalter table jacket_lines drop constraint jacket_lines_jacket_id_fkey;\nalter table jacket_lines add constraint jacket_lines_jacket_id_fkey\n  foreign key (jacket_id) references jackets(jacket_id) on delete cascade;\n\nalter table jacket_extras drop constraint jacket_extras_jacket_id_fkey;\nalter table jacket_extras add constraint jacket_extras_jacket_id_fkey\n  foreign key (jacket_id) references jackets(jacket_id) on delete cascade;\n\nalter table stops drop constraint stops_jacket_id_fkey;\nalter table stops add constraint stops_jacket_id_fkey\n  foreign key (jacket_id) references jackets(jacket_id) on delete cascade;\n\nalter table freight_records drop constraint freight_records_jacket_id_fkey;\nalter table freight_records add constraint freight_records_jacket_id_fkey\n  foreign key (jacket_id) references jackets(jacket_id) on delete cascade;\n\nalter table freight_only_lines drop constraint freight_only_lines_jacket_id_fkey;\nalter table freight_only_lines add constraint freight_only_lines_jacket_id_fkey\n  foreign key (jacket_id) references jackets(jacket_id) on delete cascade;\n\nalter table jacket_lines drop constraint jacket_lines_order_line_id_fkey;\nalter table jacket_lines add constraint jacket_lines_order_line_id_fkey\n  foreign key (order_line_id) references order_lines(order_line_id) on delete cascade;\n\nalter table stop_lines drop constraint stop_lines_jacket_line_id_fkey;\nalter table stop_lines add constraint stop_lines_jacket_line_id_fkey\n  foreign key (jacket_line_id) references jacket_lines(jacket_line_id) on delete cascade;\n\nalter table order_lines drop constraint order_lines_customer_order_id_fkey;\nalter table order_lines add constraint order_lines_customer_order_id_fkey\n  foreign key (customer_order_id) references customer_orders(customer_order_id) on delete cascade;\n\nalter table order_requests drop constraint order_requests_converted_order_id_fkey;\nalter table order_requests add constraint order_requests_converted_order_id_fkey\n  foreign key (converted_order_id) references customer_orders(customer_order_id) on delete set null;"}	fix_all_jacket_order_cascade_deletes	abbyem08@gmail.com	\N	\N
20260807190209	{"create table if not exists financial_adjustments (\n  adjustment_id serial primary key,\n  jacket_id int references jackets(jacket_id) on delete cascade,\n  adjustment_type text not null,\n  description text,\n  amount numeric not null,\n  direction text not null check (direction in ('Revenue','Cost')),\n  adjustment_date date default current_date,\n  related_order_line_id int references order_lines(order_line_id) on delete set null,\n  related_claim_id int references claims(claim_id) on delete set null,\n  related_freight_id int references freight_records(freight_id) on delete set null,\n  notes text,\n  created_by text,\n  created_at timestamptz default now()\n);\ncreate index if not exists idx_fa_jacket on financial_adjustments(jacket_id);\n\nalter table financial_adjustments enable row level security;\ndrop policy if exists \\"staff full access\\" on financial_adjustments;\ncreate policy \\"staff full access\\" on financial_adjustments for all using (is_staff()) with check (is_staff());"}	create_financial_adjustments	abbyem08@gmail.com	\N	\N
20260808045240	{"alter table call_log add column if not exists created_at timestamptz default now();"}	add_call_log_timestamp	abbyem08@gmail.com	\N	\N
20260808045912	{"create table if not exists app_settings (\n  key text primary key,\n  value text\n);\ninsert into app_settings (key, value) values\n  ('profresh_website_url', 'https://www.profreshsourcing.com'),\n  ('customer_portal_url', '')\non conflict (key) do nothing;\n\nalter table app_settings enable row level security;\ndrop policy if exists \\"staff full access\\" on app_settings;\ncreate policy \\"staff full access\\" on app_settings for all using (is_staff()) with check (is_staff());"}	create_app_settings	abbyem08@gmail.com	\N	\N
20260808050721	{"-- A saved snapshot is a permanent historical record — deleting the live\n-- working sheet it came from should never destroy it, just leave it\n-- standing on its own (price_sheet_id goes null, snapshot itself survives).\nalter table price_sheet_snapshots drop constraint price_sheet_snapshots_price_sheet_id_fkey;\nalter table price_sheet_snapshots add constraint price_sheet_snapshots_price_sheet_id_fkey\n  foreign key (price_sheet_id) references price_sheets(price_sheet_id) on delete set null;"}	fix_price_sheet_snapshot_delete	abbyem08@gmail.com	\N	\N
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 237, true);


--
-- Name: amendments_amendment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.amendments_amendment_id_seq', 38, true);


--
-- Name: call_log_call_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.call_log_call_id_seq', 39, true);


--
-- Name: carriers_carrier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.carriers_carrier_id_seq', 1, true);


--
-- Name: claims_claim_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.claims_claim_id_seq', 8, true);


--
-- Name: customer_locations_location_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_locations_location_id_seq', 1, false);


--
-- Name: customer_notifications_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_notifications_notification_id_seq', 9, true);


--
-- Name: customer_orders_customer_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_orders_customer_order_id_seq', 62, true);


--
-- Name: customers_customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_customer_id_seq', 7, true);


--
-- Name: financial_adjustments_adjustment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.financial_adjustments_adjustment_id_seq', 1, false);


--
-- Name: freight_only_lines_freight_only_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.freight_only_lines_freight_only_line_id_seq', 6, true);


--
-- Name: freight_records_freight_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.freight_records_freight_id_seq', 9, true);


--
-- Name: jacket_commodity_loads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jacket_commodity_loads_id_seq', 5, true);


--
-- Name: jacket_documents_document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jacket_documents_document_id_seq', 1, false);


--
-- Name: jacket_events_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jacket_events_event_id_seq', 112, true);


--
-- Name: jacket_extras_extra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jacket_extras_extra_id_seq', 1, false);


--
-- Name: jacket_lines_jacket_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jacket_lines_jacket_line_id_seq', 110, true);


--
-- Name: jacket_product_lines_jacket_product_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jacket_product_lines_jacket_product_line_id_seq', 27, true);


--
-- Name: jackets_jacket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jackets_jacket_id_seq', 24, true);


--
-- Name: order_lines_order_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_lines_order_line_id_seq', 70, true);


--
-- Name: order_request_lines_request_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_request_lines_request_line_id_seq', 1, false);


--
-- Name: order_requests_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_requests_request_id_seq', 1, false);


--
-- Name: organizations_organization_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organizations_organization_id_seq', 1, true);


--
-- Name: price_sheet_line_fees_fee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_sheet_line_fees_fee_id_seq', 1, false);


--
-- Name: price_sheet_lines_price_sheet_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_sheet_lines_price_sheet_line_id_seq', 88, true);


--
-- Name: price_sheet_recipients_price_sheet_recipient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_sheet_recipients_price_sheet_recipient_id_seq', 20, true);


--
-- Name: price_sheet_snapshot_lines_snapshot_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_sheet_snapshot_lines_snapshot_line_id_seq', 5, true);


--
-- Name: price_sheet_snapshot_recipients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_sheet_snapshot_recipients_id_seq', 1, true);


--
-- Name: price_sheet_snapshots_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_sheet_snapshots_snapshot_id_seq', 1, true);


--
-- Name: price_sheets_price_sheet_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_sheets_price_sheet_id_seq', 15, true);


--
-- Name: products_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_product_id_seq', 59, true);


--
-- Name: prospects_prospect_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prospects_prospect_id_seq', 1, false);


--
-- Name: status_history_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.status_history_history_id_seq', 1, false);


--
-- Name: stop_lines_stop_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stop_lines_stop_line_id_seq', 218, true);


--
-- Name: stops_stop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stops_stop_id_seq', 94, true);


--
-- Name: supplier_locations_location_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_locations_location_id_seq', 17, true);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_supplier_id_seq', 7, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: amendments amendments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments
    ADD CONSTRAINT amendments_pkey PRIMARY KEY (amendment_id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: call_log call_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log
    ADD CONSTRAINT call_log_pkey PRIMARY KEY (call_id);


--
-- Name: carriers carriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carriers
    ADD CONSTRAINT carriers_pkey PRIMARY KEY (carrier_id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (claim_id);


--
-- Name: customer_locations customer_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_pkey PRIMARY KEY (location_id);


--
-- Name: customer_notifications customer_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notifications
    ADD CONSTRAINT customer_notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: customer_orders customer_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_pkey PRIMARY KEY (customer_order_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: financial_adjustments financial_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_adjustments
    ADD CONSTRAINT financial_adjustments_pkey PRIMARY KEY (adjustment_id);


--
-- Name: freight_only_lines freight_only_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_only_lines
    ADD CONSTRAINT freight_only_lines_pkey PRIMARY KEY (freight_only_line_id);


--
-- Name: freight_records freight_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_records
    ADD CONSTRAINT freight_records_pkey PRIMARY KEY (freight_id);


--
-- Name: jacket_commodity_loads jacket_commodity_loads_jacket_product_supplier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_commodity_loads
    ADD CONSTRAINT jacket_commodity_loads_jacket_product_supplier_key UNIQUE (jacket_id, product_id, supplier_id);


--
-- Name: jacket_commodity_loads jacket_commodity_loads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_commodity_loads
    ADD CONSTRAINT jacket_commodity_loads_pkey PRIMARY KEY (id);


--
-- Name: jacket_documents jacket_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_documents
    ADD CONSTRAINT jacket_documents_pkey PRIMARY KEY (document_id);


--
-- Name: jacket_events jacket_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_events
    ADD CONSTRAINT jacket_events_pkey PRIMARY KEY (event_id);


--
-- Name: jacket_extras jacket_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_extras
    ADD CONSTRAINT jacket_extras_pkey PRIMARY KEY (extra_id);


--
-- Name: jacket_lines jacket_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_lines
    ADD CONSTRAINT jacket_lines_pkey PRIMARY KEY (jacket_line_id);


--
-- Name: jacket_product_lines jacket_product_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_product_lines
    ADD CONSTRAINT jacket_product_lines_pkey PRIMARY KEY (jacket_product_line_id);


--
-- Name: jackets jackets_jacket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jackets
    ADD CONSTRAINT jackets_jacket_number_key UNIQUE (jacket_number);


--
-- Name: jackets jackets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jackets
    ADD CONSTRAINT jackets_pkey PRIMARY KEY (jacket_id);


--
-- Name: order_lines order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_pkey PRIMARY KEY (order_line_id);


--
-- Name: order_request_lines order_request_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_request_lines
    ADD CONSTRAINT order_request_lines_pkey PRIMARY KEY (request_line_id);


--
-- Name: order_requests order_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_requests
    ADD CONSTRAINT order_requests_pkey PRIMARY KEY (request_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (organization_id);


--
-- Name: price_sheet_line_fees price_sheet_line_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_line_fees
    ADD CONSTRAINT price_sheet_line_fees_pkey PRIMARY KEY (fee_id);


--
-- Name: price_sheet_lines price_sheet_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_lines
    ADD CONSTRAINT price_sheet_lines_pkey PRIMARY KEY (price_sheet_line_id);


--
-- Name: price_sheet_recipients price_sheet_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_recipients
    ADD CONSTRAINT price_sheet_recipients_pkey PRIMARY KEY (price_sheet_recipient_id);


--
-- Name: price_sheet_snapshot_lines price_sheet_snapshot_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_lines
    ADD CONSTRAINT price_sheet_snapshot_lines_pkey PRIMARY KEY (snapshot_line_id);


--
-- Name: price_sheet_snapshot_recipients price_sheet_snapshot_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_recipients
    ADD CONSTRAINT price_sheet_snapshot_recipients_pkey PRIMARY KEY (id);


--
-- Name: price_sheet_snapshots price_sheet_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshots
    ADD CONSTRAINT price_sheet_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: price_sheets price_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheets
    ADD CONSTRAINT price_sheets_pkey PRIMARY KEY (price_sheet_id);


--
-- Name: products products_commodity_pack_size_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_commodity_pack_size_key UNIQUE (commodity, pack_size);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: prospects prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pkey PRIMARY KEY (prospect_id);


--
-- Name: status_history status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT status_history_pkey PRIMARY KEY (history_id);


--
-- Name: stop_lines stop_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_lines
    ADD CONSTRAINT stop_lines_pkey PRIMARY KEY (stop_line_id);


--
-- Name: stops stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_pkey PRIMARY KEY (stop_id);


--
-- Name: supplier_locations supplier_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_locations
    ADD CONSTRAINT supplier_locations_pkey PRIMARY KEY (location_id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: customer_orders_acumatica_order_no_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_orders_acumatica_order_no_idx ON public.customer_orders USING btree (acumatica_order_no);


--
-- Name: idx_amend_jacket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amend_jacket ON public.amendments USING btree (jacket_id);


--
-- Name: idx_amend_order_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amend_order_line ON public.amendments USING btree (order_line_id);


--
-- Name: idx_amend_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amend_status ON public.amendments USING btree (status);


--
-- Name: idx_cn_jacket_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cn_jacket_line ON public.customer_notifications USING btree (jacket_line_id);


--
-- Name: idx_fa_jacket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fa_jacket ON public.financial_adjustments USING btree (jacket_id);


--
-- Name: idx_fol_jacket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fol_jacket ON public.freight_only_lines USING btree (jacket_id);


--
-- Name: idx_fol_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fol_order ON public.freight_only_lines USING btree (customer_order_id);


--
-- Name: idx_jd_jacket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jd_jacket ON public.jacket_documents USING btree (jacket_id);


--
-- Name: idx_je_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_je_created ON public.jacket_events USING btree (created_at);


--
-- Name: idx_je_jacket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_je_jacket ON public.jacket_events USING btree (jacket_id);


--
-- Name: idx_jl_jpl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jl_jpl ON public.jacket_lines USING btree (jacket_product_line_id);


--
-- Name: idx_jpl_jacket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jpl_jacket ON public.jacket_product_lines USING btree (jacket_id);


--
-- Name: idx_jpl_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jpl_product ON public.jacket_product_lines USING btree (product_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: amendments amendments_freight_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments
    ADD CONSTRAINT amendments_freight_record_id_fkey FOREIGN KEY (freight_record_id) REFERENCES public.freight_records(freight_id) ON DELETE SET NULL;


--
-- Name: amendments amendments_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments
    ADD CONSTRAINT amendments_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: amendments amendments_jacket_product_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments
    ADD CONSTRAINT amendments_jacket_product_line_id_fkey FOREIGN KEY (jacket_product_line_id) REFERENCES public.jacket_product_lines(jacket_product_line_id) ON DELETE SET NULL;


--
-- Name: amendments amendments_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments
    ADD CONSTRAINT amendments_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(order_line_id) ON DELETE SET NULL;


--
-- Name: amendments amendments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments
    ADD CONSTRAINT amendments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: amendments amendments_reversed_by_amendment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendments
    ADD CONSTRAINT amendments_reversed_by_amendment_id_fkey FOREIGN KEY (reversed_by_amendment_id) REFERENCES public.amendments(amendment_id) ON DELETE SET NULL;


--
-- Name: call_log call_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log
    ADD CONSTRAINT call_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: call_log call_log_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log
    ADD CONSTRAINT call_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: call_log call_log_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log
    ADD CONSTRAINT call_log_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(prospect_id);


--
-- Name: call_log call_log_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log
    ADD CONSTRAINT call_log_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: claims claims_jacket_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_jacket_line_id_fkey FOREIGN KEY (jacket_line_id) REFERENCES public.jacket_lines(jacket_line_id) ON DELETE SET NULL;


--
-- Name: customer_locations customer_locations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: customer_notifications customer_notifications_jacket_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notifications
    ADD CONSTRAINT customer_notifications_jacket_line_id_fkey FOREIGN KEY (jacket_line_id) REFERENCES public.jacket_lines(jacket_line_id) ON DELETE CASCADE;


--
-- Name: customer_orders customer_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: customer_orders customer_orders_customer_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_customer_location_id_fkey FOREIGN KEY (customer_location_id) REFERENCES public.customer_locations(location_id);


--
-- Name: customer_orders customer_orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: customers customers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: customers customers_portal_auth_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_portal_auth_id_fkey FOREIGN KEY (portal_auth_id) REFERENCES auth.users(id);


--
-- Name: financial_adjustments financial_adjustments_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_adjustments
    ADD CONSTRAINT financial_adjustments_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: financial_adjustments financial_adjustments_related_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_adjustments
    ADD CONSTRAINT financial_adjustments_related_claim_id_fkey FOREIGN KEY (related_claim_id) REFERENCES public.claims(claim_id) ON DELETE SET NULL;


--
-- Name: financial_adjustments financial_adjustments_related_freight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_adjustments
    ADD CONSTRAINT financial_adjustments_related_freight_id_fkey FOREIGN KEY (related_freight_id) REFERENCES public.freight_records(freight_id) ON DELETE SET NULL;


--
-- Name: financial_adjustments financial_adjustments_related_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_adjustments
    ADD CONSTRAINT financial_adjustments_related_order_line_id_fkey FOREIGN KEY (related_order_line_id) REFERENCES public.order_lines(order_line_id) ON DELETE SET NULL;


--
-- Name: freight_only_lines freight_only_lines_customer_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_only_lines
    ADD CONSTRAINT freight_only_lines_customer_order_id_fkey FOREIGN KEY (customer_order_id) REFERENCES public.customer_orders(customer_order_id) ON DELETE CASCADE;


--
-- Name: freight_only_lines freight_only_lines_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_only_lines
    ADD CONSTRAINT freight_only_lines_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: freight_only_lines freight_only_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_only_lines
    ADD CONSTRAINT freight_only_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: freight_records freight_records_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freight_records
    ADD CONSTRAINT freight_records_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: jacket_commodity_loads jacket_commodity_loads_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_commodity_loads
    ADD CONSTRAINT jacket_commodity_loads_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: jacket_commodity_loads jacket_commodity_loads_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_commodity_loads
    ADD CONSTRAINT jacket_commodity_loads_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: jacket_commodity_loads jacket_commodity_loads_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_commodity_loads
    ADD CONSTRAINT jacket_commodity_loads_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: jacket_documents jacket_documents_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_documents
    ADD CONSTRAINT jacket_documents_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: jacket_events jacket_events_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_events
    ADD CONSTRAINT jacket_events_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: jacket_extras jacket_extras_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_extras
    ADD CONSTRAINT jacket_extras_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: jacket_extras jacket_extras_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_extras
    ADD CONSTRAINT jacket_extras_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: jacket_lines jacket_lines_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_lines
    ADD CONSTRAINT jacket_lines_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: jacket_lines jacket_lines_jacket_product_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_lines
    ADD CONSTRAINT jacket_lines_jacket_product_line_id_fkey FOREIGN KEY (jacket_product_line_id) REFERENCES public.jacket_product_lines(jacket_product_line_id);


--
-- Name: jacket_lines jacket_lines_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_lines
    ADD CONSTRAINT jacket_lines_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(order_line_id) ON DELETE CASCADE;


--
-- Name: jacket_product_lines jacket_product_lines_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_product_lines
    ADD CONSTRAINT jacket_product_lines_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: jacket_product_lines jacket_product_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_product_lines
    ADD CONSTRAINT jacket_product_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: jacket_product_lines jacket_product_lines_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_product_lines
    ADD CONSTRAINT jacket_product_lines_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: jacket_product_lines jacket_product_lines_supplier_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jacket_product_lines
    ADD CONSTRAINT jacket_product_lines_supplier_location_id_fkey FOREIGN KEY (supplier_location_id) REFERENCES public.supplier_locations(location_id);


--
-- Name: jackets jackets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jackets
    ADD CONSTRAINT jackets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: order_lines order_lines_customer_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_customer_order_id_fkey FOREIGN KEY (customer_order_id) REFERENCES public.customer_orders(customer_order_id) ON DELETE CASCADE;


--
-- Name: order_lines order_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: order_lines order_lines_source_price_sheet_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_source_price_sheet_line_id_fkey FOREIGN KEY (source_price_sheet_line_id) REFERENCES public.price_sheet_lines(price_sheet_line_id);


--
-- Name: order_lines order_lines_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: order_lines order_lines_supplier_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_supplier_location_id_fkey FOREIGN KEY (supplier_location_id) REFERENCES public.supplier_locations(location_id);


--
-- Name: order_request_lines order_request_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_request_lines
    ADD CONSTRAINT order_request_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: order_request_lines order_request_lines_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_request_lines
    ADD CONSTRAINT order_request_lines_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.order_requests(request_id) ON DELETE CASCADE;


--
-- Name: order_requests order_requests_converted_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_requests
    ADD CONSTRAINT order_requests_converted_order_id_fkey FOREIGN KEY (converted_order_id) REFERENCES public.customer_orders(customer_order_id) ON DELETE SET NULL;


--
-- Name: order_requests order_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_requests
    ADD CONSTRAINT order_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: order_requests order_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_requests
    ADD CONSTRAINT order_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: price_sheet_line_fees price_sheet_line_fees_price_sheet_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_line_fees
    ADD CONSTRAINT price_sheet_line_fees_price_sheet_line_id_fkey FOREIGN KEY (price_sheet_line_id) REFERENCES public.price_sheet_lines(price_sheet_line_id) ON DELETE CASCADE;


--
-- Name: price_sheet_lines price_sheet_lines_price_sheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_lines
    ADD CONSTRAINT price_sheet_lines_price_sheet_id_fkey FOREIGN KEY (price_sheet_id) REFERENCES public.price_sheets(price_sheet_id) ON DELETE CASCADE;


--
-- Name: price_sheet_lines price_sheet_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_lines
    ADD CONSTRAINT price_sheet_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: price_sheet_lines price_sheet_lines_source_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_lines
    ADD CONSTRAINT price_sheet_lines_source_call_id_fkey FOREIGN KEY (source_call_id) REFERENCES public.call_log(call_id);


--
-- Name: price_sheet_lines price_sheet_lines_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_lines
    ADD CONSTRAINT price_sheet_lines_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: price_sheet_recipients price_sheet_recipients_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_recipients
    ADD CONSTRAINT price_sheet_recipients_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: price_sheet_recipients price_sheet_recipients_price_sheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_recipients
    ADD CONSTRAINT price_sheet_recipients_price_sheet_id_fkey FOREIGN KEY (price_sheet_id) REFERENCES public.price_sheets(price_sheet_id) ON DELETE CASCADE;


--
-- Name: price_sheet_snapshot_lines price_sheet_snapshot_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_lines
    ADD CONSTRAINT price_sheet_snapshot_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: price_sheet_snapshot_lines price_sheet_snapshot_lines_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_lines
    ADD CONSTRAINT price_sheet_snapshot_lines_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.price_sheet_snapshots(snapshot_id) ON DELETE CASCADE;


--
-- Name: price_sheet_snapshot_lines price_sheet_snapshot_lines_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_lines
    ADD CONSTRAINT price_sheet_snapshot_lines_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: price_sheet_snapshot_recipients price_sheet_snapshot_recipients_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_recipients
    ADD CONSTRAINT price_sheet_snapshot_recipients_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: price_sheet_snapshot_recipients price_sheet_snapshot_recipients_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshot_recipients
    ADD CONSTRAINT price_sheet_snapshot_recipients_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.price_sheet_snapshots(snapshot_id) ON DELETE CASCADE;


--
-- Name: price_sheet_snapshots price_sheet_snapshots_price_sheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheet_snapshots
    ADD CONSTRAINT price_sheet_snapshots_price_sheet_id_fkey FOREIGN KEY (price_sheet_id) REFERENCES public.price_sheets(price_sheet_id) ON DELETE SET NULL;


--
-- Name: price_sheets price_sheets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_sheets
    ADD CONSTRAINT price_sheets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: status_history status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id);


--
-- Name: stop_lines stop_lines_jacket_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_lines
    ADD CONSTRAINT stop_lines_jacket_line_id_fkey FOREIGN KEY (jacket_line_id) REFERENCES public.jacket_lines(jacket_line_id) ON DELETE CASCADE;


--
-- Name: stop_lines stop_lines_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_lines
    ADD CONSTRAINT stop_lines_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id);


--
-- Name: stops stops_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: stops stops_customer_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_customer_location_id_fkey FOREIGN KEY (customer_location_id) REFERENCES public.customer_locations(location_id);


--
-- Name: stops stops_jacket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_jacket_id_fkey FOREIGN KEY (jacket_id) REFERENCES public.jackets(jacket_id) ON DELETE CASCADE;


--
-- Name: stops stops_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: stops stops_supplier_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_supplier_location_id_fkey FOREIGN KEY (supplier_location_id) REFERENCES public.supplier_locations(location_id);


--
-- Name: supplier_locations supplier_locations_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_locations
    ADD CONSTRAINT supplier_locations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: users users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: amendments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.amendments ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: call_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_log ENABLE ROW LEVEL SECURITY;

--
-- Name: carriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

--
-- Name: claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: order_request_lines customers can add lines to their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers can add lines to their own requests" ON public.order_request_lines FOR INSERT WITH CHECK ((request_id IN ( SELECT order_requests.request_id
   FROM public.order_requests
  WHERE (order_requests.customer_id IN ( SELECT customers.customer_id
           FROM public.customers
          WHERE (customers.portal_auth_id = auth.uid()))))));


--
-- Name: order_requests customers can submit order requests for themselves only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers can submit order requests for themselves only" ON public.order_requests FOR INSERT WITH CHECK ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.portal_auth_id = auth.uid()))));


--
-- Name: products customers can view active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers can view active products" ON public.products FOR SELECT USING ((active = true));


--
-- Name: price_sheet_lines customers can view lines of sheets sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers can view lines of sheets sent to them" ON public.price_sheet_lines FOR SELECT USING ((price_sheet_id IN ( SELECT price_sheet_recipients.price_sheet_id
   FROM public.price_sheet_recipients
  WHERE (price_sheet_recipients.customer_id IN ( SELECT customers.customer_id
           FROM public.customers
          WHERE (customers.portal_auth_id = auth.uid()))))));


--
-- Name: price_sheet_recipients customers can view price sheets sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers can view price sheets sent to them" ON public.price_sheet_recipients FOR SELECT USING ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.portal_auth_id = auth.uid()))));


--
-- Name: order_requests customers can view their own order requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers can view their own order requests" ON public.order_requests FOR SELECT USING ((customer_id IN ( SELECT customers.customer_id
   FROM public.customers
  WHERE (customers.portal_auth_id = auth.uid()))));


--
-- Name: order_request_lines customers can view their own request lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers can view their own request lines" ON public.order_request_lines FOR SELECT USING ((request_id IN ( SELECT order_requests.request_id
   FROM public.order_requests
  WHERE (order_requests.customer_id IN ( SELECT customers.customer_id
           FROM public.customers
          WHERE (customers.portal_auth_id = auth.uid()))))));


--
-- Name: customers customers see only their own row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers see only their own row" ON public.customers FOR SELECT USING ((portal_auth_id = auth.uid()));


--
-- Name: financial_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: freight_only_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freight_only_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: freight_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freight_records ENABLE ROW LEVEL SECURITY;

--
-- Name: jacket_commodity_loads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jacket_commodity_loads ENABLE ROW LEVEL SECURITY;

--
-- Name: jacket_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jacket_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: jacket_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jacket_events ENABLE ROW LEVEL SECURITY;

--
-- Name: jacket_extras; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jacket_extras ENABLE ROW LEVEL SECURITY;

--
-- Name: jacket_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jacket_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: jacket_product_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jacket_product_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: jackets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jackets ENABLE ROW LEVEL SECURITY;

--
-- Name: order_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: order_request_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_request_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: order_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: price_sheet_line_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_sheet_line_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: price_sheet_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_sheet_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: price_sheet_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_sheet_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: price_sheet_snapshot_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_sheet_snapshot_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: price_sheet_snapshot_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_sheet_snapshot_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: price_sheet_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_sheet_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: price_sheets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_sheets ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: prospects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

--
-- Name: users see own user row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "see own user row" ON public.users FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: amendments staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.amendments USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: app_settings staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.app_settings USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: call_log staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.call_log USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: carriers staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.carriers USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: claims staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.claims USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: customer_locations staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.customer_locations USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: customer_notifications staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.customer_notifications USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: customer_orders staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.customer_orders USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: customers staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.customers USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: financial_adjustments staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.financial_adjustments USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: freight_only_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.freight_only_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: freight_records staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.freight_records USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: jacket_commodity_loads staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.jacket_commodity_loads USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: jacket_documents staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.jacket_documents USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: jacket_events staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.jacket_events USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: jacket_extras staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.jacket_extras USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: jacket_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.jacket_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: jacket_product_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.jacket_product_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: jackets staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.jackets USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: order_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.order_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: order_request_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.order_request_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: order_requests staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.order_requests USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: organizations staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.organizations USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: price_sheet_line_fees staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.price_sheet_line_fees USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: price_sheet_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.price_sheet_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: price_sheet_recipients staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.price_sheet_recipients USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: price_sheet_snapshot_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.price_sheet_snapshot_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: price_sheet_snapshot_recipients staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.price_sheet_snapshot_recipients USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: price_sheet_snapshots staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.price_sheet_snapshots USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: price_sheets staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.price_sheets USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: products staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.products USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: prospects staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.prospects USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: status_history staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.status_history USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: stop_lines staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.stop_lines USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: stops staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.stops USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: supplier_locations staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.supplier_locations USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: suppliers staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.suppliers USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: users staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff full access" ON public.users USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: stop_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stop_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: stops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict M6Ea1ybyDzC1TqOzMS9Kn5eFzn1WJ4Aohu30Av8L9w2p68TKxtQ7PJWnNm6SLUc

