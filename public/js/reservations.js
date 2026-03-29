import {
  requireAuthOrBlockPage,
  initAuthUI,
  logout,
  getTokenPayload
} from "./auth-ui.js";

window.logout = logout;

document.addEventListener("DOMContentLoaded", () => {
  //initAuthUI();

  const allowed = requireAuthOrBlockPage();
  if (!allowed) return;

  const form = document.getElementById("reservationForm");
  const messageBox = document.getElementById("message");
  const reservationList = document.getElementById("reservationList");

  const reservationIdInput = document.getElementById("reservationId");
  const resourceIdInput = document.getElementById("resourceId");
  const userIdInput = document.getElementById("userId");
  const startTimeInput = document.getElementById("startTime");
  const endTimeInput = document.getElementById("endTime");
  const noteInput = document.getElementById("note");
  const statusInput = document.getElementById("status");

  const updateBtn = document.getElementById("updateBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const clearBtn = document.getElementById("clearBtn");

  const tokenPayload = getTokenPayload();

  if (!form || !messageBox || !reservationList) return;

  if (tokenPayload?.id) {
    userIdInput.value = tokenPayload.id;
  }

  function showMessage(type, text) {
    const styles = {
      success: "border-brand-green/30 bg-brand-green/10 text-brand-green",
      error: "border-brand-rose/30 bg-brand-rose/10 text-brand-rose",
      info: "border-brand-blue/30 bg-brand-blue/10 text-brand-blue",
    };

    messageBox.className = `mt-6 mb-4 rounded-2xl border px-4 py-3 text-sm ${styles[type] || styles.info}`;
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
  }

  function clearMessage() {
    messageBox.className = "hidden mt-6 rounded-2xl border px-4 py-3 text-sm";
    messageBox.textContent = "";
  }

  function toDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatReservationDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function getFormData() {
    return {
      resourceId: Number(resourceIdInput.value),
      userId: Number(userIdInput.value),
      startTime: new Date(startTimeInput.value).toISOString(),
      endTime: new Date(endTimeInput.value).toISOString(),
      note: noteInput.value.trim(),
      status: statusInput.value
    };
  }

  function validateForm() {
    if (!resourceIdInput.value || !userIdInput.value || !startTimeInput.value || !endTimeInput.value) {
      showMessage("error", "Please fill in all required fields.");
      return false;
    }

    const start = new Date(startTimeInput.value);
    const end = new Date(endTimeInput.value);

    if (end <= start) {
      showMessage("error", "End time must be after start time.");
      return false;
    }

    return true;
  }

  function fillForm(item) {
    reservationIdInput.value = item.id ?? "";
    resourceIdInput.value = item.resource_id ?? "";
    userIdInput.value = item.user_id ?? "";
    startTimeInput.value = toDateTimeLocal(item.start_time);
    endTimeInput.value = toDateTimeLocal(item.end_time);
    noteInput.value = item.note ?? "";
    statusInput.value = item.status ?? "active";
  }

  function resetForm() {
    form.reset();
    reservationIdInput.value = "";
    if (tokenPayload?.id) {
      userIdInput.value = tokenPayload.id;
    }
    statusInput.value = "active";
  }

  function renderReservationList(items) {
    reservationList.innerHTML = "";

    if (!items.length) {
      reservationList.innerHTML = `
        <div class="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm text-black/60">
          No reservations found yet.
        </div>
      `;
      return;
    }

    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-left hover:bg-black/5 transition-all duration-200 ease-out";
      button.innerHTML = `
        <div class="text-sm font-semibold text-brand-dark">
          #${item.id} • ${item.resource_name || `Resource ${item.resource_id}`} • User ${item.user_id}
        </div>
        <div class="mt-1 text-xs text-black/60">
          ${formatReservationDate(item.start_time)} - ${formatReservationDate(item.end_time)}
        </div>
        <div class="mt-2 text-xs text-black/70">
          Status: ${item.status}
        </div>
      `;
      button.addEventListener("click", () => fillForm(item));
      reservationList.appendChild(button);
    });
  }

  async function loadReservations() {
    try {
      const response = await fetch("/api/reservations");
      const body = await response.json();

      if (!response.ok) {
        showMessage("error", body?.error || "Failed to load reservations.");
        return;
      }

      renderReservationList(body.data || []);
    } catch (error) {
      console.error(error);
      showMessage("error", "Unable to load reservations.");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!validateForm()) return;

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(getFormData())
      });

      const body = await response.json();

      if (!response.ok) {
        showMessage("error", body?.error || "Failed to create reservation.");
        return;
      }

      resetForm();
      showMessage("success", "Reservation created successfully.");
      await loadReservations();
    } catch (error) {
      console.error(error);
      showMessage("error", "Unable to create reservation.");
    }
  });

  updateBtn.addEventListener("click", async () => {
    clearMessage();

    const reservationId = reservationIdInput.value;
    if (!reservationId) {
      showMessage("error", "Select a reservation from the list first.");
      return;
    }

    if (!validateForm()) return;

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(getFormData())
      });

      const body = await response.json();

      if (!response.ok) {
        showMessage("error", body?.error || "Failed to update reservation.");
        return;
      }

      showMessage("success", "Reservation updated successfully.");
      await loadReservations();
    } catch (error) {
      console.error(error);
      showMessage("error", "Unable to update reservation.");
    }
  });

  deleteBtn.addEventListener("click", async () => {
    clearMessage();

    const reservationId = reservationIdInput.value;
    if (!reservationId) {
      showMessage("error", "Select a reservation from the list first.");
      return;
    }

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: "DELETE"
      });

      if (!response.ok && response.status !== 204) {
        let body = {};
        try {
          body = await response.json();
        } catch {}
        showMessage("error", body?.error || "Failed to delete reservation.");
        return;
      }

      resetForm();
      showMessage("success", "Reservation deleted successfully.");
      await loadReservations();
    } catch (error) {
      console.error(error);
      showMessage("error", "Unable to delete reservation.");
    }
  });

  clearBtn.addEventListener("click", () => {
    resetForm();
    clearMessage();
  });

  loadReservations();
});