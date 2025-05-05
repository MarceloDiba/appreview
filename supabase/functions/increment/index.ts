
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Increment function started")

serve(async (req) => {
  // Get the x value, defaulting to 1 if not provided
  try {
    const { x = 1 } = await req.json();
    
    // Return the incremented value
    return new Response(
      JSON.stringify({ increment: x }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      },
    )
  } catch (error) {
    // Default to incrementing by 1 if there's an error parsing the JSON
    return new Response(
      JSON.stringify({ increment: 1 }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      },
    )
  }
})

// To invoke: POST to Supabase function URL with { "x": 3 }
