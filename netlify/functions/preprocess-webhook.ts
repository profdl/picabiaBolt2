import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const handler: Handler = async (event) => {
    console.log('Preprocess Webhook received:', new Date().toISOString());

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No webhook payload received'
                })
            };
        }

        const payload = JSON.parse(event.body);
        const { output, status, id } = payload;

        console.log('Webhook data:', { status, hasOutput: !!output, id });

        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No prediction ID provided'
                })
            };
        }

        // Update status immediately for failed or canceled states
        if (status === 'failed' || status === 'canceled') {
            const { error: statusError } = await supabase
                .from('preprocessed_images')
                .update({
                    status: status,
                    updated_at: new Date().toISOString(),
                })
                .eq('prediction_id', id);

            if (statusError) throw statusError;

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: { id, status }
                })
            };
        }

        if (status === 'succeeded' && Array.isArray(output) && output.length > 0) {
            try {
                // Fetch image from Replicate URL
                console.log('Fetching image from Replicate URL:', output[0]);
                const response = await fetch(output[0]);
                if (!response.ok) {
                    console.error('Failed to fetch image:', response.status, response.statusText);
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
                
                const imageBuffer = await response.arrayBuffer();
                const imageData = new Uint8Array(imageBuffer);
                console.log('Successfully fetched image, size:', imageBuffer.byteLength);

                // Get prediction record
                console.log('Fetching prediction record for ID:', id);
                const { data: prediction, error: predictionError } = await supabase
                    .from('preprocessed_images')
                    .select('*')
                    .eq('prediction_id', id)
                    .single();

                if (predictionError) {
                    console.error('Error fetching prediction:', predictionError);
                    throw predictionError;
                }

                if (!prediction) {
                    console.error('No prediction found for ID:', id);
                    throw new Error('No prediction found');
                }

                console.log('Found prediction:', {
                    id: prediction.id,
                    shapeId: prediction.shapeId,
                    processType: prediction.processType,
                    status: prediction.status
                });

                const filename = `${prediction.shapeId}-${prediction.processType}-${Date.now()}.png`;
                console.log('Uploading to Supabase storage with filename:', filename);

                // Upload to Supabase storage
                console.log('Attempting to upload to Supabase storage with:', {
                    bucket: 'preprocessed-images',
                    filename,
                    imageSize: imageData.length,
                    shapeId: prediction.shapeId,
                    processType: prediction.processType
                });

                const { error: uploadError } = await supabase
                    .storage
                    .from('preprocessed-images')
                    .upload(filename, imageData, {
                        contentType: 'image/png',
                        cacheControl: '3600'
                    });

                if (uploadError) {
                    console.error('Error uploading to Supabase storage:', {
                        error: uploadError,
                        message: uploadError.message
                    });
                    throw uploadError;
                }

                console.log('Successfully uploaded to Supabase storage');

                // Get public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from('preprocessed-images')
                    .getPublicUrl(filename);

                console.log('Got public URL:', publicUrl);

                // Update record with URL and completed status
                console.log('Updating preprocessed_images record with:', {
                    predictionId: id,
                    processType: prediction.processType,
                    publicUrl: publicUrl,
                    shapeId: prediction.shapeId
                });

                // Map process type to the correct column name
                const urlColumnMap = {
                    depth: 'depthUrl',
                    edge: 'edgeUrl',
                    pose: 'poseUrl'
                };

                const urlColumn = urlColumnMap[prediction.processType as keyof typeof urlColumnMap];
                if (!urlColumn) {
                    throw new Error(`Invalid process type: ${prediction.processType}`);
                }

                const updateData = {
                    [urlColumn]: publicUrl,
                    status: 'completed',
                    updated_at: new Date().toISOString()
                };
                console.log('Update data:', updateData);

                const { error: updateError } = await supabase
                    .from('preprocessed_images')
                    .update(updateData)
                    .eq('prediction_id', id);

                if (updateError) {
                    console.error('Error updating preprocessed_images:', updateError);
                    throw updateError;
                }

                console.log('Successfully completed all updates');
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        data: { 
                            id, 
                            status: 'completed', 
                            url: publicUrl,
                            processType: prediction.processType,
                            shapeId: prediction.shapeId
                        }
                    })
                };
            } catch (processingError) {
                console.error('Error processing image:', {
                    error: processingError,
                    message: processingError instanceof Error ? processingError.message : 'Unknown error',
                    stack: processingError instanceof Error ? processingError.stack : undefined
                });
                
                // Update record with error status
                try {
                    await supabase
                        .from('preprocessed_images')
                        .update({
                            status: 'error',
                            error_message: processingError instanceof Error ? processingError.message : 'Failed to process image',
                            updated_at: new Date().toISOString()
                        })
                        .eq('prediction_id', id);
                } catch (updateError) {
                    console.error('Failed to update error status:', updateError);
                }

                throw processingError;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: { id, status }
            })
        };

    } catch (error) {
        console.error('Error processing webhook:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        try {
            // Only attempt database update if we have an ID from the original payload
            const parsedBody = event.body ? JSON.parse(event.body) : null;
            if (parsedBody?.id) {
                await supabase
                    .from('preprocessed_images')
                    .update({
                        status: 'error',
                        error_message: errorMessage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('prediction_id', parsedBody.id);
            }
        } catch (dbError) {
            console.error('Failed to update error state in database:', dbError);
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: errorMessage
            })
        };
    }
};