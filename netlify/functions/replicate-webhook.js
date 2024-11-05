const { createClient } = require('@supabase/supabase-js');

// Log environment variables availability (but not their values)
console.log('Environment variables check:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

exports.handler = async function(event) {
  console.log('Webhook received:', event.body);
  
  const { output, status, id } = JSON.parse(event.body);
  console.log('Parsed webhook data - status:', status, 'output:', output, 'id:', id);
  
  if (status === 'succeeded' && output) {
    console.log('Processing successful prediction with output:', output);
    
    try {
      // Get the first generated image URL
      const imageUrl = output[0];
      console.log('Using image URL:', imageUrl);
      
      // Update the generated_images record with the output URL
      const { data, error } = await supabase
        .from('generated_images')
        .update({ 
          image_url: imageUrl,
          status: 'completed',
          replicate_id: id
        })
        .eq('replicate_id', id)
        .select();
        
      if (error) {
        console.error('Database update error:', error);
        throw error;
      }
      
      console.log('Successfully updated record:', data);
      
    } catch (err) {
      console.error('Error processing webhook:', err);
      throw err;
    }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
