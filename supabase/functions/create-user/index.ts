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

    // 1. Create the auth user with a temporary password (just for initialization)
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      // email_confirm: true, // ELIMINADO: Si confirmamos, no se puede invitar
      user_metadata: { nombre_completo }
    });

    let userId = authData?.user?.id;

    if (authError) {
      console.error("Auth Error:", authError);
      
      // Si el usuario ya existe, intentamos obtenerlo para generar el link de todos modos
      if (authError.message.includes("already registered") || authError.status === 422) {
        console.log("Usuario ya existe en Auth, intentando recuperar ID...");
        const { data: listUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listUsers?.users?.find(u => u.email === email);
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          return new Response(
            JSON.stringify({ error: `El usuario ya existe pero no se pudo recuperar: ${authError.message}` }),
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

    // 4. GENERATE THE INVITATION LINK (but don't send automatic email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
            // Usa el redirectTo que viene del frontend o el default por defecto del proyecto en Supabase
            redirectTo: redirectTo || undefined 
        }
    });

    if (linkError) {
      console.error("Link Error:", linkError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuario creado/actualizado, pero falló la generación del link de invitación.",
          user_id: userId,
          error: linkError.message
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuario creado exitosamente",
        user_id: userId,
        invite_link: linkData?.properties?.action_link
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
