import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entries } = await req.json();
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt with all entries to translate in batch
    const toTranslate = entries.map((e: any) => ({
      num: e.num,
      def: e.def || "",
      kjv: e.kjv || "",
    }));

    const prompt = `Você é um especialista em teologia bíblica, hebraico e grego koiné.
Traduza as definições e usos KJV abaixo para português brasileiro de forma teológica e precisa.
Mantenha a estrutura de numeração intacta se houver.
Responda APENAS com JSON válido (array), sem markdown.

Entrada:
${JSON.stringify(toTranslate)}

Formato de saída (array na mesma ordem):
[{"num":"H7225","def":"tradução da definição","kjv":"tradução dos usos"}]`;

    const response = await fetch("https://qsfwxrmqryffaudvnclw.supabase.co/functions/v1/ai-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI proxy error:", errText);
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";
    
    // Clean and parse
    const clean = text.replace(/```json|```/g, "").trim();
    let translations = [];
    try {
      translations = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", clean);
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message, translations: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
