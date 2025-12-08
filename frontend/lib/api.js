export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const headers = {
  "Content-Type": "application/json",
};

export async function submitIntake(payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/intake`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCase(intakeId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cases/${encodeURIComponent(intakeId)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function requestSharingPackage(payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/share`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Simple Server-Sent Events (SSE) stream for live updates
export function createEventStream(onEvent, onError) {
  const url = `${API_BASE_URL}/api/v1/events/stream`;
  const source = new EventSource(url);

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent && onEvent(data);
    } catch (err) {
      console.error("Failed to parse event", err);
    }
  };

  source.onerror = () => {
    onError && onError();
  };

  return source;
}
