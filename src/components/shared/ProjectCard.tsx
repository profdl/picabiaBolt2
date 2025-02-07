
import { useState, useEffect } from "react";
import { Edit2, Trash2, X, Check, Image as ImageIcon } from "lucide-react";
import { Project } from "../../types";
import { useThemeClass } from '../../styles/useThemeClass';

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
  isTemplate?: boolean;
}

export function ProjectCard({
  project,
  onOpen,
  onRename,
  onDelete,
  isTemplate = false,
}: ProjectCardProps) {
  const styles = {
    container: useThemeClass(['projectCard', 'container']),
    preview: {
      container: useThemeClass(['projectCard', 'preview', 'container']),
      placeholder: {
        icon: useThemeClass(['projectCard', 'preview', 'placeholder', 'icon']),
        text: useThemeClass(['projectCard', 'preview', 'placeholder', 'text'])
      }
    },
    content: {
      container: useThemeClass(['projectCard', 'content', 'container']),
      header: useThemeClass(['projectCard', 'content', 'header']),
      title: useThemeClass(['projectCard', 'content', 'title']),
      actions: useThemeClass(['projectCard', 'content', 'actions']),
      button: {
        edit: useThemeClass(['projectCard', 'content', 'button', 'edit']),
        delete: useThemeClass(['projectCard', 'content', 'button', 'delete'])
      },
      date: useThemeClass(['projectCard', 'content', 'date'])
    }
  };
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  useEffect(() => {
    if (project.thumbnail) {
      // Remove any data URL prefix if it exists
      const cleanUrl = project.thumbnail.startsWith("data:")
        ? project.thumbnail.split(",")[1]
        : project.thumbnail;
      setThumbnailUrl(cleanUrl);
    } else {
      setThumbnailUrl(null);
    }
  }, [project.thumbnail]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleRename = async () => {
    if (newName.trim() && newName !== project.name) {
      try {
        await onRename(newName);
      } catch (error) {
        console.error("Failed to rename project:", error);
      }
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this board? This action cannot be undone."
      )
    ) {
      setIsDeleting(true);
      try {
        await onDelete();
      } catch (error) {
        console.error("Failed to delete project:", error);
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className="cursor-pointer" onClick={isRenaming ? undefined : onOpen}>
        <div className={styles.preview.container}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-contain rounded-t-lg"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <ImageIcon className={styles.preview.placeholder.icon} />
              <span className={styles.preview.placeholder.text}>No preview available</span>
            </div>
          )}
        </div>
        <div className={styles.content.container}>
          <div className={styles.content.header}>
            {isRenaming ? (
              <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-neutral-700 dark:text-neutral-50 dark:border-neutral-600"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") {
                      setNewName(project.name);
                      setIsRenaming(false);
                    }
                  }}
                />
                <button
                  onClick={handleRename}
                  className="p-1 text-green-600 dark:text-green-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setNewName(project.name);
                    setIsRenaming(false);
                  }}
                  className="p-1 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
<h3 className={styles.content.title}>
  {project.name}
  {isTemplate && (
    <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-100">
      Template
    </span>
  )}
</h3>                <div className={styles.content.actions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRenaming(true);
                    }}
                    className={styles.content.button.edit}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className={styles.content.button.delete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
          <div className={styles.content.date}>
            <span>{formatDate(project.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};