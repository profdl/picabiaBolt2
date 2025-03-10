testing a new branch

# PicabiaBolt2

An AI image generation whiteboard app for artists and designers. The app is focused on combining and remixing images using a variety of control methods.

## Features

- AI-powered image generation with multiple, simultaneous, control types:
  - Depth detection
  - Edge detection
  - Pose detection
  - Sketch-to-image conversion
  - Image remixing
- Project management (create, duplicate, rename, delete)
- Auto-saving functionality

## Tech Stack

- Frontend:
  - React
  - TypeScript
  - React Router
  - Vite
  - Vitest (for testing)

- Backend:
  - Supabase
    - Authentication
    - Database
    - Storage
    - Row Level Security (RLS)

- API:
  - Uses comfyUI json workflows set to Replicate.com
  - https://replicate.com/fofr/any-comfyui-workflow-a100

## Development Setup

1. Create a fork of the repository and clone it:

    git clone [your-fork-url]
    cd picabiaBolt2

2. Install dependencies:

    npm install

3. Get environment variables from project admin:
   You will need a `.env` file with the following:
   - Supabase configuration
   - Replicate API keys
   - Storage bucket info
   - Other API credentials

4. Set up local webhook testing:
   - Install ngrok: https://ngrok.com/
   - Start ngrok pointing to port 8888:

        ngrok http 8888

   - Copy the ngrok URL (e.g., https://1234-56-78-910.ngrok.io)
   - Add to your .env file:

        WEBHOOK_URL=your_ngrok_url

5. Start the development environment:
   - In one terminal window keep ngrok running
   - In another terminal, start Netlify dev:

        netlify dev
   
   The development server will run at http://localhost:8888. The ngrok URL is required for testing image generation locally since Replicate.com needs to be able to reach your webhook endpoints.

6. Create a new branch for your changes:

    git checkout -b feature/your-feature-name

7. Make your changes and test thoroughly. For image generation features, ensure webhook endpoints are working correctly through ngrok.

8. Submit a pull request against the main repository with a clear description of your changes.

## Project Structure

- `/src`
  - `/components` - React components including auth and UI elements
  - `/hooks` - Custom React hooks for various functionalities
  - `/lib` - Utility functions and Supabase client configuration
  - `/types` - TypeScript type definitions
  - `/store` - State management

## Database Schema

The application uses the following main tables:

- `projects` - Stores user projects with shapes and thumbnails
  - id (uuid, primary key)
  - created_at (timestamp)
  - updated_at (timestamp)
  - name (text)
  - user_id (uuid, foreign key to auth.users)
  - shapes (jsonb)
  - thumbnail (text)

- `generated_images` - Stores AI-generated images and their metadata
  - id (uuid, primary key)
  - user_id (uuid, foreign key to auth.users)
  - image_url (text)
  - prompt (text)
  - aspect_ratio (text)
  - created_at (timestamp)

- `assets` - Stores uploaded canvas images
  - url (text)
  - user_id (uuid, foreign key to auth.users)

Note: All tables implement Row Level Security (RLS) to ensure users can only access their own data.

## Testing

Run the test suite using:

    npm test

## Contact

Daniel Lefcourt
dlefcour@risd.edu
Professor, Art & Computation
The Rhode Island School of Design


+++++++++++++++++++

# PicabiaBolt2 Developer Documentation

## Image Generation Flow

### User Interaction & Generation Process

1. **Initial Trigger**
   - User clicks the Generate button in the Toolbar component
   - Generation is only enabled when there are active prompts (text or image controls)

2. **Shape Controls**
   - Users can add different control types to images:
     - Depth: Uses MiDaS to create depth maps
     - Edges: Uses Canny edge detection
     - Pose: Uses OpenPose for pose estimation 
     - Sketch: Uses original image as sketch reference
     - Remix: Uses image as inspiration

3. **Preprocessing Flow**
   When a control is enabled:
   1. Sets preprocessing state for that shape/control
   2. Calls `generatePreprocessedImage` function
   3. Makes request to `/preprocess-image` Netlify function
   4. Creates record in `preprocessed_images` table
   5. Webhook receives completion and updates image URLs

4. **Generation Flow** 
   When Generate is clicked:
   1. `handleGenerate` in generationHandlerSlice:
      - Collects all active controls and prompts
      - Creates workflow JSON combining controls
      - Makes request to `/generate-image` Netlify function
   2. Generation webhook:
      - Receives completed generation
      - Uploads result to Supabase storage
      - Updates `generated_images` table
   3. UI updates to show new image

### Key Components

- **ShapeControls**: Manages UI for image controls and preprocessing
  - Handles checkbox states for different control types
  - Shows strength sliders for each active control
  - Updates shape properties when controls change

- **ImageShape**: Displays image with active control overlays
  - Shows loading states during preprocessing
  - Manages subscriptions for preprocessing updates
  - Renders control visualization layers

### Database Schema

**preprocessed_images table:**
- prediction_id: Replicate prediction ID
- shapeId: ID of the shape being processed
- processType: Type of preprocessing (depth/edge/pose)
- status: processing/completed/error
- [processType]Url: URL of the processed image

**generated_images table:**
- prediction_id: Replicate prediction ID
- prompt: Text prompt used
- status: generating/completed/error
- generated_[01-04]: URLs of generated images
- Control-related fields for tracking used controls

### Webhooks

Two main webhook endpoints handle asynchronous processing:

1. **preprocess-webhook**: Handles preprocessing completions
   - Receives processed control images
   - Updates preprocessed_images table
   - Triggers UI updates via Supabase realtime

2. **replicate-webhook**: Handles generation completions
   - Receives final generated images
   - Updates generated_images table
   - Triggers UI updates via Supabase realtime

### State Management

The application uses multiple Zustand slices to manage state:

- **preProcessSlice**: Manages preprocessing states and settings
- **generationHandlerSlice**: Handles image generation workflow
- **shapeSlice**: Manages shapes and their properties

