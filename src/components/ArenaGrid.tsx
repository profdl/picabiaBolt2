import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ArrowLeft, Link as LinkIcon } from "lucide-react";
import { ArenaBlock } from "../types";

export interface ArenaChannel {
  id: number;
  title: string;
  length: number;
  slug: string;
  updated_at: string;
  user: {
    username: string;
  };
}

interface ArenaGridProps {
  results: {
    channels?: ArenaChannel[];
    blocks?: ArenaBlock[];
  };
  loading: boolean;
  onSelect: (block: ArenaBlock) => void;
  defaultChannelSlug?: string;
}

export const ArenaGrid: React.FC<ArenaGridProps> = ({
  results,
  loading,
  onSelect,
  defaultChannelSlug = "daniel-lefcourt/terraform",
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ArenaChannel | null>(
    null
  );
  const [channelContents, setChannelContents] = useState<ArenaBlock[]>([]);
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [blockConnections, setBlockConnections] = useState<ArenaChannel[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const channels = results?.channels || [];
  const blocks = results?.blocks || [];

  // Helper function to make authenticated API requests
  const fetchFromArena = async (endpoint: string) => {
    const response = await fetch(
      `/.netlify/functions/arena-search?endpoint=${encodeURIComponent(
        endpoint
      )}`
    );

    if (!response.ok) {
      throw new Error(`Arena API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const fetchChannelContents = useCallback(
    async (channel: ArenaChannel, newPage?: number) => {
      if (!channel?.id) {
        console.error("Invalid channel ID:", channel);
        return;
      }

      const pageToFetch = newPage || currentPage;

      if (pageToFetch === 1) {
        setLoadingChannel(true);
        setChannelContents([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await fetchFromArena(
          `/channels/${channel.id}/contents?page=${pageToFetch}&per=24`
        );

        if (!data?.contents) {
          throw new Error("Invalid response data");
        }

        const imageBlocks = data.contents.filter(
          (block: ArenaBlock) =>
            block?.image?.display?.url || block?.image?.original?.url
        );

        if (pageToFetch === 1) {
          setChannelContents(imageBlocks);
          setSelectedChannel(channel);
        } else {
          setChannelContents((prev) => [...prev, ...imageBlocks]);
        }

        setHasMore(data.contents.length === 24);
      } catch (error) {
        console.error("Error fetching channel contents:", error);
        if (pageToFetch === 1) {
          setChannelContents([]);
        }
        setHasMore(false);
      } finally {
        if (pageToFetch === 1) {
          setLoadingChannel(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [currentPage]
  );

  const fetchDefaultChannel = useCallback(async () => {
    if (!defaultChannelSlug) {
      console.error("No default channel slug provided");
      return;
    }

    setLoadingChannel(true);
    try {
      // Use the slug endpoint format
      const data = await fetchFromArena(`/channels/slug/${defaultChannelSlug}`);

      if (!data?.id) {
        throw new Error("Invalid channel data received");
      }

      const channelData: ArenaChannel = {
        id: data.id,
        title: data.title || "Untitled Channel",
        length: data.length || 0,
        slug: defaultChannelSlug,
        updated_at: data.updated_at || new Date().toISOString(),
        user: {
          username: data.user?.username || "unknown",
        },
      };

      await fetchChannelContents(channelData);
    } catch (error) {
      console.error("Error fetching default channel:", error);
      setChannelContents([]);
    } finally {
      setLoadingChannel(false);
    }
  }, [defaultChannelSlug, fetchChannelContents]);

  // Load default channel when component mounts and no search results exist
  useEffect(() => {
    if (
      channels.length === 0 &&
      blocks.length === 0 &&
      !loading &&
      defaultChannelSlug
    ) {
      fetchDefaultChannel();
    }
  }, [
    channels.length,
    blocks.length,
    loading,
    fetchDefaultChannel,
    defaultChannelSlug,
  ]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!selectedChannel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchChannelContents(selectedChannel, nextPage);
        }
      },
      { threshold: 0.5 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [
    selectedChannel,
    hasMore,
    loadingMore,
    currentPage,
    fetchChannelContents,
  ]);

  // Reset pagination when changing channels
  useEffect(() => {
    if (selectedChannel) {
      setCurrentPage(1);
      setHasMore(true);
    }
  }, [selectedChannel]);

  const fetchBlockConnections = async (blockId: number) => {
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
      return;
    }

    setLoadingConnections(true);
    setSelectedBlockId(blockId);
    try {
      const response = await fetch(
        `https://api.are.na/v2/blocks/${blockId}/channels`
      );
      const data = await response.json();
      setBlockConnections(data.channels || []);
    } catch (error) {
      console.error("Error fetching block connections:", error);
      setBlockConnections([]);
    }
    setLoadingConnections(false);
  };

  const renderBlock = (block: ArenaBlock) => (
    <div key={block.id} className="border-b border-gray-100 last:border-0 py-4">
      <div className="group cursor-pointer" onClick={() => onSelect(block)}>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <img
            src={block.image.display?.url || block.image.original?.url}
            alt={block.title || "Are.na block"}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="mt-3">
        {block.title && (
          <h3 className="text-sm font-medium text-gray-900">{block.title}</h3>
        )}
        {block.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {block.description}
          </p>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchBlockConnections(block.id);
          }}
          className="mt-2 flex items-center text-xs text-gray-500 hover:text-blue-600"
        >
          <LinkIcon className="w-3 h-3 mr-1" />
          <span>Show connections</span>
        </button>

        {selectedBlockId === block.id && (
          <div className="mt-2">
            {loadingConnections ? (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Connected to:
                </p>
                {blockConnections.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchChannelContents(channel);
                    }}
                    className="block text-xs text-gray-600 hover:text-blue-600 mb-1 last:mb-0"
                  >
                    {channel.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading || loadingChannel) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (selectedChannel) {
    return (
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={() => {
              setSelectedChannel(null);
              setCurrentPage(1);
              setHasMore(true);
            }}
            className="flex items-center text-sm text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to search
          </button>
          <h2 className="text-sm font-medium text-gray-900">
            {selectedChannel.title}
          </h2>
        </div>

        <div className="space-y-4">
          {channelContents.map(renderBlock)}

          {channelContents.length === 0 && !loadingChannel && (
            <p className="text-center py-8 text-gray-500">
              No images found in this channel
            </p>
          )}

          {/* Infinite scroll loader */}
          {(hasMore || loadingMore) && (
            <div ref={loaderRef} className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {channels.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-3">Channels</h2>
          <div className="space-y-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => fetchChannelContents(channel)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500"
              >
                <div className="text-sm font-medium text-gray-900">
                  {channel.title}
                </div>
                <div className="text-sm text-gray-500">
                  by {channel.user.username} • {channel.length} blocks
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {blocks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-3">Blocks</h2>
          <div className="space-y-4">{blocks.map(renderBlock)}</div>
        </div>
      )}

      {channels.length === 0 && blocks.length === 0 && !loading && (
        <p className="text-center py-8 text-gray-500">
          Search for channels and blocks
        </p>
      )}
    </div>
  );
};
