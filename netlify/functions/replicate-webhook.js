const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
const validateEnvVars = () => {
  const required = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return required;
};

// Initialize Supabase client
let supabase = null;
const initSupabase = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnvVars();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

exports.handler = async function(event) {
  console.log('Webhook received at:', new Date().toISOString());
  
  try {
    // Initialize Supabase if not already initialized
    if (!supabase) {
      supabase = initSupabase();
    }

    // Validate webhook payload
    if (!event.body) {
      throw new Error('No webhook payload received');
    }

    const { output, status, id } = JSON.parse(event.body);
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
          message: 'Image record updated successfully',
          data: { id, status: 'completed' }
        })
      };
    } else {
      // Log non-success states for debugging
      console.log('Skipping update - invalid status or output:', { status, outputLength: output?.length });
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Webhook received but no update required',
          data: { id, status }
        })
      };
    }
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      })
    };
  }
};