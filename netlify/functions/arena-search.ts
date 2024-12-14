import { Handler } from "@netlify/functions";

interface ArenaBlock {
  id: number;
  class: string;
  title?: string;
  image?: {
    display?: {
      url: string;
    };
    original?: {
      url: string;
    };
  };
}

interface ArenaChannel {
  id: number;
  title: string;
  length: number;
  slug: string;
  updated_at: string;
  user: {
    username: string;
  };
}

interface ArenaSearchResponse {
  blocks: ArenaBlock[];
  channels: ArenaChannel[];
}

const ARENA_API_KEY = process.env.ARENA_API_KEY;

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const query = event.queryStringParameters?.query;
    const endpoint = event.queryStringParameters?.endpoint;

    // If there's an endpoint parameter, proxy the request to Arena API
    if (endpoint) {
      const response = await fetch(`https://api.are.na/v2${endpoint}`, {
        headers: {
          Authorization: `Bearer ${ARENA_API_KEY}`,
        },
      });

      const data = await response.json();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data),
      };
    }

    // Handle search queries as before
    if (!query || query.length < 2) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ channels: [], blocks: [] }),
      };
    }

    const [channelsResponse, blocksResponse] = await Promise.all([
      fetch(
        `https://api.are.na/v2/search/channels?q=${encodeURIComponent(
          query
        )}&per=10`,
        {
          headers: {
            Authorization: `Bearer ${ARENA_API_KEY}`,
          },
        }
      ),
      fetch(
        `https://api.are.na/v2/search/blocks?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${ARENA_API_KEY}`,
          },
        }
      ),
    ]);

    const [channelsData, blocksData] = await Promise.all([
      channelsResponse.json() as Promise<ArenaSearchResponse>,
      blocksResponse.json() as Promise<ArenaSearchResponse>,
    ]);

    // Type guard function to validate block structure
    const isValidArenaBlock = (block: unknown): block is ArenaBlock => {
      return (
        typeof block === "object" &&
        block !== null &&
        typeof (block as ArenaBlock).id === "number" &&
        typeof (block as ArenaBlock).class === "string"
      );
    };

    // Filter and validate blocks
    const blocksWithImages = (blocksData.blocks || [])
      .filter(isValidArenaBlock)
      .filter(
        (block) =>
          block.class === "Image" ||
          (block.class === "Link" && block.image?.display?.url)
      );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        channels: Array.isArray(channelsData.channels)
          ? channelsData.channels
          : [],
        blocks: blocksWithImages,
      }),
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Arena API error:", errorMessage);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        channels: [],
        blocks: [],
      }),
    };
  }
};
