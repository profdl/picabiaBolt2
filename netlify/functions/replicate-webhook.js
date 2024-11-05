const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async function(event) {
    console.log('Webhook received:', event.body);
  
    const { output, status } = JSON.parse(event.body);
    console.log('Parsed webhook data - status:', status, 'output:', output);
  
    if (status === 'succeeded' && output) {
      console.log('Starting image processing for URL:', output[0]);
    
      const imageResponse = await fetch(output[0]);
      console.log('Image fetched from Replicate, status:', imageResponse.status);
    
      const imageBuffer = await imageResponse.arrayBuffer();
      console.log('Image converted to buffer, size:', imageBuffer.byteLength);
    
      const fileName = `generated-${Date.now()}.png`;
      console.log('Uploading to Supabase storage with filename:', fileName);
    
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png'
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      console.log('Successfully uploaded to storage:', uploadData);
    
      const { data, error } = await supabase
        .from('generated_images')
        .insert([{
          image_url: uploadData.path,
          prompt: JSON.parse(event.body).input.prompt
        }]);
      
      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      console.log('Successfully inserted record into database:', data);
    }
  
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
};