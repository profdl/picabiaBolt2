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

1. Clone the repository:

    git clone [repository-url]
    cd picabiaBolt2

2. Install dependencies:

    npm install

3. Set up environment variables:
   Create a `.env` file with the following variables:

    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Start the development server:

    npm run dev

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


## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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

## Common Development Tasks

1. Adding a new control type:
   - Add control type to ShapeControls
   - Update preprocessing workflow in preprocess-image
   - Add new fields to database tables
   - Update ImageShape to display new control

2. Modifying generation workflow:
   - Update workflow JSON in generationHandlerSlice
   - Modify generation parameters in generate-image
   - Update UI components to support new parameters

3. Debugging generation issues:
   - Check webhook logs in Netlify
   - Verify Supabase table updates
   - Monitor browser console for realtime updates