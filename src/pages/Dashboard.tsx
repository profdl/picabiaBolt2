import { Plus } from 'lucide-react';
import { useProjects } from '../hooks/project/useProjects';
import { ProjectCard } from '../components/shared/ProjectCard';
import { useNavigate } from 'react-router-dom';
import { useThemeClass } from '../styles/useThemeClass';
import { cn } from '../utils/cn';


export function Dashboard() {
  const { projects, createProject, updateProject, deleteProject, loading, error } = useProjects();
  const navigate = useNavigate();

  const styles = {
    page: useThemeClass(['dashboard', 'page']), 
    container: useThemeClass(['dashboard', 'container']),
    header: {
      container: useThemeClass(['dashboard', 'header', 'container']),
      button: useThemeClass(['dashboard', 'header', 'button'])
    },
    emptyState: {
      container: useThemeClass(['dashboard', 'emptyState', 'container']),
      title: useThemeClass(['dashboard', 'emptyState', 'title']),
      text: useThemeClass(['dashboard', 'emptyState', 'text'])
    },
    grid: useThemeClass(['dashboard', 'grid']),
    loading: {
      container: useThemeClass(['dashboard', 'loading', 'container']),
      spinner: useThemeClass(['dashboard', 'loading', 'spinner'])
    },
    error: {
      container: useThemeClass(['dashboard', 'error', 'container']),
      text: useThemeClass(['dashboard', 'error', 'text'])
    }
  };

  const handleCreateProject = async () => {
    const project = await createProject({
      name: 'Untitled Board',
      shapes: []
    });
    if (project) {
      navigate(`/board/${project.id}`);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}> {/* Update loading wrapper */}
        <div className={styles.loading.container}>
          <div className={styles.loading.spinner}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}> {/* Update error wrapper */}
        <div className={styles.error.container}>
          <div className={styles.error.text}>Failed to load projects</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}> {/* Add page wrapper */}
      <div className={styles.container}>
        <div className={styles.header.container}>
        <button onClick={handleCreateProject} className={cn(
  styles.header.button,
  "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[#0d99ff] hover:bg-[#0b87e3]"
)}>
  <Plus className="w-5 h-5 mr-2" />
  New Board
</button>
        </div>

        {projects.length === 0 ? (
          <div className={styles.emptyState.container}>
            <h3 className={styles.emptyState.title}>Loading template projects...</h3>
            <p className={styles.emptyState.text}>You'll see some template projects here in a moment</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isTemplate={project.is_template}
                onOpen={() => navigate(`/board/${project.id}`)}
                onRename={async (newName) => {
                  await updateProject(project.id, {
                    name: newName,
                    thumbnail: project.thumbnail
                  });
                }}
                onDelete={async () => {
                  await deleteProject(project.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}