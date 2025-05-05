
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Increment function started")

serve(async (req) => {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the x value, defaulting to 1 if not provided
    let incrementValue = 1;
    
    try {
      const { x } = await req.json();
      if (typeof x === 'number' && !isNaN(x)) {
        incrementValue = x;
      }
    } catch (e) {
      // If JSON parsing fails, use default value
    }
    
    // Return the incremented value
    return new Response(
      JSON.stringify({ increment: incrementValue }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
        status: 200 
      },
    )
  } catch (error) {
    console.error("Error in increment function:", error);
    
    // Default to incrementing by 1 if there's an error
    return new Response(
      JSON.stringify({ increment: 1 }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
        status: 200 
      },
    )
  }
})

// To invoke: POST to Supabase function URL with { "x": 3 }
