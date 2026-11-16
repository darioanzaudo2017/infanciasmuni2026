import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, nombre_completo, rol_id, zona_id, servicio_proteccion_id, activo, redirectTo } = body;

    if (!email || !nombre_completo || !rol_id) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios: email, nombre_completo, rol_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // --- Autorización: esta función usa service_role y por lo tanto IGNORA toda RLS.
    // Verificación de JWT de Supabase (verify_jwt) solo exige que el token sea válido
    // (la anon key pública también lo es), no que el caller tenga permisos. Por eso acá
    // se valida explícitamente: (a) que haya una sesión de usuario real detrás del token
    // (no la anon key), y (b) que ese usuario sea Administrador o Coordinador, y
    // (c) que un Coordinador (no-Admin) no pueda asignar el rol Administrador.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!callerToken) {
      return new Response(
        JSON.stringify({ error: "No autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(callerToken);
    const callerId = callerAuth?.user?.id;

    if (callerAuthError || !callerId) {
      return new Response(
        JSON.stringify({ error: "No autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerRoles, error: callerRolesError } = await supabaseAdmin
      .from("usuarios_roles")
      .select("roles(nombre)")
      .eq("usuario_id", callerId);

    if (callerRolesError) {
      console.error("Caller roles error:", callerRolesError);
      return new Response(
        JSON.stringify({ error: "No se pudo verificar el permiso del solicitante." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerRoleNames = new Set((callerRoles ?? []).map((r: any) => r.roles?.nombre));
    const callerIsAdmin = callerRoleNames.has("Administrador");
    const callerIsCoordinador = callerRoleNames.has("Coordinador");

    if (!callerIsAdmin && !callerIsCoordinador) {
      return new Response(
        JSON.stringify({ error: "No tenés permiso para crear usuarios." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: rolSolicitado } = await supabaseAdmin
      .from("roles")
      .select("nombre")
      .eq("id", rol_id)
      .single();

    if (!callerIsAdmin && rolSolicitado?.nombre === "Administrador") {
      return new Response(
        JSON.stringify({ error: "Solo un Administrador puede asignar el rol Administrador." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create the auth user with a temporary password (just for initialization)
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      // email_confirm: true, // ELIMINADO: Si confirmamos, no se puede invitar
      user_metadata: { nombre_completo }
    });

    let userId = authData?.user?.id;
    let isConfirmed = !!authData?.user?.email_confirmed_at;

    if (authError) {
      console.error("Auth Error:", authError);

      // Si el usuario ya existe, recuperarlo por email para generar nuevo link de invitación
      if (authError.message.includes("already registered") || authError.status === 422) {
        console.log("Usuario ya existe en Auth, recuperando por email...");

        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });

        if (listError) {
          console.error("List Error:", listError);
          return new Response(
            JSON.stringify({ error: `Error al buscar usuario existente: ${listError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const existingUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        if (existingUser) {
          userId = existingUser.id;
          // Forzar isConfirmed = false para siempre generar un nuevo link de invitación
          isConfirmed = false;
          console.log(`Usuario encontrado: ${userId}, generando nuevo link de invitación`);
        } else {
          return new Response(
            JSON.stringify({ error: `No se encontró el usuario con email ${email} en el sistema` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: `Error al crear usuario en Auth: ${authError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "No se pudo obtener el ID del usuario creado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Insert into usuarios table
      const { error: profileError } = await supabaseAdmin
        .from("usuarios")
        .upsert({
          id: userId,
          email,
          nombre_completo,
          zona_id: zona_id || null,
          servicio_proteccion_id: servicio_proteccion_id || null,
          activo: activo !== undefined ? activo : true
        });

    if (profileError) {
      console.error("Profile Error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Error al crear perfil: ${profileError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Insert into usuarios_roles table
      const { error: roleError } = await supabaseAdmin
        .from("usuarios_roles")
        .upsert({
          usuario_id: userId,
          rol_id: rol_id
        });

    if (roleError) {
      console.error("Role Error:", roleError);
      await supabaseAdmin.from("usuarios").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Error al asignar rol: ${roleError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. GENERATE THE INVITATION LINK (only if not confirmed)
    let linkData = null;
    let linkError = null;

    if (!isConfirmed) {
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
                redirectTo: redirectTo || undefined 
            }
        });
        linkData = data;
        linkError = error;

        if (linkError) {
            console.error("Link Error:", linkError);
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    message: "Usuario creado/actualizado, pero falló la generación del link de invitación.",
                    user_id: userId,
                    error: linkError.message,
                    is_confirmed: false
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Operación exitosa",
        user_id: userId,
        invite_link: linkData?.properties?.action_link,
        is_confirmed: isConfirmed
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected Error:", error);
    return new Response(
      JSON.stringify({ error: `Error inesperado: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
