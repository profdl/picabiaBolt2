const { createClient } = require('@supabase/supabase-js');

function logEnvironmentStatus() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment Status:', {
    SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 8)}...` : 'undefined',
    SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? 
      `${supabaseKey.substring(0, 3)}...${supabaseKey.substring(supabaseKey.length - 3)}` : 
      'undefined'
  });
}

function initSupabase() {
  logEnvironmentStatus();
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is undefined');
  }

  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let supabase = null;

exports.handler = async function(event) {
  console.log('Webhook received:', new Date().toISOString());
  
  try {
    if (!supabase) {
      supabase = initSupabase();
    }

    if (!event.body) {
      throw new Error('No webhook payload received');
    }

    const { output, status, id } = JSON.parse(event.body);
    console.log('Webhook data:', { status, hasOutput: !!output, id });

    if (!id) {
      throw new Error('No prediction ID provided');
    }

    if (status === 'succeeded' && Array.isArray(output) && output.length > 0) {
      console.log('Processing prediction:', { id, imageUrl: output[0] });
      
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
      
      console.log('Record updated:', { id, affectedRows: data?.length });
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Image record updated successfully',
          data: { id, status: 'completed' }
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Webhook received but no update required',
        data: { id, status }
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};