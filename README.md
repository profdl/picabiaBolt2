# PicabiaBolt2

An ethical AI image generation platform for artists and designers focused on remixing images using a variety of control methods.

## Features

- AI-powered image generation with multiple control types:
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

