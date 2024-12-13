// arena-search.ts
import { Handler } from "@netlify/functions";

const ARENA_API_KEY = process.env.ARENA_API_KEY;

interface ArenaBlock {
  id: number;
  class: string;
  image?: {
    display?: {
      url: string;
    };
  };
}

interface ArenaResponse {
  blocks: ArenaBlock[];
  channels: unknown[];
}
export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const query = event.queryStringParameters?.query;

    if (!query || query.length < 2) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ channels: [], blocks: [] }),
      };
    }

    // Make both requests in parallel
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
      channelsResponse.json() as Promise<ArenaResponse>,
      blocksResponse.json() as Promise<ArenaResponse>,
    ]);

    // Only return blocks that have images
    const blocksWithImages =
      blocksData.blocks?.filter(
        (block) =>
          block.class === "Image" ||
          (block.class === "Link" && block.image?.display?.url)
      ) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        channels: channelsData.channels || [],
        blocks: blocksWithImages,
      }),
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Arena API search error:", errorMessage);
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
