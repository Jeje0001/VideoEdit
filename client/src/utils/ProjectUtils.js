export const saveProjectToLocalStorage = (input) => {
  const projects = JSON.parse(localStorage.getItem("projects") || "[]");

  let filename;
  let projectName;
  let createdAt;

  if (typeof input === "string") {
    filename = input;
    projectName = `Project ${projects.length + 1}`;
    createdAt = new Date().toISOString();
  } else {
    filename = input.filename;
    projectName = input.projectName;
    createdAt = input.createdAt;
  }

  // Check if project already exists
  const existing = projects.find(p => p.filename === filename);

  if (existing) {
    existing.projectName = projectName;
    existing.createdAt = createdAt;
  } else {
    const newProject = {
      filename,
      projectName,
      createdAt
    };
    projects.push(newProject);
  }

  localStorage.setItem("projects", JSON.stringify(projects));
};
