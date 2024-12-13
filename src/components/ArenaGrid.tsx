import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ArrowLeft, Link as LinkIcon } from "lucide-react";

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

interface ArenaBlock {
  id: number;
  title: string;
  description?: string;
  image: {
    display: {
      url: string;
    };
    original: {
      url: string;
    };
  };
  class: string;
  source?: {
    url: string;
  };
}

interface ArenaGridProps {
  results: {
    channels?: ArenaChannel[];
    blocks?: ArenaBlock[];
  };
  loading: boolean;
  onSelect: (block: ArenaBlock) => void;
}

export const ArenaGrid: React.FC<ArenaGridProps> = ({
  results,
  loading,
  onSelect,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ArenaChannel | null>(
    null
  );
  const [channelContents, setChannelContents] = useState<ArenaBlock[]>([]);
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [blockConnections, setBlockConnections] = useState<ArenaChannel[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const channels = results?.channels || [];
  const blocks = results?.blocks || [];

  const fetchChannelContents = useCallback(
    async (channel: ArenaChannel, newPage?: number) => {
      const pageToFetch = newPage || currentPage;

      if (pageToFetch === 1) {
        setLoadingChannel(true);
        setChannelContents([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetch(
          `https://api.are.na/v2/channels/${channel.slug}/contents?page=${pageToFetch}&per=24`
        );
        const data = await response.json();

        const imageBlocks = data.contents.filter(
          (block: ArenaBlock) =>
            block.image?.display?.url || block.image?.original?.url
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

  // Function to fetch default Terraform channel using the specific user/channel combination
  const fetchDefaultChannel = useCallback(async () => {
    setLoadingChannel(true);
    try {
      const response = await fetch(
        "https://api.are.na/v2/channels/daniel-lefcourt/terraform"
      );
      const channel = await response.json();

      if (channel) {
        const channelData: ArenaChannel = {
          id: channel.id,
          title: channel.title,
          length: channel.length,
          slug: "daniel-lefcourt/terraform",
          updated_at: channel.updated_at,
          user: {
            username: channel.user.username,
          },
        };
        await fetchChannelContents(channelData);
      }
    } catch (error) {
      console.error("Error fetching default channel:", error);
    } finally {
      setLoadingChannel(false);
    }
  }, [fetchChannelContents]);

  // Load default channel when component mounts and no search results exist
  useEffect(() => {
    if (channels.length === 0 && blocks.length === 0 && !loading) {
      fetchDefaultChannel();
    }
  }, [channels.length, blocks.length, loading, fetchDefaultChannel]);

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
