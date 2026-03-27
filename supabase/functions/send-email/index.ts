import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Attachment {
    filename: string;
    content: string; // Base64 string
}

interface EmailRequest {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: Attachment[];
    from?: string;
}

serve(async (req) => {
    // Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY no configurado en los secretos de Supabase.");
        }

        const body: EmailRequest = await req.json();
        const { to, subject, html, attachments, from } = body;

        if (!to || !subject || !html) {
            return new Response(
                JSON.stringify({ error: "Faltan campos obligatorios: to, subject, html" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: from || "Sistema de Protección <notificaciones@sistemasdeinfancias2024.com.ar>",
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                attachments: attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                })),
            }),
        });

        const data = await response.json();

        return new Response(
            JSON.stringify(data),
            { 
                status: response.status, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
        );

    } catch (error: any) {
        console.error("Resend Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
