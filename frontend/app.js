const IS_LOCAL = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const API_URL = IS_LOCAL ? "http://localhost:3000" : "https://todo-api-gjbh.onrender.com";

const listEl = document.getElementById("task-list");
const emptyStateEl = document.getElementById("empty-state");
const errorBannerEl = document.getElementById("error-banner");
const formEl = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const apiStatusEl = document.getElementById("api-status");
const apiUrlEl = document.getElementById("api-url");

apiUrlEl.textContent = API_URL;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showError(message) {
  errorBannerEl.textContent = message;
  errorBannerEl.hidden = false;
  setTimeout(() => {
    errorBannerEl.hidden = true;
  }, 6000);
}

async function api(path, options = {}) {
  const response = await fetch(API_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function loadTasks() {
  const tasks = await api("/api/tasks");
  renderTasks(tasks);
}

function createTaskItem(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " task-item--done" : "");

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "task-item__check";
  check.checked = task.completed;
  check.addEventListener("change", () => {
    api(`/api/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({ completed: check.checked }),
    })
      .then(() => loadTasks())
      .catch((error) => showError(error.message));
  });

  const body = document.createElement("div");
  body.className = "task-item__body";

  const title = document.createElement("div");
  title.className = "task-item__title";
  title.innerHTML = escapeHtml(task.title);

  const description = document.createElement("div");
  description.className = "task-item__description";
  description.innerHTML = escapeHtml(task.description || "");

  body.append(title, description);

  const actions = document.createElement("div");
  actions.className = "task-item__actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn--ghost";
  editBtn.textContent = "Editar";
  editBtn.addEventListener("click", () => startEdit(task, li, body));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn--danger";
  deleteBtn.textContent = "Eliminar";
  deleteBtn.addEventListener("click", async () => {
    if (!confirm(`¿Eliminar "${task.title}"?`)) return;
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      await loadTasks();
    } catch (error) {
      showError(error.message);
    }
  });

  actions.append(editBtn, deleteBtn);
  li.append(check, body, actions);
  return li;
}

function startEdit(task, li, body) {
  li.querySelector(".task-item__actions")?.remove();
  li.querySelector(".task-item__check")?.remove();

  const editTitle = document.createElement("input");
  editTitle.className = "task-item__edit";
  editTitle.maxLength = 200;
  editTitle.value = task.title;

  const editDescription = document.createElement("input");
  editDescription.className = "task-item__edit";
  editDescription.maxLength = 500;
  editDescription.value = task.description || "";
  editDescription.placeholder = "Descripción (opcional)";

  const actions = document.createElement("div");
  actions.className = "task-item__actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn--primary";
  saveBtn.textContent = "Guardar";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn--ghost";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.addEventListener("click", loadTasks);

  actions.append(saveBtn, cancelBtn);

  body.replaceChildren(editTitle, editDescription);
  li.append(actions);
  editTitle.focus();

  const save = () => {
    api(`/api/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: editTitle.value.trim() || null,
        description: editDescription.value.trim() || null,
      }),
    })
      .then(loadTasks)
      .catch((error) => showError(error.message));
  };

  saveBtn.addEventListener("click", save);
  editTitle.addEventListener("keydown", (event) => {
    if (event.key === "Enter") save();
    if (event.key === "Escape") loadTasks();
  });
}

function renderTasks(tasks) {
  listEl.replaceChildren(...tasks.map(createTaskItem));
  emptyStateEl.hidden = tasks.length > 0;
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  try {
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title,
        description: descriptionInput.value.trim() || null,
      }),
    });
    titleInput.value = "";
    descriptionInput.value = "";
    await loadTasks();
  } catch (error) {
    showError(error.message);
  }
});

async function checkStatus() {
  try {
    await api("/api/tasks");
    apiStatusEl.textContent = "API conectada";
    apiStatusEl.className = "badge badge--ok";
  } catch (error) {
    apiStatusEl.textContent = "API no disponible";
    apiStatusEl.className = "badge badge--error";
  }
}

checkStatus();
loadTasks().catch((error) => {
  apiStatusEl.textContent = "API no disponible";
  apiStatusEl.className = "badge badge--error";
  showError(error.message);
});