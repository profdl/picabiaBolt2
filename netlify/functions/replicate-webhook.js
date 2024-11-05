const { createClient } = require('@supabase/supabase-js');

// Debug environment variables (safely)
const debugEnvVars = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment Debug:', {
    SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 8)}...` : 'undefined',
    SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? 
      `${supabaseKey.substring(0, 3)}...${supabaseKey.substring(supabaseKey.length - 3)}` : 
      'undefined',
    NODE_ENV: process.env.NODE_ENV,
    // Log all env var names (but not values) to see what's available
    availableEnvVars: Object.keys(process.env)
  });
};

// Initialize Supabase client with more explicit error handling
const initSupabase = () => {
  debugEnvVars();
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is undefined. ' +
      'Check: \n' +
      '1. Environment variable is set in Netlify\n' +
      '2. Function is in netlify/functions directory\n' +
      '3. Recent deployment includes environment variables'
    );
  }

  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

let supabase = null;

exports.handler = async function(event) {
  console.log('Webhook handler started:', new Date().toISOString());
  
  try {
    // Initialize Supabase with more detailed error reporting
    if (!supabase) {
      try {
        supabase = initSupabase();
      } catch (error) {
        console.error('Supabase initialization failed:', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
    // Validate webhook payload
    if (!event.body) {
      throw new Error('No webhook payload received');
    }

    const { output, status, id } = JSON.parse(event.body || '{}');
    console.log('Parsed webhook data:', { status, hasOutput: !!output, id });

    if (!id) {
      throw new Error('No prediction ID provided in webhook');
    }

    if (status === 'succeeded' && Array.isArray(output) && output.length > 0) {
      console.log('Processing successful prediction:', { id, firstOutputUrl: output[0] });
      
      const { data, error } = await supabase
        .from('generated_images')
        .update({ 
          image_url: output[0],
          status: 'completed',
          replicate_id: id,
          updated_at: new Date().toISOString()
        })
        .eq('replicate_id', id)
        .select();
        
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      console.log('Successfully updated record:', { id, affected_rows: data?.length });
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'Webhook received',
          debug: {
            hasSupabase: !!supabase,
            receivedId: id,
            status
          }
        })
      };
      
    } catch (error) {
      console.error('Webhook handler error:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false,
          error: error.message,
          errorType: error.constructor.name,
          timestamp: new Date().toISOString()
        })
      };
    }
  };
};