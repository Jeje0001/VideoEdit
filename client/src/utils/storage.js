export function saveProject(filename, name = null) {
  const existing = getProjects();
  const now = new Date().toISOString();

  const project = {
    filename,
    projectName: name || `Project ${existing.length + 1}`,
    createdAt: now,
    lastEdited: now,
  };

  const index = existing.findIndex(p => p.filename === filename);
  if (index !== -1) {
    existing[index] = { ...existing[index], ...project };
  } else {
    existing.push(project);
  }

  localStorage.setItem("projects", JSON.stringify(existing));
  localStorage.setItem("lastFilename", filename);
}

export function getProjects() {
  return JSON.parse(localStorage.getItem("projects") || "[]");
}

export function deleteProject(index) {
  const projects = getProjects();
  projects.splice(index, 1);
  localStorage.setItem("projects", JSON.stringify(projects));
}

export function renameProject(index, newName) {
  const projects = getProjects();
  if (!projects[index]) return;
  projects[index].projectName = newName;
  localStorage.setItem("projects", JSON.stringify(projects));
}
