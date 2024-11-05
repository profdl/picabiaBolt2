const { createClient } = require('@supabase/supabase-js');

function logEnvironmentStatus() {
  var supabaseUrl = process.env.SUPABASE_URL;
  var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment Status:', {
    SUPABASE_URL: supabaseUrl ? supabaseUrl.substring(0, 8) + '...' : 'undefined',
    SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? 
      supabaseKey.substring(0, 3) + '...' + supabaseKey.substring(supabaseKey.length - 3) : 
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

var supabase = null;

exports.handler = function(event, context, callback) {
  console.log('Webhook received:', new Date().toISOString());
  
  if (!supabase) {
    try {
      supabase = initSupabase();
    } catch (err) {
      console.error('Failed to initialize Supabase:', err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to initialize database connection'
        })
      });
      return;
    }
  }

  if (!event.body) {
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'No webhook payload received'
      })
    });
    return;
  }

  var payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Invalid JSON payload'
      })
    });
    return;
  }

  var output = payload.output;
  var status = payload.status;
  var id = payload.id;

  console.log('Webhook data:', { status: status, hasOutput: !!output, id: id });

  if (!id) {
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'No prediction ID provided'
      })
    });
    return;
  }
  if (status === 'succeeded' && Array.isArray(output) && output.length > 0) {
    console.log('Processing prediction:', { id: id, imageUrl: output[0] });
    
    supabase
      .from('generated_images')
      .update({ 
        image_url: output[0],
        status: 'completed',
        replicate_id: id,
        updated_at: new Date().toISOString()
      })
      .eq('replicate_id', id)
      .select()
      .then((result) => {
        const { data, error } = result;
        
        if (error) {
          throw error;
        }
        
        console.log('Record updated:', { id: id, affectedRows: data ? data.length : 0 });
        
        callback(null, {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'Image record updated successfully',
            data: { id: id, status: 'completed' }
          })
        });
      })
      .catch((error) => {
        console.error('Database error:', error);
        callback(null, {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Database update failed'
          })
        });
      });
  }
  } else {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Webhook received but no update required',
        data: { id: id, status: status }
      })
    });
  }
};